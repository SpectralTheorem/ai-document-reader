'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Download,
  Upload,
  Settings,
  Eye,
  Clock,
  Brain,
  Search,
  FileSearch,
  BarChart3,
  BookOpen,
  Zap
} from 'lucide-react';

interface AgentExecution {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  duration?: number;
  prompt?: string;
  output?: string;
  confidence?: number;
  sources?: any[];
  error?: string;
}

interface DebugSession {
  id: string;
  query: string;
  bookId: string;
  timestamp: number;
  queryType: string;
  queryAnalysis?: any;
  agents: AgentExecution[];
  synthesis?: string;
  totalDuration: number;
  status: 'idle' | 'analyzing' | 'executing' | 'synthesizing' | 'completed' | 'failed';
}

const AGENT_ICONS = {
  'BookSearchAgent': Search,
  'EvidenceAgent': FileSearch,
  'AnalysisAgent': BarChart3,
  'ContextAgent': BookOpen
};

const AGENT_COLORS = {
  'BookSearchAgent': 'bg-blue-500',
  'EvidenceAgent': 'bg-green-500',
  'AnalysisAgent': 'bg-purple-500',
  'ContextAgent': 'bg-orange-500'
};

export default function DebugPage() {
  const [sessions, setSessions] = useState<DebugSession[]>([]);
  const [currentSession, setCurrentSession] = useState<DebugSession | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [query, setQuery] = useState('');
  const [bookId, setBookId] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3005/api/debug/ws');

    ws.onopen = () => {
      setIsConnected(true);
      console.log('Debug WebSocket connected');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('Debug WebSocket disconnected');
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, []);

  const handleWebSocketMessage = (data: any) => {
    // Handle real-time updates from the orchestrator
    switch (data.type) {
      case 'session_started':
        setCurrentSession(data.session);
        break;
      case 'agent_started':
        updateAgentStatus(data.sessionId, data.agentId, 'running', { startTime: data.timestamp });
        break;
      case 'agent_completed':
        updateAgentStatus(data.sessionId, data.agentId, 'completed', {
          endTime: data.timestamp,
          output: data.output,
          confidence: data.confidence,
          sources: data.sources
        });
        break;
      case 'synthesis_started':
        updateSessionStatus(data.sessionId, 'synthesizing');
        break;
      case 'session_completed':
        updateSessionStatus(data.sessionId, 'completed');
        break;
    }
  };

  const updateAgentStatus = (sessionId: string, agentId: string, status: string, updates: any) => {
    if (currentSession?.id === sessionId) {
      setCurrentSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          agents: prev.agents.map(agent =>
            agent.id === agentId
              ? { ...agent, status: status as any, ...updates }
              : agent
          )
        };
      });
    }
  };

  const updateSessionStatus = (sessionId: string, status: string) => {
    if (currentSession?.id === sessionId) {
      setCurrentSession(prev => prev ? { ...prev, status: status as any } : null);
    }
  };

  const startDebugSession = async () => {
    if (!query || !bookId) return;

    try {
      const response = await fetch('/api/debug/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          bookId,
          enableDebugging: true
        })
      });

      const session = await response.json();
      setCurrentSession(session);
      setSessions(prev => [session, ...prev]);
    } catch (error) {
      console.error('Failed to start debug session:', error);
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    return `${ms.toFixed(0)}ms`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-gray-500';
      case 'running': return 'text-blue-500 animate-pulse';
      case 'completed': return 'text-green-500';
      case 'failed': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold flex items-center">
              <Brain className="h-6 w-6 mr-2 text-blue-600" />
              Multi-Agent Debug Console
            </h1>
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
              isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Session
            </Button>
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Import Session
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Panel - Query & Control */}
        <div className="w-80 bg-white border-r p-4 overflow-y-auto">
          <div className="space-y-4">
            {/* Query Input */}
            <div>
              <label className="block text-sm font-medium mb-2">Research Query</label>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your research question..."
                className="w-full h-24 px-3 py-2 border rounded-md resize-none"
              />
            </div>

            {/* Book ID Input */}
            <div>
              <label className="block text-sm font-medium mb-2">Book ID</label>
              <input
                type="text"
                value={bookId}
                onChange={(e) => setBookId(e.target.value)}
                placeholder="Enter book ID..."
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            {/* Controls */}
            <div className="flex space-x-2">
              <Button
                onClick={startDebugSession}
                disabled={!query || !bookId}
                className="flex-1"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Debug
              </Button>
              <Button variant="outline">
                <Square className="h-4 w-4" />
              </Button>
            </div>

            {/* Session History */}
            <div>
              <h3 className="font-medium mb-2">Recent Sessions</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {sessions.map(session => (
                  <div
                    key={session.id}
                    className={`p-2 border rounded cursor-pointer hover:bg-gray-50 ${
                      currentSession?.id === session.id ? 'border-blue-500 bg-blue-50' : ''
                    }`}
                    onClick={() => setCurrentSession(session)}
                  >
                    <div className="text-sm font-medium truncate">{session.query}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(session.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {currentSession ? (
            <>
              {/* Session Overview */}
              <div className="bg-white border-b p-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-medium">Session: {currentSession.query}</h2>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>Status: <span className={getStatusColor(currentSession.status)}>{currentSession.status}</span></span>
                    <span>Type: {currentSession.queryType}</span>
                    <span>Duration: {formatDuration(currentSession.totalDuration)}</span>
                  </div>
                </div>

                {/* Agent Status Bar */}
                <div className="flex space-x-2">
                  {currentSession.agents.map(agent => {
                    const IconComponent = AGENT_ICONS[agent.name as keyof typeof AGENT_ICONS];
                    const colorClass = AGENT_COLORS[agent.name as keyof typeof AGENT_COLORS];

                    return (
                      <div
                        key={agent.id}
                        className={`flex items-center space-x-2 px-3 py-1 rounded-full text-white text-sm cursor-pointer ${colorClass} ${
                          selectedAgent === agent.id ? 'ring-2 ring-gray-400' : ''
                        }`}
                        onClick={() => setSelectedAgent(agent.id)}
                      >
                        <IconComponent className="h-3 w-3" />
                        <span>{agent.name.replace('Agent', '')}</span>
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)}`} />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Agent Details */}
              <div className="flex-1 flex overflow-hidden">
                {/* Agent List */}
                <div className="w-64 bg-gray-50 border-r overflow-y-auto">
                  {currentSession.agents.map(agent => {
                    const IconComponent = AGENT_ICONS[agent.name as keyof typeof AGENT_ICONS];

                    return (
                      <div
                        key={agent.id}
                        className={`p-3 border-b cursor-pointer hover:bg-gray-100 ${
                          selectedAgent === agent.id ? 'bg-blue-50 border-blue-200' : ''
                        }`}
                        onClick={() => setSelectedAgent(agent.id)}
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <IconComponent className="h-4 w-4" />
                          <span className="font-medium text-sm">{agent.name}</span>
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)}`} />
                        </div>
                        <div className="text-xs text-gray-500">
                          <div>Duration: {formatDuration(agent.duration)}</div>
                          {agent.confidence && (
                            <div>Confidence: {Math.round(agent.confidence * 100)}%</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Agent Detail View */}
                <div className="flex-1 p-4 overflow-y-auto">
                  {selectedAgent ? (
                    (() => {
                      const agent = currentSession.agents.find(a => a.id === selectedAgent);
                      if (!agent) return <div>Agent not found</div>;

                      return (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium">{agent.name}</h3>
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Clock className="h-4 w-4" />
                              <span>{formatDuration(agent.duration)}</span>
                            </div>
                          </div>

                          {/* Agent Prompt */}
                          {agent.prompt && (
                            <div>
                              <h4 className="font-medium mb-2">System Prompt</h4>
                              <div className="bg-gray-100 p-3 rounded border text-sm font-mono whitespace-pre-wrap">
                                {agent.prompt}
                              </div>
                            </div>
                          )}

                          {/* Agent Output */}
                          {agent.output && (
                            <div>
                              <h4 className="font-medium mb-2">Agent Output</h4>
                              <div className="bg-green-50 border border-green-200 p-3 rounded text-sm whitespace-pre-wrap">
                                {agent.output}
                              </div>
                            </div>
                          )}

                          {/* Sources */}
                          {agent.sources && agent.sources.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-2">Sources ({agent.sources.length})</h4>
                              <div className="space-y-2">
                                {agent.sources.map((source, idx) => (
                                  <div key={idx} className="bg-blue-50 border border-blue-200 p-2 rounded text-sm">
                                    <div className="font-medium">{source.sectionTitle}</div>
                                    <div className="text-gray-600">{source.excerpt}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Error */}
                          {agent.error && (
                            <div>
                              <h4 className="font-medium mb-2 text-red-600">Error</h4>
                              <div className="bg-red-50 border border-red-200 p-3 rounded text-sm text-red-700">
                                {agent.error}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="text-center text-gray-500 mt-8">
                      <Eye className="h-8 w-8 mx-auto mb-2" />
                      <p>Select an agent to view details</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Zap className="h-12 w-12 mx-auto mb-4" />
                <p className="text-lg">Start a debug session to see agent orchestration</p>
                <p className="text-sm">Enter a query and book ID, then click "Start Debug"</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}