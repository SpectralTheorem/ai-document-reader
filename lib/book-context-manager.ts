import { libraryStorage } from '@/lib/library-storage';
import { ParsedDocument, Section } from '@/types/document';

export class BookContextManager {
  private currentBookId: string | null = null;
  private currentDocument: ParsedDocument | null = null;

  async setCurrentBook(bookId: string): Promise<string> {
    try {
      this.currentBookId = bookId;
      this.currentDocument = await libraryStorage.getDocument(bookId);

      if (!this.currentDocument) {
        throw new Error(`Book with ID ${bookId} not found`);
      }

      return `Successfully set current book context to "${this.currentDocument.metadata.title}" by ${this.currentDocument.metadata.author || 'Unknown Author'}`;
    } catch (error) {
      throw new Error(`Failed to set current book: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async searchBookContent(query: string, limit: number = 5): Promise<string> {
    if (!this.currentDocument) {
      throw new Error('No book context set. Use setCurrentBook first.');
    }

    const results = this.searchSections(this.currentDocument.sections, query, limit);

    if (results.length === 0) {
      return `No results found for "${query}" in the current book.`;
    }

    return `Found ${results.length} results for "${query}":\n\n${results.map((result, index) =>
      `${index + 1}. **${result.title}** (Relevance: ${result.relevance.toFixed(2)})\n   ${result.content.substring(0, 200)}${result.content.length > 200 ? '...' : ''}`
    ).join('\n\n')}`;
  }

  async getChapterContext(sectionId: string, includeAdjacent: boolean = true): Promise<string> {
    if (!this.currentDocument) {
      throw new Error('No book context set. Use setCurrentBook first.');
    }

    const allSections = this.flattenSections(this.currentDocument.sections);
    const currentIndex = allSections.findIndex(section => section.id === sectionId);

    if (currentIndex === -1) {
      throw new Error(`Section with ID ${sectionId} not found`);
    }

    const contextSections = [];
    const currentSection = allSections[currentIndex];

    // Add current section
    contextSections.push({ ...currentSection, contextType: 'current' });

    if (includeAdjacent) {
      // Add previous section
      if (currentIndex > 0) {
        contextSections.push({ ...allSections[currentIndex - 1], contextType: 'previous' });
      }

      // Add next section
      if (currentIndex < allSections.length - 1) {
        contextSections.push({ ...allSections[currentIndex + 1], contextType: 'next' });
      }
    }

    const contextText = contextSections.map(section =>
      `**${section.contextType.toUpperCase()}: ${section.title}**\n${section.content?.substring(0, 1000)}${section.content && section.content.length > 1000 ? '...' : ''}`
    ).join('\n\n---\n\n');

    return contextText;
  }

  async getBookStructure(includeContent: boolean = false): Promise<string> {
    if (!this.currentDocument) {
      throw new Error('No book context set. Use setCurrentBook first.');
    }

    const structureText = this.buildStructureText(this.currentDocument.sections, 0, includeContent);

    return `**Book Structure: ${this.currentDocument.metadata.title}**\n\n${structureText}`;
  }

  async findCrossReferences(topic: string, currentSectionId?: string): Promise<string> {
    if (!this.currentDocument) {
      throw new Error('No book context set. Use setCurrentBook first.');
    }

    const results = this.searchSections(this.currentDocument.sections, topic, 10)
      .filter(result => result.id !== currentSectionId);

    const crossRefText = results.length > 0
      ? results.map((result, index) =>
          `${index + 1}. **${result.title}** (Relevance: ${result.relevance.toFixed(2)})\n   Context: ${result.content.substring(0, 300)}${result.content.length > 300 ? '...' : ''}`
        ).join('\n\n')
      : `No cross-references found for "${topic}"`;

    return `**Cross-references for "${topic}"**:\n\n${crossRefText}`;
  }

  async getKeyTerms(sectionId?: string, limit: number = 10): Promise<string> {
    if (!this.currentDocument) {
      throw new Error('No book context set. Use setCurrentBook first.');
    }

    let content = '';

    if (sectionId) {
      const section = this.findSectionById(this.currentDocument.sections, sectionId);
      if (!section) {
        throw new Error(`Section with ID ${sectionId} not found`);
      }
      content = section.content || '';
    } else {
      content = this.getAllContent(this.currentDocument.sections);
    }

    const keyTerms = this.extractKeyTerms(content, limit);

    const keyTermsText = keyTerms.map((term, index) =>
      `${index + 1}. **${term.term}** (Frequency: ${term.frequency})`
    ).join('\n');

    return `**Key Terms**${sectionId ? ` for section` : ' from entire book'}:\n\n${keyTermsText}`;
  }

  async findSupportingEvidence(claim: string, evidenceType: string = 'all'): Promise<string> {
    if (!this.currentDocument) {
      throw new Error('No book context set. Use setCurrentBook first.');
    }

    // Search for content that might contain supporting evidence
    const results = this.searchSections(this.currentDocument.sections, claim, 10);

    // Filter results based on evidence type patterns
    const evidencePatterns = {
      examples: /for example|such as|for instance|consider|e\.g\.|including/i,
      statistics: /\d+%|\d+\.\d+%|study|research|data|statistics?|found that|showed that/i,
      quotes: /"|'|said|according to|states that|argues that/i,
      case_studies: /case study|case|example|instance|situation|scenario/i,
      all: /.*/,
    };

    const pattern = evidencePatterns[evidenceType as keyof typeof evidencePatterns] || evidencePatterns.all;
    const filteredResults = results.filter(result => pattern.test(result.content));

    const evidenceText = filteredResults.length > 0
      ? filteredResults.map((result, index) =>
          `${index + 1}. **${result.title}** (Type: ${evidenceType})\n   ${result.content.substring(0, 400)}${result.content.length > 400 ? '...' : ''}`
        ).join('\n\n')
      : `No ${evidenceType} evidence found for "${claim}"`;

    return `**Supporting Evidence for "${claim}" (Type: ${evidenceType})**:\n\n${evidenceText}`;
  }

  // Helper methods
  private searchSections(sections: Section[], query: string, limit: number): Array<Section & { relevance: number }> {
    const results: Array<Section & { relevance: number }> = [];
    const queryLower = query.toLowerCase();

    const searchInSection = (section: Section) => {
      if (section.content) {
        const contentLower = section.content.toLowerCase();
        const titleLower = section.title.toLowerCase();

        // Simple relevance scoring
        const titleMatches = (titleLower.match(new RegExp(queryLower, 'g')) || []).length;
        const contentMatches = (contentLower.match(new RegExp(queryLower, 'g')) || []).length;
        const relevance = (titleMatches * 2) + (contentMatches * 0.5);

        if (relevance > 0) {
          results.push({ ...section, relevance });
        }
      }

      if (section.children) {
        section.children.forEach(searchInSection);
      }
    };

    sections.forEach(searchInSection);

    // Sort by relevance and limit results
    return results
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);
  }

  private flattenSections(sections: Section[]): Section[] {
    const flattened: Section[] = [];

    const flatten = (section: Section) => {
      flattened.push(section);
      if (section.children) {
        section.children.forEach(flatten);
      }
    };

    sections.forEach(flatten);
    return flattened;
  }

  private buildStructureText(sections: Section[], depth: number, includeContent: boolean): string {
    return sections.map(section => {
      const indent = '  '.repeat(depth);
      const contentPreview = includeContent && section.content
        ? `\n${indent}  Preview: ${section.content.substring(0, 100)}${section.content.length > 100 ? '...' : ''}`
        : '';

      const childrenText = section.children
        ? '\n' + this.buildStructureText(section.children, depth + 1, includeContent)
        : '';

      return `${indent}- ${section.title}${contentPreview}${childrenText}`;
    }).join('\n');
  }

  private findSectionById(sections: Section[], id: string): Section | null {
    for (const section of sections) {
      if (section.id === id) {
        return section;
      }
      if (section.children) {
        const found = this.findSectionById(section.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  private getAllContent(sections: Section[]): string {
    let content = '';

    const extractContent = (section: Section) => {
      if (section.content) {
        content += section.content + ' ';
      }
      if (section.children) {
        section.children.forEach(extractContent);
      }
    };

    sections.forEach(extractContent);
    return content;
  }

  private extractKeyTerms(content: string, limit: number): Array<{ term: string; frequency: number }> {
    // Simple term extraction (can be enhanced with NLP)
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);

    const frequency: Record<string, number> = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    // Filter common words and sort by frequency
    const commonWords = new Set(['this', 'that', 'with', 'have', 'will', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time', 'very', 'when', 'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over', 'such', 'take', 'than', 'them', 'well', 'were']);

    return Object.entries(frequency)
      .filter(([word]) => !commonWords.has(word))
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([term, frequency]) => ({ term, frequency }));
  }

  isReady(): boolean {
    return this.currentDocument !== null;
  }

  getCurrentBookTitle(): string | null {
    return this.currentDocument?.metadata.title || null;
  }
}

// Singleton instance for global use
export const bookContextManager = new BookContextManager();