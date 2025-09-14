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
import { libraryStorage } from '@/lib/library-storage';
import { DebugSettings, DEFAULT_DEBUG_SETTINGS, loadDebugSettings, saveDebugSettings, exportDebugSettings, importDebugSettings } from '@/types/debug-settings';
import { BookSelector } from '@/components/BookSelector';
import { QueryTemplates } from '@/components/QueryTemplates';
import { loadDebugPresets, saveDebugPresets, DebugPresets } from '@/types/debug-presets';

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
  const [settings, setSettings] = useState<DebugSettings>(DEFAULT_DEBUG_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [presets, setPresets] = useState<DebugPresets>({ favoriteQueries: [], queryHistory: [] });
  const wsRef = useRef<WebSocket | null>(null);

  // Load settings and presets on component mount
  useEffect(() => {
    setSettings(loadDebugSettings());
    const loadedPresets = loadDebugPresets();
    setPresets(loadedPresets);

    // Restore last selections
    if (loadedPresets.lastBookId) {
      setBookId(loadedPresets.lastBookId);
    }
    if (loadedPresets.lastQuery) {
      setQuery(loadedPresets.lastQuery);
    }
  }, []);

  // Server-Sent Events connection for real-time updates
  useEffect(() => {
    const eventSource = new EventSource('/api/debug/ws');

    eventSource.onopen = () => {
      setIsConnected(true);
      console.log('Debug SSE connected');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleDebugMessage(data);
      } catch (error) {
        console.error('Failed to parse debug message:', error);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      console.log('Debug SSE disconnected');
    };

    // Store reference for cleanup
    wsRef.current = eventSource as any;

    return () => {
      eventSource.close();
    };
  }, []);

  const handleDebugMessage = (data: any) => {
    console.log('📡 Debug event received:', data);

    // Handle real-time updates from the orchestrator
    switch (data.type) {
      case 'connected':
        console.log('✅ Debug stream connected');
        break;
      case 'session_started':
        setCurrentSession(data.data.session);
        setSessions(prev => [data.data.session, ...prev]);
        break;
      case 'query_analyzed':
        if (currentSession?.id === data.sessionId) {
          setCurrentSession(prev => prev ? {
            ...prev,
            queryAnalysis: data.data.analysis,
            status: 'executing'
          } : null);
        }
        break;
      case 'agent_started':
        updateAgentStatus(data.sessionId, data.data.agentId, 'running', {
          agentName: data.data.agentName,
          startTime: data.timestamp
        });
        break;
      case 'agent_progress':
        // Handle agent progress updates
        if (data.data.stage === 'api_call_complete') {
          updateAgentStatus(data.sessionId, data.data.agentId, 'completed', {
            endTime: data.timestamp,
            duration: data.data.duration,
            output: data.data.rawOutput,
            confidence: 0.8, // Default confidence
            metadata: {
              tokenUsage: data.data.tokenUsage
            }
          });
        }
        break;
      case 'agent_completed':
        updateAgentStatus(data.sessionId, data.data.agentId, 'completed', {
          endTime: data.timestamp,
          output: data.data.output,
          confidence: data.data.confidence,
          sources: data.data.sources
        });
        break;
      case 'agent_failed':
        updateAgentStatus(data.sessionId, data.data.agentId, 'failed', {
          error: data.data.error
        });
        break;
      case 'synthesis_started':
        updateSessionStatus(data.sessionId, 'synthesizing');
        break;
      case 'synthesis_completed':
        if (currentSession?.id === data.sessionId) {
          setCurrentSession(prev => prev ? {
            ...prev,
            synthesis: {
              ...prev.synthesis,
              finalOutput: data.data.synthesis,
              duration: data.data.duration
            }
          } : null);
        }
        break;
      case 'session_completed':
        updateSessionStatus(data.sessionId, 'completed');
        if (currentSession?.id === data.sessionId && data.data.session) {
          setCurrentSession(data.data.session);
        }
        break;
      case 'session_failed':
        updateSessionStatus(data.sessionId, 'failed');
        break;
    }
  };

  const updateAgentStatus = (sessionId: string, agentId: string, status: string, updates: any) => {
    if (currentSession?.id === sessionId) {
      setCurrentSession(prev => {
        if (!prev) return null;

        // Check if agent exists
        const existingAgent = prev.agents.find(agent => agent.id === agentId);

        if (existingAgent) {
          // Update existing agent
          return {
            ...prev,
            agents: prev.agents.map(agent =>
              agent.id === agentId
                ? { ...agent, status: status as any, ...updates }
                : agent
            )
          };
        } else {
          // Create new agent
          const newAgent = {
            id: agentId,
            name: updates.agentName || agentId.split('_')[0], // Extract agent name from ID
            status: status as any,
            startTime: Date.now(),
            endTime: undefined,
            duration: 0,
            ...updates
          };

          return {
            ...prev,
            agents: [...prev.agents, newAgent]
          };
        }
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
      console.log('🚀 Starting debug session...', { query, bookId });

      // Get the book document from client-side IndexedDB first
      console.log('📚 Fetching document from IndexedDB...');
      let document = null;

      try {
        document = await libraryStorage.getDocument(bookId);
        console.log('📋 Document fetch result:', {
          hasDocument: !!document,
          title: document?.title,
          sectionsCount: document?.sections?.length
        });
      } catch (error) {
        console.error('❌ Failed to fetch document from IndexedDB:', error);
      }

      if (!document) {
        throw new Error('Book not found in library. Please make sure the book is loaded in the main application first.');
      }

      console.log('📚 Starting debug session using book-research API with client-side document...');

      // Generate a unique debug session ID
      const timestamp = Date.now();
      const randomPart = Math.random().toString(36).substr(2, 9);
      const extraRandom = Math.random().toString(36).substr(2, 5);
      const sessionId = `debug_${timestamp}_${randomPart}_${extraRandom}`;
      console.log('🆔 Generated session ID:', sessionId);

      const response = await fetch('/api/debug/book-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          bookId,
          document,
          mode: settings.researchMode,
          enableDebugging: true,
          sessionId,
          settings
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to start debug session');
      }

      console.log('✅ Debug session completed:', result);

      // Save to query history
      const updatedPresets = {
        ...presets,
        lastBookId: bookId,
        lastQuery: query,
        queryHistory: [
          { bookId, query, timestamp: Date.now() },
          ...presets.queryHistory.filter(h => !(h.bookId === bookId && h.query === query))
        ].slice(0, 10) // Keep last 10
      };
      setPresets(updatedPresets);
      saveDebugPresets(updatedPresets);

      // Create a session based on the book-research results
      const debugSession: DebugSession = {
        id: sessionId,
        query,
        bookId,
        timestamp: Date.now(),
        agents: result.agentResults?.map((agentResult: any, index: number) => ({
          id: `${agentResult.agentName}_${sessionId}_${index}`,
          name: agentResult.agentName,
          status: 'completed' as const,
          startTime: Date.now() - (result.totalExecutionTime || 0),
          endTime: Date.now(),
          duration: agentResult.executionTime || result.totalExecutionTime || 0,
          output: agentResult.findings?.join('\n\n'),
          confidence: agentResult.confidence,
          sources: agentResult.sources
        })) || [],
        synthesis: result.synthesis,
        totalDuration: result.totalExecutionTime || 0,
        status: 'completed'
      };

      setCurrentSession(debugSession);
      setSessions(prev => {
        // Ensure we don't add duplicate sessions
        const exists = prev.find(s => s.id === debugSession.id);
        if (exists) {
          // Update existing session instead of adding duplicate
          return prev.map(s => s.id === debugSession.id ? debugSession : s);
        }
        return [debugSession, ...prev];
      });

    } catch (error) {
      console.error('❌ Failed to start debug session:', error);
      alert(`Failed to start debug session: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  // Settings handlers
  const handleSettingsChange = (newSettings: DebugSettings) => {
    setSettings(newSettings);
    saveDebugSettings(newSettings);
  };

  const exportSettings = () => {
    const data = exportDebugSettings(settings);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'debug-settings.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importSettings = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = e.target?.result as string;
            const newSettings = importDebugSettings(content);
            handleSettingsChange(newSettings);
          } catch (error) {
            alert('Failed to import settings: ' + (error as Error).message);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Panel - Query & Control */}
        <div className="w-80 bg-white border-r p-4 overflow-y-auto">
          <div className="space-y-4">
            {/* Book Selection */}
            <BookSelector
              selectedBookId={bookId}
              onBookSelect={setBookId}
              disabled={false}
            />

            {/* Query Templates & Input */}
            <QueryTemplates
              selectedQuery={query}
              onQuerySelect={setQuery}
              disabled={false}
            />

            {/* Controls */}
            <div className="space-y-2">
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

              {/* Quick Actions */}
              {presets.lastBookId && presets.lastQuery && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setBookId(presets.lastBookId!);
                    setQuery(presets.lastQuery!);
                  }}
                  className="w-full text-sm"
                  disabled={bookId === presets.lastBookId && query === presets.lastQuery}
                >
                  <RotateCcw className="h-3 w-3 mr-2" />
                  Restore Last Session
                </Button>
              )}
            </div>

            {/* Settings Panel */}
            {showSettings && (
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Debug Settings</h3>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={exportSettings}>
                      <Download className="h-3 w-3 mr-1" />
                      Export
                    </Button>
                    <Button variant="outline" size="sm" onClick={importSettings}>
                      <Upload className="h-3 w-3 mr-1" />
                      Import
                    </Button>
                  </div>
                </div>

                {/* Token Limit */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Token Limit per Agent: {(settings.tokenLimitPerAgent / 1000).toFixed(0)}k
                  </label>
                  <input
                    type="range"
                    min="25000"
                    max="150000"
                    step="5000"
                    value={settings.tokenLimitPerAgent}
                    onChange={(e) => handleSettingsChange({
                      ...settings,
                      tokenLimitPerAgent: parseInt(e.target.value)
                    })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>25k</span>
                    <span>150k</span>
                  </div>
                </div>

                {/* Max Sections */}
                <div>
                  <label className="block text-sm font-medium mb-2">Max Sections</label>
                  <input
                    type="number"
                    min="5"
                    max="50"
                    value={settings.maxSections}
                    onChange={(e) => handleSettingsChange({
                      ...settings,
                      maxSections: parseInt(e.target.value) || 20
                    })}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                {/* Enabled Agents */}
                <div>
                  <label className="block text-sm font-medium mb-2">Enabled Agents</label>
                  <div className="space-y-2">
                    {Object.entries(settings.enabledAgents).map(([key, enabled]) => (
                      <label key={key} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={(e) => handleSettingsChange({
                            ...settings,
                            enabledAgents: {
                              ...settings.enabledAgents,
                              [key]: e.target.checked
                            }
                          })}
                        />
                        <span className="text-sm capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Research Mode */}
                <div>
                  <label className="block text-sm font-medium mb-2">Research Mode</label>
                  <select
                    value={settings.researchMode}
                    onChange={(e) => handleSettingsChange({
                      ...settings,
                      researchMode: e.target.value as 'quick' | 'full'
                    })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="quick">Quick</option>
                    <option value="full">Full</option>
                  </select>
                </div>

                {/* Reset Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSettingsChange(DEFAULT_DEBUG_SETTINGS)}
                  className="w-full"
                >
                  <RotateCcw className="h-3 w-3 mr-2" />
                  Reset to Defaults
                </Button>
              </div>
            )}

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