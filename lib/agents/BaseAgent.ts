import Anthropic from '@anthropic-ai/sdk';
import { ResearchAgent, ResearchQuery, BookContext, AgentResult, AgentConfig } from './types';
import { generateId } from '@/lib/utils';
import { getDefaultModel } from '@/lib/config';
import { debugEmitter, AgentDebugInfo } from './debug-types';
import { DebugSettings } from '@/types/debug-settings';

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
    enableThinking: boolean = true,
    sessionId?: string,
    agentId?: string
  ): Promise<string> {
    const startTime = Date.now();

    try {
      const model = getDefaultModel('anthropic');

      // Emit debug event for API call start
      if (sessionId && agentId) {
        debugEmitter.emit({
          type: 'agent_progress',
          timestamp: startTime,
          sessionId,
          data: {
            agentId,
            stage: 'api_call_start',
            model,
            systemPrompt,
            userPrompt
          }
        });
      }

      const response = await this.anthropic.messages.create({
        model,
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
        const result = response.content[0].text;

        // Emit debug event for API call completion
        if (sessionId && agentId) {
          debugEmitter.emit({
            type: 'agent_progress',
            timestamp: Date.now(),
            sessionId,
            data: {
              agentId,
              stage: 'api_call_complete',
              duration: executionTime,
              rawOutput: result,
              tokenUsage: {
                input: response.usage?.input_tokens || 0,
                output: response.usage?.output_tokens || 0,
                total: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
              }
            }
          });
        }

        return result;
      }

      throw new Error('Unexpected response format from Claude');
    } catch (error) {
      console.error(`Error in ${this.name}:`, error);

      // Emit debug event for error
      if (sessionId && agentId) {
        debugEmitter.emit({
          type: 'agent_failed',
          timestamp: Date.now(),
          sessionId,
          data: {
            agentId,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }

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
    // Get settings from context
    const settings = context.debugSettings;
    // Determine token limit from settings or use default
    const maxTokens = settings?.tokenLimitPerAgent || 100000;
    const maxSections = settings?.maxSections || 20;

    console.log(`📋 ${this.name} parsing book content with settings:`, {
      hasSettings: !!settings,
      maxTokens,
      maxSections,
      enabledAgents: settings?.enabledAgents
    });
    const { document } = context;

    // Create a comprehensive text representation of the book
    // Handle both metadata structure and direct properties
    const title = document.metadata?.title || document.title || 'Unknown Title';
    const author = document.metadata?.author || document.author || 'Unknown Author';

    let content = `Book: "${title}"`;
    if (author !== 'Unknown Author') {
      content += ` by ${author}`;
    }
    content += '\n\n';

    let estimatedTokens = Math.ceil(content.length / 4); // Rough estimate: 4 chars per token
    let processedSections = 0;

    const addSectionsRecursively = (sections: any[], level: number = 0) => {
      for (const section of sections) {
        // Check section limit first
        if (processedSections >= maxSections) {
          const indent = '  '.repeat(level);
          content += `${indent}[... Additional sections truncated (${maxSections} section limit) ...]\n\n`;
          return;
        }

        const indent = '  '.repeat(level);
        const sectionHeader = `${indent}## ${section.title}\n`;
        const sectionContent = section.content ? `${section.content}\n\n` : '';

        const sectionTokens = Math.ceil((sectionHeader.length + sectionContent.length) / 4);

        // If adding this section would exceed our token limit, stop
        if (estimatedTokens + sectionTokens > maxTokens) {
          content += `${indent}[... Additional content truncated to stay within token limits (${Math.round(maxTokens/1000)}k tokens) ...]\n\n`;
          return;
        }

        content += sectionHeader;
        if (section.content) {
          content += sectionContent;
        }
        estimatedTokens += sectionTokens;
        processedSections++;

        if (section.children) {
          addSectionsRecursively(section.children, level + 1);
        }
      }
    };

    if (document.sections) {
      addSectionsRecursively(document.sections);
    }

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