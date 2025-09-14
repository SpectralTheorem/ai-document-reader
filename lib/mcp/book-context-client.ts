import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface BookContextTool {
  name: string;
  description: string;
  inputSchema: any;
}

export interface BookSearchResult {
  content: string;
  relevance: number;
  sectionTitle: string;
}

export interface BookStructure {
  title: string;
  sections: Array<{
    title: string;
    id: string;
    level: number;
    hasContent: boolean;
  }>;
}

export interface KeyTerm {
  term: string;
  frequency: number;
}

export class BookContextClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private isConnected = false;

  constructor() {}

  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      // For browser environment, we'll use a different approach
      // Since MCP typically runs in Node.js, we'll create a bridge API
      this.isConnected = true;
    } catch (error) {
      console.error('Failed to connect to MCP server:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) return;

    try {
      if (this.transport) {
        await this.transport.close();
      }
      this.isConnected = false;
    } catch (error) {
      console.error('Failed to disconnect from MCP server:', error);
    }
  }

  async setCurrentBook(bookId: string): Promise<string> {
    return this.callTool('set_current_book', { bookId });
  }

  async searchBookContent(query: string, limit: number = 5): Promise<string> {
    return this.callTool('search_book_content', { query, limit });
  }

  async getChapterContext(sectionId: string, includeAdjacent: boolean = true): Promise<string> {
    return this.callTool('get_chapter_context', { sectionId, includeAdjacent });
  }

  async getBookStructure(includeContent: boolean = false): Promise<string> {
    return this.callTool('get_book_structure', { includeContent });
  }

  async findCrossReferences(topic: string, currentSectionId?: string): Promise<string> {
    return this.callTool('find_cross_references', { topic, currentSectionId });
  }

  async getKeyTerms(sectionId?: string, limit: number = 10): Promise<string> {
    return this.callTool('get_key_terms', { sectionId, limit });
  }

  async findSupportingEvidence(claim: string, evidenceType: string = 'all'): Promise<string> {
    return this.callTool('find_supporting_evidence', { claim, evidenceType });
  }

  private async callTool(toolName: string, args: any): Promise<string> {
    // Since we're in a browser environment, we'll make API calls to our Next.js backend
    // which will handle the MCP server communication
    try {
      const response = await fetch('/api/book-context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: toolName,
          arguments: args,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.content || result.error || 'No response received';
    } catch (error) {
      console.error(`Error calling tool ${toolName}:`, error);
      throw error;
    }
  }

  isReady(): boolean {
    return this.isConnected;
  }
}

// Singleton instance for global use
export const bookContextClient = new BookContextClient();