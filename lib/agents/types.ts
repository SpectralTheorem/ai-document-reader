import { ParsedDocument, Section } from '@/types/document';

// Core types for the multi-agent research system
export interface BookContext {
  bookId: string;
  document: ParsedDocument;
  currentSectionId?: string;
}

export interface ResearchQuery {
  id: string;
  text: string;
  type: QueryType;
  priority: number;
}

export enum QueryType {
  FACTUAL = 'factual',        // "What does the author say about X?"
  ANALYTICAL = 'analytical',   // "How does the author's argument develop?"
  COMPARATIVE = 'comparative', // "How do chapters 3 and 7 relate?"
  EVALUATIVE = 'evaluative'   // "Is the author's claim well-supported?"
}

export interface AgentResult {
  agentName: string;
  queryId: string;
  findings: string[];
  confidence: number;
  sources: SourceReference[];
  relatedQueries?: string[];
  executionTime: number;
}

export interface SourceReference {
  sectionId: string;
  sectionTitle: string;
  excerpt: string;
  relevanceScore: number;
  pageRange?: { start: number; end: number };
}

export interface ResearchResponse {
  synthesis: string;
  agentResults: AgentResult[];
  totalExecutionTime: number;
  confidence: number;
  sources: SourceReference[];
}

export interface AgentConfig {
  maxTokens: number;
  temperature: number;
  enableThinking: boolean;
}

// Base interface all research agents must implement
export interface ResearchAgent {
  name: string;
  description: string;
  execute(query: ResearchQuery, context: BookContext): Promise<AgentResult>;
}

// Search result types
export interface SearchResult {
  section: Section;
  relevance: number;
  matchType: 'title' | 'content' | 'both';
  excerpts: string[];
}

export interface EvidenceResult {
  claim: string;
  supportingEvidence: SourceReference[];
  contradictingEvidence: SourceReference[];
  evidenceTypes: ('example' | 'statistic' | 'quote' | 'case_study')[];
  strength: 'strong' | 'moderate' | 'weak';
}

export interface CrossReference {
  fromSection: string;
  toSection: string;
  relationship: 'supports' | 'contradicts' | 'elaborates' | 'related';
  description: string;
  confidence: number;
}

export interface ContextualInsight {
  theme: string;
  sections: string[];
  development: string;
  significance: string;
}