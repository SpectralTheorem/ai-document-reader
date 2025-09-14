import Anthropic from '@anthropic-ai/sdk';
import { BaseAgent } from './BaseAgent';
import { ResearchQuery, BookContext, AgentResult, CrossReference } from './types';

export class AnalysisAgent extends BaseAgent {
  name = 'AnalysisAgent';
  description = 'Specialized agent for cross-referencing, pattern analysis, and synthesis of connections between different parts of the book';

  async execute(query: ResearchQuery, context: BookContext): Promise<AgentResult> {
    const startTime = Date.now();

    const systemPrompt = `You are an expert research analyst specialized in finding connections, patterns, and relationships within a book. Your expertise includes:

1. Cross-referencing different sections to find related themes
2. Identifying how arguments develop across chapters
3. Finding contradictions or tensions in the author's positions
4. Mapping conceptual relationships and dependencies
5. Analyzing the logical flow of ideas throughout the book

Your analysis should be:
- Precise: Point to specific sections and passages
- Contextual: Consider how ideas build upon each other
- Critical: Note any inconsistencies or gaps in reasoning
- Synthetic: Show how different parts connect to form larger patterns

Format your response as:
MAIN_PATTERNS:
1. [Pattern description] - appears in [sections/chapters]
   Key insight: [What this pattern reveals]

CROSS_REFERENCES:
1. Section "[Title A]" relates to Section "[Title B]"
   Relationship: [supports/contradicts/elaborates/builds_upon]
   Connection: [Specific description of how they relate]

ARGUMENT_DEVELOPMENT:
- [How key arguments or themes develop across the book]

TENSIONS_OR_CONTRADICTIONS:
- [Any apparent contradictions or unresolved tensions]

SYNTHESIS:
[Your overall analysis of how the pieces fit together]

CONFIDENCE: [0.0-1.0]`;

    const bookContent = this.parseBookContent(context);

    const userPrompt = `Please analyze the patterns, connections, and relationships relevant to this query: "${query.text}"

Book Content:
${bookContent}

Focus on finding how different sections relate to each other, how arguments develop, and what larger patterns emerge from the content.`;

    try {
      const response = await this.callClaude(systemPrompt, userPrompt, true);

      const findings = this.parseAnalysisFindings(response);
      const confidence = this.extractConfidence(response);
      const sources = this.extractSourceReferences(response, context);

      const executionTime = Date.now() - startTime;

      return this.createAgentResult(
        query.id,
        findings,
        confidence,
        sources,
        executionTime
      );
    } catch (error) {
      console.error('AnalysisAgent execution failed:', error);
      throw error;
    }
  }

  private parseAnalysisFindings(response: string): string[] {
    const findings: string[] = [];

    const sections = {
      patterns: this.extractSection(response, 'MAIN_PATTERNS'),
      crossRefs: this.extractSection(response, 'CROSS_REFERENCES'),
      development: this.extractSection(response, 'ARGUMENT_DEVELOPMENT'),
      tensions: this.extractSection(response, 'TENSIONS_OR_CONTRADICTIONS'),
      synthesis: this.extractSection(response, 'SYNTHESIS')
    };

    if (sections.patterns) findings.push(`Patterns: ${sections.patterns}`);
    if (sections.crossRefs) findings.push(`Cross-References: ${sections.crossRefs}`);
    if (sections.development) findings.push(`Argument Development: ${sections.development}`);
    if (sections.tensions) findings.push(`Tensions: ${sections.tensions}`);
    if (sections.synthesis) findings.push(`Synthesis: ${sections.synthesis}`);

    return findings.length > 0 ? findings : [response];
  }

  private extractSection(response: string, sectionName: string): string | null {
    const regex = new RegExp(`${sectionName}:(.*?)(?=[A-Z_]+:|CONFIDENCE:|$)`, 's');
    const match = response.match(regex);
    return match ? match[1].trim() : null;
  }

  private extractConfidence(response: string): number {
    const confidenceMatch = response.match(/CONFIDENCE:\s*([0-9]*\.?[0-9]+)/);
    if (confidenceMatch) {
      return Math.min(1.0, Math.max(0.0, parseFloat(confidenceMatch[1])));
    }
    return 0.7;
  }

  // Specialized method for finding cross-references between specific topics
  async findCrossReferences(
    primaryTopic: string,
    context: BookContext,
    maxReferences: number = 10
  ): Promise<CrossReference[]> {
    const systemPrompt = `You are a cross-reference analyst. Find sections in the book that relate to the topic: "${primaryTopic}"

Return results in this JSON format:
{
  "crossReferences": [
    {
      "fromSection": "Section A Title",
      "toSection": "Section B Title",
      "relationship": "supports",
      "description": "How these sections connect",
      "confidence": 0.85
    }
  ]
}

Relationship types: supports, contradicts, elaborates, related, builds_upon`;

    const bookContent = this.parseBookContent(context);
    const userPrompt = `Find cross-references for topic: "${primaryTopic}"

Book Content:
${bookContent}

Find up to ${maxReferences} most relevant cross-references.`;

    try {
      const response = await this.callClaude(systemPrompt, userPrompt, false);

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.crossReferences || [];
      }

      return [];
    } catch (error) {
      console.error('Cross-reference analysis failed:', error);
      return [];
    }
  }

  // Method for analyzing how a specific argument develops across the book
  async analyzeArgumentDevelopment(
    argument: string,
    context: BookContext
  ): Promise<string> {
    const systemPrompt = `You are analyzing how a specific argument or theme develops throughout a book.

Focus on:
1. Where the argument first appears
2. How it's developed and supported in different chapters
3. Key turning points or elaborations
4. How it connects to other themes
5. The final position or conclusion

Provide a narrative analysis of the argument's development.`;

    const bookContent = this.parseBookContent(context);
    const userPrompt = `Analyze how this argument develops: "${argument}"

Book Content:
${bookContent}

Trace the development from introduction through conclusion.`;

    try {
      const response = await this.callClaude(systemPrompt, userPrompt, true);
      return response;
    } catch (error) {
      console.error('Argument development analysis failed:', error);
      return `Failed to analyze argument development: ${error}`;
    }
  }
}