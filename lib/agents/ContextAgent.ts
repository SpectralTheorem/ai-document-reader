import Anthropic from '@anthropic-ai/sdk';
import { BaseAgent } from './BaseAgent';
import { ResearchQuery, BookContext, AgentResult, ContextualInsight } from './types';

export class ContextAgent extends BaseAgent {
  name = 'ContextAgent';
  description = 'Specialized agent for understanding book structure, chapter relationships, and thematic organization';

  async execute(query: ResearchQuery, context: BookContext): Promise<AgentResult> {
    const startTime = Date.now();

    const systemPrompt = `You are an expert in understanding book structure and contextual relationships. Your expertise includes:

1. Analyzing the overall organization and flow of the book
2. Understanding how chapters relate to the main thesis
3. Identifying the author's strategic placement of information
4. Recognizing thematic arcs and narrative development
5. Understanding prerequisite knowledge and conceptual dependencies

When analyzing context, consider:
- Why does this information appear in this chapter/section?
- What came before that sets this up?
- What comes after that builds on this?
- How does this fit into the author's overall argument?
- What would be lost if this section were moved or removed?

Format your response as:
STRUCTURAL_ANALYSIS:
- [How the relevant sections fit into the book's overall structure]

CHAPTER_RELATIONSHIPS:
1. Chapter/Section "[Title]"
   Role: [Its function in the overall argument]
   Prerequisites: [What the reader needs to know beforehand]
   Sets up: [What this prepares the reader for later]

THEMATIC_POSITIONING:
- [How the query topic fits into the book's main themes]

CONTEXTUAL_SIGNIFICANCE:
- [Why this information matters in the broader context of the book]

NAVIGATIONAL_INSIGHTS:
- [Guidance on where readers should look for related information]

CONFIDENCE: [0.0-1.0]`;

    const bookContent = this.parseBookContent(context);

    const userPrompt = `Please analyze the structural and contextual aspects relevant to this query: "${query.text}"

Book Content:
${bookContent}

Focus on understanding how the relevant content fits into the book's overall structure and purpose.`;

    try {
      const response = await this.callClaude(systemPrompt, userPrompt, true);

      const findings = this.parseContextFindings(response);
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
      console.error('ContextAgent execution failed:', error);
      throw error;
    }
  }

  private parseContextFindings(response: string): string[] {
    const findings: string[] = [];

    const sections = {
      structural: this.extractSection(response, 'STRUCTURAL_ANALYSIS'),
      relationships: this.extractSection(response, 'CHAPTER_RELATIONSHIPS'),
      thematic: this.extractSection(response, 'THEMATIC_POSITIONING'),
      significance: this.extractSection(response, 'CONTEXTUAL_SIGNIFICANCE'),
      navigation: this.extractSection(response, 'NAVIGATIONAL_INSIGHTS')
    };

    if (sections.structural) findings.push(`Structure: ${sections.structural}`);
    if (sections.relationships) findings.push(`Chapter Relationships: ${sections.relationships}`);
    if (sections.thematic) findings.push(`Thematic Position: ${sections.thematic}`);
    if (sections.significance) findings.push(`Significance: ${sections.significance}`);
    if (sections.navigation) findings.push(`Navigation: ${sections.navigation}`);

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

  // Method for getting contextual overview of the entire book
  async getBookOverview(context: BookContext): Promise<ContextualInsight> {
    const systemPrompt = `Provide a structural overview of this book in JSON format:

{
  "theme": "Main theme or thesis",
  "sections": ["List of major sections/parts"],
  "development": "How the argument develops",
  "significance": "Why this book matters"
}`;

    const bookContent = this.parseBookContent(context);
    const userPrompt = `Analyze the overall structure and themes of this book:

${bookContent}`;

    try {
      const response = await this.callClaude(systemPrompt, userPrompt, false);

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed as ContextualInsight;
      }

      return {
        theme: 'Could not determine theme',
        sections: [],
        development: 'Could not analyze development',
        significance: 'Could not determine significance'
      };
    } catch (error) {
      console.error('Book overview analysis failed:', error);
      return {
        theme: 'Analysis failed',
        sections: [],
        development: 'Analysis failed',
        significance: 'Analysis failed'
      };
    }
  }

  // Method for understanding chapter progression and prerequisites
  async analyzeChapterFlow(
    targetSectionId: string,
    context: BookContext
  ): Promise<string> {
    const systemPrompt = `Analyze the flow of information leading to and from a specific chapter/section.

Consider:
1. What prior chapters set up this section?
2. What concepts or information does the reader need beforehand?
3. How does this section advance the overall argument?
4. What later sections build on this foundation?

Provide a clear analysis of the informational flow.`;

    const bookContent = this.parseBookContent(context);
    const userPrompt = `Analyze the chapter flow for section ID: ${targetSectionId}

Book Content:
${bookContent}

Focus on prerequisites and what this section enables later.`;

    try {
      const response = await this.callClaude(systemPrompt, userPrompt, true);
      return response;
    } catch (error) {
      console.error('Chapter flow analysis failed:', error);
      return `Failed to analyze chapter flow: ${error}`;
    }
  }
}