import Anthropic from '@anthropic-ai/sdk';
import { BaseAgent } from './BaseAgent';
import { ResearchQuery, BookContext, AgentResult, SearchResult } from './types';

export class BookSearchAgent extends BaseAgent {
  name = 'BookSearchAgent';
  description = 'Specialized agent for semantic content discovery and passage retrieval across the entire book';

  async execute(query: ResearchQuery, context: BookContext): Promise<AgentResult> {
    const startTime = Date.now();

    const systemPrompt = `You are an expert research assistant specialized in finding relevant passages and content within a book. Your task is to:

1. Analyze the user's query to understand what information they're seeking
2. Search through the provided book content to find the most relevant sections
3. Rank findings by relevance and importance
4. Extract key passages that directly address the query
5. Identify any related concepts or themes that might also be valuable

You should be thorough but focused - aim to find the 3-5 most relevant sections that best address the query.

Format your response as:
FINDINGS:
1. [Section title] - [Brief description of relevance]
   Key passage: "[Most relevant excerpt]"

2. [Section title] - [Brief description of relevance]
   Key passage: "[Most relevant excerpt]"

RELATED_CONCEPTS:
- [Any related themes or concepts that came up during search]

CONFIDENCE: [Your confidence level from 0.0 to 1.0 in the completeness of these findings]`;

    const bookContent = this.parseBookContent(context);

    const userPrompt = `Please search through this book content to find information relevant to the query: "${query.text}"

Book Content:
${bookContent}

Query Type: ${query.type}
Focus on finding the most relevant sections that directly address this query.`;

    try {
      const response = await this.callClaude(systemPrompt, userPrompt, true);

      // Parse the response to extract structured findings
      const findings = this.parseSearchFindings(response);
      const confidence = this.extractConfidence(response);
      const sources = this.extractSourceReferences(response, context);

      const executionTime = Date.now() - startTime;

      return this.createAgentResult(
        query.id,
        findings,
        confidence,
        sources,
        executionTime,
        this.extractRelatedQueries(response)
      );
    } catch (error) {
      console.error('BookSearchAgent execution failed:', error);
      throw error;
    }
  }

  private parseSearchFindings(response: string): string[] {
    const findings: string[] = [];

    // Extract findings section
    const findingsMatch = response.match(/FINDINGS:(.*?)(?=RELATED_CONCEPTS:|CONFIDENCE:|$)/s);
    if (findingsMatch) {
      const findingsText = findingsMatch[1];

      // Split by numbered items (1., 2., 3., etc.)
      const items = findingsText.split(/\d+\.\s/).filter(item => item.trim());

      items.forEach(item => {
        if (item.trim()) {
          findings.push(item.trim());
        }
      });
    }

    return findings.length > 0 ? findings : [response];
  }

  private extractConfidence(response: string): number {
    const confidenceMatch = response.match(/CONFIDENCE:\s*([0-9]*\.?[0-9]+)/);
    if (confidenceMatch) {
      return Math.min(1.0, Math.max(0.0, parseFloat(confidenceMatch[1])));
    }
    return 0.7; // Default confidence
  }

  private extractRelatedQueries(response: string): string[] {
    const relatedMatch = response.match(/RELATED_CONCEPTS:(.*?)(?=CONFIDENCE:|$)/s);
    if (relatedMatch) {
      const relatedText = relatedMatch[1];
      return relatedText
        .split('-')
        .map(item => item.trim())
        .filter(item => item.length > 0)
        .slice(0, 3); // Limit to 3 related concepts
    }
    return [];
  }

  // Helper method for direct semantic search (can be used by other agents)
  async searchContent(
    searchTerm: string,
    context: BookContext,
    maxResults: number = 5
  ): Promise<SearchResult[]> {
    const systemPrompt = `You are a semantic search engine for book content. Given a search term, find the most relevant sections and passages.

Return your results in this exact JSON format:
{
  "results": [
    {
      "sectionTitle": "Chapter/Section Title",
      "relevance": 0.95,
      "matchType": "content",
      "excerpt": "Most relevant passage from this section..."
    }
  ]
}`;

    const bookContent = this.parseBookContent(context);
    const userPrompt = `Search for content related to: "${searchTerm}"

Book Content:
${bookContent}

Return the ${maxResults} most relevant sections.`;

    try {
      const response = await this.callClaude(systemPrompt, userPrompt, false);

      // Parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.results || [];
      }

      return [];
    } catch (error) {
      console.error('Content search failed:', error);
      return [];
    }
  }
}