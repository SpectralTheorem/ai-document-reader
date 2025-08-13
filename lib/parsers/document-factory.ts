import { ParsedDocument, DocumentType } from '@/types/document';
import { EPUBParser } from './epub-parser';

export class DocumentFactory {
  static async parseDocument(buffer: Buffer, type: DocumentType): Promise<ParsedDocument> {
    switch (type) {
      case 'epub':
        const epubParser = new EPUBParser();
        return await epubParser.parseFromBuffer(buffer);
      case 'pdf':
        throw new Error('PDF support coming soon');
      default:
        throw new Error(`Unsupported document type: ${type}`);
    }
  }

  static getDocumentType(filename: string): DocumentType | null {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'epub':
        return 'epub';
      case 'pdf':
        return 'pdf';
      default:
        return null;
    }
  }
}