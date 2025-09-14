// Debug-specific types for agent orchestration monitoring

export interface DebugEvent {
  type: 'session_started' | 'query_analyzed' | 'agent_started' | 'agent_progress' |
        'agent_completed' | 'agent_failed' | 'synthesis_started' | 'synthesis_completed' |
        'session_completed' | 'session_failed';
  timestamp: number;
  sessionId: string;
  data: any;
}

export interface AgentDebugInfo {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  duration?: number;
  systemPrompt?: string;
  userPrompt?: string;
  rawOutput?: string;
  processedOutput?: string;
  confidence?: number;
  sources?: any[];
  error?: string;
  metadata?: {
    tokenUsage?: {
      input: number;
      output: number;
      total: number;
    };
    modelUsed?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

export interface DebugSession {
  id: string;
  query: string;
  bookId: string;
  timestamp: number;
  queryType?: string;
  queryAnalysis?: {
    originalQuery: string;
    analyzedType: string;
    priority: number;
    reasoning: string;
    selectedAgents: string[];
  };
  agents: AgentDebugInfo[];
  synthesis?: {
    startTime: number;
    endTime?: number;
    duration?: number;
    systemPrompt?: string;
    agentInputs: string;
    rawOutput?: string;
    finalOutput?: string;
  };
  totalDuration?: number;
  status: 'idle' | 'analyzing' | 'executing' | 'synthesizing' | 'completed' | 'failed';
  error?: string;
  performance?: {
    totalAgents: number;
    parallelExecutionTime: number;
    synthesisTime: number;
    overallConfidence: number;
    tokenUsage: {
      total: number;
      byAgent: Record<string, number>;
    };
  };
}

export interface DebugEventEmitter {
  emit(event: DebugEvent): void;
  subscribe(callback: (event: DebugEvent) => void): () => void;
}

// Global debug event emitter for agent system
export class AgentDebugEmitter implements DebugEventEmitter {
  private callbacks: Set<(event: DebugEvent) => void> = new Set();
  private static instance: AgentDebugEmitter;

  static getInstance(): AgentDebugEmitter {
    if (!AgentDebugEmitter.instance) {
      AgentDebugEmitter.instance = new AgentDebugEmitter();
    }
    return AgentDebugEmitter.instance;
  }

  emit(event: DebugEvent): void {
    console.log(`🔔 DebugEmitter: Emitting ${event.type} to ${this.callbacks.size} subscribers`);
    this.callbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Debug event callback error:', error);
      }
    });
  }

  subscribe(callback: (event: DebugEvent) => void): () => void {
    console.log(`📝 DebugEmitter: New subscriber added, total: ${this.callbacks.size + 1}`);
    this.callbacks.add(callback);
    return () => {
      console.log(`📝 DebugEmitter: Subscriber removed, total: ${this.callbacks.size - 1}`);
      this.callbacks.delete(callback);
    };
  }

  clear(): void {
    this.callbacks.clear();
  }
}

export const debugEmitter = AgentDebugEmitter.getInstance();