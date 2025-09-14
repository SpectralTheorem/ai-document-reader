import Anthropic from '@anthropic-ai/sdk';
import { ResearchAgent, ResearchQuery, BookContext, AgentResult, AgentConfig } from './types';
import { generateId } from '@/lib/utils';
import { getDefaultModel } from '@/lib/config';

export abstract class BaseAgent implements ResearchAgent {
  protected anthropic: Anthropic;
  protected config: AgentConfig;

  abstract name: string;
  abstract description: string;

  constructor(anthropic: Anthropic, config: Partial<AgentConfig> = {}) {
    this.anthropic = anthropic;
    this.config = {
      maxTokens: 4000,
      temperature: 0.1,
      enableThinking: true,
      ...config
    };
  }

  abstract execute(query: ResearchQuery, context: BookContext): Promise<AgentResult>;

  protected async callClaude(
    systemPrompt: string,
    userPrompt: string,
    enableThinking: boolean = true
  ): Promise<string> {
    const startTime = Date.now();

    try {
      const response = await this.anthropic.messages.create({
        model: getDefaultModel('anthropic'),
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: enableThinking ?
            `<thinking>
Let me think about this query step by step and plan my research approach.
</thinking>

${userPrompt}` : userPrompt
        }]
      });

      const executionTime = Date.now() - startTime;

      if (response.content[0].type === 'text') {
        return response.content[0].text;
      }

      throw new Error('Unexpected response format from Claude');
    } catch (error) {
      console.error(`Error in ${this.name}:`, error);
      throw new Error(`Agent ${this.name} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  protected createAgentResult(
    queryId: string,
    findings: string[],
    confidence: number,
    sources: any[] = [],
    executionTime: number,
    relatedQueries?: string[]
  ): AgentResult {
    return {
      agentName: this.name,
      queryId,
      findings,
      confidence,
      sources,
      relatedQueries,
      executionTime
    };
  }

  protected parseBookContent(context: BookContext): string {
    const { document } = context;

    // Create a comprehensive text representation of the book
    let content = `Book: "${document.metadata.title}"`;
    if (document.metadata.author) {
      content += ` by ${document.metadata.author}`;
    }
    content += '\n\n';

    const addSectionsRecursively = (sections: any[], level: number = 0) => {
      sections.forEach(section => {
        const indent = '  '.repeat(level);
        content += `${indent}## ${section.title}\n`;
        if (section.content) {
          content += `${section.content}\n\n`;
        }
        if (section.children) {
          addSectionsRecursively(section.children, level + 1);
        }
      });
    };

    addSectionsRecursively(document.sections);
    return content;
  }

  protected extractSourceReferences(
    findings: string,
    context: BookContext,
    maxSources: number = 5
  ): any[] {
    // Simple implementation - in a real system this would be more sophisticated
    const sources = [];
    const { document } = context;

    // Flatten all sections for easier searching
    const allSections: any[] = [];
    const flattenSections = (sections: any[]) => {
      sections.forEach(section => {
        allSections.push(section);
        if (section.children) {
          flattenSections(section.children);
        }
      });
    };
    flattenSections(document.sections);

    // Find sections mentioned in findings
    allSections.forEach(section => {
      if (findings.toLowerCase().includes(section.title.toLowerCase()) ||
          (section.content && findings.includes(section.content.substring(0, 100)))) {
        sources.push({
          sectionId: section.id,
          sectionTitle: section.title,
          excerpt: section.content ? section.content.substring(0, 200) + '...' : '',
          relevanceScore: 0.8
        });
      }
    });

    return sources.slice(0, maxSources);
  }
}