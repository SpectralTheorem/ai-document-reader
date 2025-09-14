import Anthropic from '@anthropic-ai/sdk';
import { getDefaultModel } from '@/lib/config';
import { debugEmitter, DebugSession, AgentDebugInfo } from './debug-types';
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
import { DebugSettings, DEFAULT_DEBUG_SETTINGS } from '@/types/debug-settings';

export class BookResearchOrchestrator {
  private anthropic: Anthropic;
  private searchAgent: BookSearchAgent;
  private evidenceAgent: EvidenceAgent;
  private analysisAgent: AnalysisAgent;
  private contextAgent: ContextAgent;
  private currentSession: DebugSession | null = null;

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
    context: BookContext,
    enableDebug: boolean = false,
    providedSessionId?: string,
    settings?: DebugSettings | null
  ): Promise<ResearchResponse> {
    const startTime = Date.now();
    const sessionId = providedSessionId || generateId();

    try {
      // Initialize debug session if enabled
      if (enableDebug) {
        this.currentSession = {
          id: sessionId,
          query: userQuery,
          bookId: context.bookId,
          timestamp: startTime,
          agents: [],
          status: 'analyzing'
        };

        debugEmitter.emit({
          type: 'session_started',
          timestamp: startTime,
          sessionId,
          data: {
            query: userQuery,
            bookId: context.bookId,
            session: this.currentSession
          }
        });
      }

      // Step 1: Analyze the query to determine approach
      const researchQuery = await this.analyzeQuery(userQuery, sessionId);

      // Update debug session with analysis results
      if (enableDebug && this.currentSession) {
        this.currentSession.queryType = researchQuery.type;
        this.currentSession.queryAnalysis = {
          originalQuery: userQuery,
          analyzedType: researchQuery.type,
          priority: researchQuery.priority || 5,
          reasoning: `Query classified as ${researchQuery.type}`,
          selectedAgents: this.getAgentNamesForType(researchQuery.type)
        };
        this.currentSession.status = 'executing';

        debugEmitter.emit({
          type: 'query_analyzed',
          timestamp: Date.now(),
          sessionId,
          data: {
            analysis: this.currentSession.queryAnalysis
          }
        });
      }

      // Step 2: Run specialized agents in parallel with debug tracking
      const agentPromises = this.determineAgentsToRun(researchQuery, context, sessionId, enableDebug, settings);
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
      if (enableDebug && this.currentSession) {
        this.currentSession.status = 'synthesizing';
        debugEmitter.emit({
          type: 'synthesis_started',
          timestamp: Date.now(),
          sessionId,
          data: {
            agentResults: successfulResults.length,
            failedAgents: failedResults.length
          }
        });
      }

      const synthesis = await this.synthesizeFindings(
        researchQuery,
        successfulResults,
        context,
        sessionId
      );

      const totalExecutionTime = Date.now() - startTime;

      // Step 5: Calculate overall confidence and extract sources
      const overallConfidence = this.calculateOverallConfidence(successfulResults);
      const allSources = this.consolidateSources(successfulResults);

      // Complete debug session
      if (enableDebug && this.currentSession) {
        this.currentSession.status = 'completed';
        this.currentSession.totalDuration = totalExecutionTime;

        debugEmitter.emit({
          type: 'session_completed',
          timestamp: Date.now(),
          sessionId,
          data: {
            session: this.currentSession,
            results: {
              synthesis,
              confidence: overallConfidence,
              sources: allSources.length,
              totalDuration: totalExecutionTime
            }
          }
        });
      }

      return {
        synthesis,
        agentResults: successfulResults,
        totalExecutionTime,
        confidence: overallConfidence,
        sources: allSources
      };

    } catch (error) {
      console.error('Research orchestration failed:', error);

      // Emit debug event for session failure
      if (enableDebug) {
        debugEmitter.emit({
          type: 'session_failed',
          timestamp: Date.now(),
          sessionId,
          data: {
            error: error instanceof Error ? error.message : 'Unknown error',
            duration: Date.now() - startTime
          }
        });
      }

      throw new Error(`Research failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async analyzeQuery(userQuery: string, sessionId?: string): Promise<ResearchQuery> {
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
    context: BookContext,
    sessionId?: string,
    enableDebug: boolean = false,
    settings?: DebugSettings | null
  ): Promise<AgentResult>[] {
    const agents: Promise<AgentResult>[] = [];
    const enabledAgents = settings?.enabledAgents || {
      bookSearch: true,
      evidence: true,
      analysis: true,
      context: true
    };

    // Add agents based on settings, still respecting query type logic
    if (enabledAgents.bookSearch) {
      agents.push(this.searchAgent.execute(query, context, sessionId));
    }

    // Determine which other agents to run based on query type and settings
    switch (query.type) {
      case QueryType.FACTUAL:
        if (enabledAgents.evidence) {
          agents.push(this.evidenceAgent.execute(query, context, sessionId));
        }
        if (enabledAgents.context) {
          agents.push(this.contextAgent.execute(query, context, sessionId));
        }
        break;

      case QueryType.ANALYTICAL:
        if (enabledAgents.analysis) {
          agents.push(this.analysisAgent.execute(query, context, sessionId));
        }
        if (enabledAgents.context) {
          agents.push(this.contextAgent.execute(query, context, sessionId));
        }
        if (enabledAgents.evidence) {
          agents.push(this.evidenceAgent.execute(query, context, sessionId));
        }
        break;

      case QueryType.COMPARATIVE:
        if (enabledAgents.analysis) {
          agents.push(this.analysisAgent.execute(query, context, sessionId));
        }
        if (enabledAgents.context) {
          agents.push(this.contextAgent.execute(query, context, sessionId));
        }
        break;

      case QueryType.EVALUATIVE:
        if (enabledAgents.evidence) {
          agents.push(this.evidenceAgent.execute(query, context, sessionId));
        }
        if (enabledAgents.analysis) {
          agents.push(this.analysisAgent.execute(query, context, sessionId));
        }
        if (enabledAgents.context) {
          agents.push(this.contextAgent.execute(query, context, sessionId));
        }
        break;

      default:
        // Run enabled agents for unknown types
        if (enabledAgents.evidence) {
          agents.push(this.evidenceAgent.execute(query, context, sessionId));
        }
        if (enabledAgents.analysis) {
          agents.push(this.analysisAgent.execute(query, context, sessionId));
        }
        if (enabledAgents.context) {
          agents.push(this.contextAgent.execute(query, context, sessionId));
        }
    }

    return agents;
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

  // Debug helper methods
  private getAgentNamesForType(queryType: string): string[] {
    const baseAgents = ['BookSearchAgent'];

    switch (queryType) {
      case 'FACTUAL':
        return [...baseAgents, 'EvidenceAgent', 'ContextAgent'];
      case 'ANALYTICAL':
        return [...baseAgents, 'AnalysisAgent', 'ContextAgent', 'EvidenceAgent'];
      case 'COMPARATIVE':
        return [...baseAgents, 'AnalysisAgent', 'ContextAgent'];
      case 'EVALUATIVE':
        return [...baseAgents, 'EvidenceAgent', 'AnalysisAgent', 'ContextAgent'];
      default:
        return [...baseAgents, 'EvidenceAgent', 'AnalysisAgent', 'ContextAgent'];
    }
  }

  private calculateTotalTokens(agents: AgentDebugInfo[]): number {
    return agents.reduce((total, agent) => {
      return total + (agent.metadata?.tokenUsage?.total || 0);
    }, 0);
  }

  private getTokensByAgent(agents: AgentDebugInfo[]): Record<string, number> {
    const tokensByAgent: Record<string, number> = {};

    agents.forEach(agent => {
      tokensByAgent[agent.name] = agent.metadata?.tokenUsage?.total || 0;
    });

    return tokensByAgent;
  }

  private async synthesizeFindings(
    query: ResearchQuery,
    agentResults: AgentResult[],
    context: BookContext,
    sessionId?: string
  ): Promise<string> {
    const systemPrompt = `You are a research synthesis expert. Your task is to combine findings from multiple research agents into a comprehensive, coherent response.

Given:
- Original query: "${query.text}"
- Query type: ${query.type}
- Multiple agent findings

Your task:
1. Synthesize all findings into a coherent, well-structured response
2. Highlight key insights and evidence
3. Note any conflicting information or gaps
4. Provide a comprehensive answer that addresses the original query

Be thorough but concise. Structure your response clearly with proper formatting.`;

    const findingsText = agentResults
      .map(result => `**${result.agentName} Findings:**\n${result.findings.join('\n')}\n`)
      .join('\n');

    const userPrompt = `Please synthesize these research findings into a comprehensive response:\n\n${findingsText}`;

    if (sessionId && this.currentSession) {
      const synthesisStart = Date.now();

      this.currentSession.synthesis = {
        startTime: synthesisStart,
        systemPrompt,
        agentInputs: findingsText
      };

      debugEmitter.emit({
        type: 'synthesis_started',
        timestamp: synthesisStart,
        sessionId,
        data: {
          systemPrompt,
          agentInputs: findingsText
        }
      });
    }

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

      const synthesisEnd = Date.now();
      const synthesis = response.content[0].type === 'text' ? response.content[0].text : '';

      if (sessionId && this.currentSession && this.currentSession.synthesis) {
        this.currentSession.synthesis.endTime = synthesisEnd;
        this.currentSession.synthesis.duration = synthesisEnd - this.currentSession.synthesis.startTime;
        this.currentSession.synthesis.rawOutput = synthesis;
        this.currentSession.synthesis.finalOutput = synthesis;

        debugEmitter.emit({
          type: 'synthesis_completed',
          timestamp: synthesisEnd,
          sessionId,
          data: {
            duration: this.currentSession.synthesis.duration,
            synthesis
          }
        });
      }

      return synthesis;

    } catch (error) {
      console.error('Synthesis failed:', error);
      return `I was able to gather research findings, but encountered an error during synthesis: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
}