export type DocumentType = 'epub' | 'pdf';

export interface DocumentMetadata {
  title: string;
  author?: string;
  publisher?: string;
  language?: string;
  identifier?: string;
  description?: string;
  coverImage?: string;
}

export interface Section {
  id: string;
  title: string;
  content?: string;
  htmlContent?: string; // Raw HTML content for better formatting
  href?: string;
  level?: number;
  pageRange?: { start: number; end: number };
  children?: Section[];
}

export interface ParsedDocument {
  type: DocumentType;
  metadata: DocumentMetadata;
  sections: Section[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  sectionId?: string;
  isError?: boolean;
}

export interface AIProvider {
  id: string;
  name: string;
  type: 'local' | 'api';
  models?: string[];
}

export interface AIAction {
  id: string;
  name: string;
  description: string;
  prompt: string;
  icon?: string;
}