import JSZip from 'jszip';
import { parseString as parseXML } from 'xml2js';
import { load } from 'cheerio';
import { ParsedDocument, Section, DocumentMetadata } from '@/types/document';

interface OPFManifest {
  item: Array<{
    $: {
      id: string;
      href: string;
      'media-type': string;
    };
  }>;
}

interface OPFSpine {
  itemref: Array<{
    $: {
      idref: string;
    };
  }>;
}

interface OPFPackage {
  metadata: Array<{
    'dc:title': string[];
    'dc:creator': string[];
    'dc:description': string[];
    'dc:language': string[];
    'dc:identifier': string[];
  }>;
  manifest: OPFManifest[];
  spine: OPFSpine[];
}

interface TOCEntry {
  $: {
    id?: string;
    playOrder: string;
  };
  navLabel: Array<{
    text: string[];
  }>;
  content: Array<{
    $: {
      src: string;
    };
  }>;
  navPoint?: TOCEntry[];
}

export class EPUBParser {
  async parseFromBuffer(buffer: Buffer): Promise<ParsedDocument> {
    try {
      const zip = await JSZip.loadAsync(buffer);
      
      // Read container.xml to find the OPF file
      const containerXml = await zip.file('META-INF/container.xml')?.async('text');
      if (!containerXml) {
        throw new Error('Invalid EPUB: Missing container.xml');
      }

      const containerData = await this.parseXML(containerXml);
      const opfPath = containerData.container.rootfiles[0].rootfile[0].$['full-path'];
      
      // Read the OPF file
      const opfXml = await zip.file(opfPath)?.async('text');
      if (!opfXml) {
        throw new Error('Invalid EPUB: Missing OPF file');
      }

      const opfData = await this.parseXML(opfXml);
      const packageData = opfData.package as OPFPackage;

      // Extract metadata
      const metadata = this.extractMetadata(packageData);

      // Extract table of contents
      const basePath = opfPath.substring(0, opfPath.lastIndexOf('/') + 1);
      let sections: Section[] = [];

      try {
        // Try to read NCX file for better TOC
        const ncxPath = this.findNCXPath(packageData, basePath);
        if (ncxPath) {
          const ncxXml = await zip.file(ncxPath)?.async('text');
          if (ncxXml) {
            sections = await this.extractSectionsFromNCX(ncxXml, zip, basePath);
          }
        }
      } catch (error) {
        console.warn('Could not parse NCX file, falling back to spine order');
      }

      // Fallback: Use spine order if NCX parsing failed
      if (sections.length === 0) {
        sections = await this.extractSectionsFromSpine(packageData, zip, basePath);
      }

      // Clean sections to ensure no XML artifacts
      const cleanedSections = sections.map(section => ({
        id: String(section.id || ''),
        title: String(section.title || 'Untitled'),
        content: String(section.content || ''),
        htmlContent: String(section.htmlContent || ''),
        href: section.href ? String(section.href) : undefined,
        level: typeof section.level === 'number' ? section.level : 0,
      }));

      console.log('Parsed EPUB sections:', cleanedSections.length);

      return {
        type: 'epub' as const,
        metadata,
        sections: cleanedSections,
      };
    } catch (error) {
      console.error('Error parsing EPUB:', error);
      throw new Error('Failed to parse EPUB file: ' + (error as Error).message);
    }
  }

  private async parseXML(xmlString: string): Promise<any> {
    return new Promise((resolve, reject) => {
      parseXML(xmlString, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  private extractMetadata(packageData: OPFPackage): DocumentMetadata {
    const meta = packageData.metadata[0];
    
    // Helper function to extract string from potentially complex XML objects
    const extractString = (value: any): string | undefined => {
      if (typeof value === 'string') return value;
      if (Array.isArray(value)) return extractString(value[0]);
      if (value && typeof value === 'object') {
        // Handle XML parser objects that might have _ property for text content
        if (value._ && typeof value._ === 'string') return value._;
        if (value.$ && typeof value.$ === 'string') return value.$;
        return String(value);
      }
      return undefined;
    };
    
    return {
      title: extractString(meta['dc:title']?.[0]) || 'Unknown Title',
      author: extractString(meta['dc:creator']?.[0]) || undefined,
      description: extractString(meta['dc:description']?.[0]) || undefined,
      language: extractString(meta['dc:language']?.[0]) || undefined,
      identifier: extractString(meta['dc:identifier']?.[0]) || undefined,
    };
  }

  private findNCXPath(packageData: OPFPackage, basePath: string): string | null {
    const ncxItem = packageData.manifest[0].item.find(
      item => item.$['media-type'] === 'application/x-dtbncx+xml'
    );
    return ncxItem ? basePath + ncxItem.$.href : null;
  }

  private async extractSectionsFromNCX(ncxXml: string, zip: JSZip, basePath: string): Promise<Section[]> {
    const ncxData = await this.parseXML(ncxXml);
    const navMap = ncxData.ncx.navMap[0];
    const sections: Section[] = [];

    const processNavPoint = async (navPoint: TOCEntry, level: number = 0): Promise<void> => {
      // Safely extract title and href
      const rawTitle = navPoint.navLabel?.[0]?.text?.[0];
      const title = typeof rawTitle === 'string' ? rawTitle : `Chapter ${sections.length + 1}`;
      const href = navPoint.content?.[0]?.$.src || '';
      const id = navPoint.$.id || `section-${sections.length}`;
      
      // Extract content from the referenced file
      const contentData = await this.extractContentFromFile(zip, basePath + href);
      
      sections.push({
        id: String(id),
        title: String(title),
        content: String(contentData.text),
        htmlContent: String(contentData.html),
        href: String(href),
        level,
      });

      // Process nested nav points
      if (navPoint.navPoint) {
        for (const childNavPoint of navPoint.navPoint) {
          await processNavPoint(childNavPoint, level + 1);
        }
      }
    };

    if (navMap.navPoint) {
      for (const navPoint of navMap.navPoint) {
        await processNavPoint(navPoint);
      }
    }

    return sections;
  }

  private async extractSectionsFromSpine(packageData: OPFPackage, zip: JSZip, basePath: string): Promise<Section[]> {
    const spine = packageData.spine[0];
    const manifest = packageData.manifest[0];
    const sections: Section[] = [];

    for (let i = 0; i < spine.itemref.length; i++) {
      const itemRef = spine.itemref[i];
      const manifestItem = manifest.item.find(item => item.$.id === itemRef.$.idref);
      
      if (manifestItem && manifestItem.$['media-type'] === 'application/xhtml+xml') {
        const href = manifestItem.$.href;
        const contentData = await this.extractContentFromFile(zip, basePath + href);
        
        // Try to extract a meaningful title
        let title = await this.extractTitleFromFile(zip, basePath + href);
        if (!title || title.length > 100) {
          // Fallback to generic chapter name if title is missing or too long
          title = `Chapter ${i + 1}`;
        }
        
        sections.push({
          id: manifestItem.$.id,
          title,
          content: contentData.text,
          htmlContent: contentData.html,
          href,
          level: 0,
        });
      }
    }

    return sections;
  }

  private async extractContentFromFile(zip: JSZip, filePath: string): Promise<{text: string, html: string}> {
    try {
      const fileContent = await zip.file(filePath)?.async('text');
      if (!fileContent) return {text: '', html: ''};

      // Use cheerio to process HTML content
      const $ = load(fileContent);
      
      // Remove script and style elements but preserve everything else
      $('script, style').remove();
      
      // Get the cleaned HTML content
      const htmlContent = $('body').html() || $.html();
      
      // Also generate text version for AI processing
      const textContent = this.convertHtmlToFormattedText($);
      
      return {
        text: textContent,
        html: htmlContent
      };
    } catch (error) {
      console.error(`Error extracting content from ${filePath}:`, error);
      return {text: '', html: ''};
    }
  }

  private convertHtmlToFormattedText($: any): string {
    // Function to recursively process elements
    const processElement = (element: any): string => {
      const $el = $(element);
      const tagName = element.tagName?.toLowerCase();
      
      // Handle different HTML elements with appropriate formatting
      switch (tagName) {
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          return `\n\n# ${$el.text().trim()}\n\n`;
        
        case 'p':
          const pText = $el.text().trim();
          return pText ? `${pText}\n\n` : '';
        
        case 'br':
          return '\n';
        
        case 'div':
          // Treat divs as paragraph-like blocks
          const divText = $el.text().trim();
          return divText ? `${divText}\n\n` : '';
        
        case 'blockquote':
          const quoteText = $el.text().trim();
          return quoteText ? `\n> ${quoteText}\n\n` : '';
        
        case 'em':
        case 'i':
          return `*${$el.text().trim()}*`;
        
        case 'strong':
        case 'b':
          return `**${$el.text().trim()}**`;
        
        case 'ul':
        case 'ol':
          let listText = '\n';
          $el.find('li').each((i: number, li: any) => {
            const liText = $(li).text().trim();
            const prefix = tagName === 'ul' ? '• ' : `${i + 1}. `;
            listText += `${prefix}${liText}\n`;
          });
          return `${listText}\n`;
        
        case 'hr':
          return '\n---\n\n';
        
        default:
          // For other elements, just return the text with proper spacing
          return $el.text();
      }
    };

    // Start with body or the entire document
    const bodyElement = $('body').length > 0 ? $('body') : $.root();
    
    let result = '';
    bodyElement.contents().each((i: number, element: any) => {
      if (element.type === 'text') {
        // Handle text nodes
        const text = $(element).text().trim();
        if (text) {
          result += text + ' ';
        }
      } else if (element.type === 'tag') {
        // Handle element nodes
        result += processElement(element);
      }
    });

    // Clean up the result
    return result
      .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
      .replace(/[ \t]+/g, ' ') // Multiple spaces to single space
      .trim();
  }

  private async extractTitleFromFile(zip: JSZip, filePath: string): Promise<string | null> {
    try {
      const fileContent = await zip.file(filePath)?.async('text');
      if (!fileContent) return null;

      const $ = load(fileContent);
      
      // Look for title in various places
      let title = $('title').first().text().trim();
      
      if (!title) {
        // Try h1, h2, h3 tags
        title = $('h1, h2, h3').first().text().trim();
      }
      
      if (!title) {
        // Try elements with common chapter class names
        title = $('.chapter-title, .chapter-head, .title').first().text().trim();
      }
      
      return title || null;
    } catch (error) {
      return null;
    }
  }
}