import Anthropic from '@anthropic-ai/sdk';
import { getDefaultModel } from '@/lib/config';
import { BookSearchAgent } from './BookSearchAgent';
import { EvidenceAgent } from './EvidenceAgent';
import { AnalysisAgent } from './AnalysisAgent';
import { ContextAgent } from './ContextAgent';
import {
  ResearchQuery,
  BookContext,
  ResearchResponse,
  QueryType,
  AgentResult
} from './types';
import { generateId } from '@/lib/utils';

export class BookResearchOrchestrator {
  private anthropic: Anthropic;
  private searchAgent: BookSearchAgent;
  private evidenceAgent: EvidenceAgent;
  private analysisAgent: AnalysisAgent;
  private contextAgent: ContextAgent;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });

    // Initialize all specialized agents
    this.searchAgent = new BookSearchAgent(this.anthropic);
    this.evidenceAgent = new EvidenceAgent(this.anthropic);
    this.analysisAgent = new AnalysisAgent(this.anthropic);
    this.contextAgent = new ContextAgent(this.anthropic);
  }

  async conductResearch(
    userQuery: string,
    context: BookContext
  ): Promise<ResearchResponse> {
    const startTime = Date.now();

    try {
      // Step 1: Analyze the query to determine approach
      const researchQuery = await this.analyzeQuery(userQuery);

      // Step 2: Run specialized agents in parallel
      const agentPromises = this.determineAgentsToRun(researchQuery, context);
      const agentResults = await Promise.allSettled(agentPromises);

      // Step 3: Extract successful results and handle failures
      const successfulResults = agentResults
        .filter((result): result is PromiseFulfilledResult<AgentResult> =>
          result.status === 'fulfilled'
        )
        .map(result => result.value);

      const failedResults = agentResults
        .filter((result): result is PromiseRejectedResult =>
          result.status === 'rejected'
        )
        .map(result => result.reason);

      if (failedResults.length > 0) {
        console.warn('Some agents failed:', failedResults);
      }

      // Step 4: Synthesize all findings into a comprehensive response
      const synthesis = await this.synthesizeFindings(
        researchQuery,
        successfulResults,
        context
      );

      const totalExecutionTime = Date.now() - startTime;

      // Step 5: Calculate overall confidence and extract sources
      const overallConfidence = this.calculateOverallConfidence(successfulResults);
      const allSources = this.consolidateSources(successfulResults);

      return {
        synthesis,
        agentResults: successfulResults,
        totalExecutionTime,
        confidence: overallConfidence,
        sources: allSources
      };

    } catch (error) {
      console.error('Research orchestration failed:', error);
      throw new Error(`Research failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async analyzeQuery(userQuery: string): Promise<ResearchQuery> {
    const systemPrompt = `You are a query analyzer. Categorize this research query and determine its type.

Query types:
- FACTUAL: Asking for specific information ("What does the author say about X?")
- ANALYTICAL: Asking for analysis or interpretation ("How does X work?" "Why did Y happen?")
- COMPARATIVE: Comparing different parts or concepts ("How does X relate to Y?")
- EVALUATIVE: Asking for judgment or assessment ("Is X well-supported?" "How effective is Y?")

Return in JSON format:
{
  "type": "FACTUAL",
  "priority": 8,
  "reasoning": "This query asks for specific factual information..."
}

Priority: 1-10 scale where 10 is highest priority/complexity`;

    try {
      const response = await this.anthropic.messages.create({
        model: getDefaultModel('anthropic'),
        max_tokens: 500,
        temperature: 0.1,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: `Analyze this query: "${userQuery}"`
        }]
      });

      const content = response.content[0];
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            id: generateId(),
            text: userQuery,
            type: parsed.type as QueryType,
            priority: parsed.priority || 5
          };
        }
      }

      // Fallback if analysis fails
      return {
        id: generateId(),
        text: userQuery,
        type: QueryType.FACTUAL,
        priority: 5
      };

    } catch (error) {
      console.error('Query analysis failed, using defaults:', error);
      return {
        id: generateId(),
        text: userQuery,
        type: QueryType.FACTUAL,
        priority: 5
      };
    }
  }

  private determineAgentsToRun(
    query: ResearchQuery,
    context: BookContext
  ): Promise<AgentResult>[] {
    const agents: Promise<AgentResult>[] = [];

    // Always run search agent for content discovery
    agents.push(this.searchAgent.execute(query, context));

    // Determine which other agents to run based on query type
    switch (query.type) {
      case QueryType.FACTUAL:
        agents.push(this.evidenceAgent.execute(query, context));
        agents.push(this.contextAgent.execute(query, context));
        break;

      case QueryType.ANALYTICAL:
        agents.push(this.analysisAgent.execute(query, context));
        agents.push(this.contextAgent.execute(query, context));
        agents.push(this.evidenceAgent.execute(query, context));
        break;

      case QueryType.COMPARATIVE:
        agents.push(this.analysisAgent.execute(query, context));
        agents.push(this.contextAgent.execute(query, context));
        break;

      case QueryType.EVALUATIVE:
        agents.push(this.evidenceAgent.execute(query, context));
        agents.push(this.analysisAgent.execute(query, context));
        agents.push(this.contextAgent.execute(query, context));
        break;

      default:
        // Run all agents for unknown types
        agents.push(this.evidenceAgent.execute(query, context));
        agents.push(this.analysisAgent.execute(query, context));
        agents.push(this.contextAgent.execute(query, context));
    }

    return agents;
  }

  private async synthesizeFindings(
    query: ResearchQuery,
    agentResults: AgentResult[],
    context: BookContext
  ): Promise<string> {
    const systemPrompt = `You are a research synthesis expert. Your task is to combine findings from multiple research agents into a comprehensive, coherent response.

Given:
- Original query: "${query.text}"
- Query type: ${query.type}
- Multiple agent findings

Create a response that:
1. Directly addresses the original query
2. Integrates insights from all agents smoothly
3. Maintains proper attribution to sources
4. Provides a logical flow of information
5. Highlights the most important findings
6. Notes any limitations or gaps in available information

Write in a natural, conversational tone as if you're an expert who has thoroughly studied this book.`;

    const agentSummary = agentResults.map(result =>
      `## ${result.agentName} (Confidence: ${result.confidence}):\n${result.findings.join('\n\n')}`
    ).join('\n\n---\n\n');

    const userPrompt = `Original query: "${query.text}"

Research findings from specialized agents:

${agentSummary}

Please synthesize these findings into a comprehensive response that directly addresses the original query.`;

    try {
      const response = await this.anthropic.messages.create({
        model: getDefaultModel('anthropic'),
        max_tokens: 4000,
        temperature: 0.2,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: userPrompt
        }]
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return content.text;
      }

      throw new Error('Unexpected response format during synthesis');

    } catch (error) {
      console.error('Synthesis failed, returning raw findings:', error);

      // Fallback: return concatenated findings
      return `Research findings for "${query.text}":\n\n${agentSummary}`;
    }
  }

  private calculateOverallConfidence(results: AgentResult[]): number {
    if (results.length === 0) return 0;

    // Weighted average of agent confidences
    const totalWeight = results.length;
    const weightedSum = results.reduce((sum, result) => sum + result.confidence, 0);

    return Math.round((weightedSum / totalWeight) * 100) / 100;
  }

  private consolidateSources(results: AgentResult[]): any[] {
    const sourceMap = new Map();

    results.forEach(result => {
      result.sources.forEach(source => {
        const key = `${source.sectionId}-${source.sectionTitle}`;
        if (!sourceMap.has(key)) {
          sourceMap.set(key, source);
        }
      });
    });

    return Array.from(sourceMap.values());
  }

  // Method for getting a quick overview without full research
  async getQuickInsight(
    userQuery: string,
    context: BookContext
  ): Promise<string> {
    // For simpler queries, just use the search agent
    const query: ResearchQuery = {
      id: generateId(),
      text: userQuery,
      type: QueryType.FACTUAL,
      priority: 3
    };

    try {
      const result = await this.searchAgent.execute(query, context);
      return result.findings.join('\n\n');
    } catch (error) {
      throw new Error(`Quick insight failed: ${error}`);
    }
  }
}