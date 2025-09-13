'use client';

import { useState, useRef, useEffect } from 'react';
import { Section, ChatMessage } from '@/types/document';
import { Button } from '@/components/ui/button';
import { Send, Bot, User, Sparkles, List, HelpCircle, Lightbulb, FileSearch, ChevronDown, ChevronRight, AlertTriangle, Plus, MessageSquare, Settings2, Archive, Trash2 } from 'lucide-react';
import { generateId } from '@/lib/utils';
import { TokenTracker } from '@/lib/token-tracker';
import { useSettings } from '@/lib/settings-storage';
import { conversationStorage } from '@/lib/conversation-storage';
import { ConversationThread, ConversationSummary } from '@/types/conversations';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatInterfaceProps {
  section: Section | null;
  bookId: string;
  messages: ChatMessage[];
  onMessagesChange: (messages: ChatMessage[]) => void;
}

const AI_ACTIONS = [
  { id: 'extract-facts', name: 'Extract Facts', icon: FileSearch },
  { id: 'summarize', name: 'Summarize', icon: List },
  { id: 'explain', name: 'Explain Simply', icon: Lightbulb },
  { id: 'questions', name: 'Generate Questions', icon: HelpCircle },
  { id: 'key-concepts', name: 'Key Concepts', icon: Sparkles },
];

interface ThinkingSectionProps {
  content: string;
}

function ThinkingSection({ content }: ThinkingSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mb-3 border-l-4 border-gray-300 pl-3 bg-gray-50 rounded-r-lg">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center space-x-2 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <span className="font-medium">Thinking</span>
      </button>
      
      {isExpanded && (
        <div className="pb-3 pr-3">
          <div className="text-sm text-gray-600 whitespace-pre-wrap font-mono bg-white p-3 rounded border">
            {content}
          </div>
        </div>
      )}
    </div>
  );
}

export function ChatInterface({ section, bookId, messages, onMessagesChange }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { settings } = useSettings();

  const [isThinkingExpanded, setIsThinkingExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Thread management state
  const [currentThread, setCurrentThread] = useState<ConversationThread | null>(null);
  const [threadSummaries, setThreadSummaries] = useState<ConversationSummary[]>([]);
  const [showThreadSelector, setShowThreadSelector] = useState(false);
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState('');

  useEffect(() => {
    if (settings.interface.autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, settings.interface.autoScroll]);

  // Load thread summaries when section changes
  useEffect(() => {
    if (section && bookId) {
      loadThreadSummaries();
      loadOrCreateDefaultThread();
    }
  }, [section?.id, bookId]);

  // Thread management functions
  const loadThreadSummaries = async () => {
    try {
      const summaries = await conversationStorage.getThreadSummaries({
        bookId,
        sectionId: section?.id,
        isArchived: false
      });
      setThreadSummaries(summaries);
    } catch (error) {
      console.error('Failed to load thread summaries:', error);
    }
  };

  const loadOrCreateDefaultThread = async () => {
    if (!section) return;

    try {
      // Try to load existing threads
      const summaries = await conversationStorage.getThreadSummaries({
        bookId,
        sectionId: section.id,
        isArchived: false
      });

      if (summaries.length > 0) {
        // Load the most recent thread
        const thread = await conversationStorage.getThread(summaries[0].id);
        if (thread) {
          setCurrentThread(thread);
          onMessagesChange(thread.messages);
          return;
        }
      }

      // Create new thread if none exist
      const newThread = await conversationStorage.createThread(
        bookId,
        section.id,
        `Discussion: ${section.title}`
      );
      setCurrentThread(newThread);
      onMessagesChange([]);
      loadThreadSummaries();
    } catch (error) {
      console.error('Failed to load/create thread:', error);
    }
  };

  const createNewThread = async () => {
    if (!section) return;

    try {
      const title = newThreadTitle.trim() || `New Discussion: ${section.title}`;
      const thread = await conversationStorage.createThread(bookId, section.id, title);

      setCurrentThread(thread);
      onMessagesChange([]);
      setNewThreadTitle('');
      setIsCreatingThread(false);
      loadThreadSummaries();
    } catch (error) {
      console.error('Failed to create thread:', error);
    }
  };

  const switchToThread = async (threadId: string) => {
    try {
      const thread = await conversationStorage.getThread(threadId);
      if (thread) {
        setCurrentThread(thread);
        onMessagesChange(thread.messages);
        setShowThreadSelector(false);
      }
    } catch (error) {
      console.error('Failed to switch thread:', error);
    }
  };

  const deleteThread = async (threadId: string) => {
    try {
      await conversationStorage.deleteThread(threadId);
      loadThreadSummaries();

      // If we deleted the current thread, load another one
      if (currentThread?.id === threadId) {
        loadOrCreateDefaultThread();
      }
    } catch (error) {
      console.error('Failed to delete thread:', error);
    }
  };

  const sendMessage = async (content: string, action?: string) => {
    if (!section || (!content.trim() && !action) || !currentThread) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: action ? `[Action: ${AI_ACTIONS.find(a => a.id === action)?.name}]` : content,
      timestamp: new Date(),
      sectionId: section.id,
    };

    const updatedMessages = [...messages, userMessage];
    onMessagesChange(updatedMessages);
    setInput('');
    setIsLoading(true);

    // Save user message to thread
    try {
      await conversationStorage.addMessage(currentThread.id, userMessage);
    } catch (error) {
      console.error('Failed to save user message:', error);
    }

    // Create an initial assistant message that will be updated with streaming content
    const assistantMessageId = generateId();
    const initialAssistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      sectionId: section.id,
    };

    const messagesWithAssistant = [...updatedMessages, initialAssistantMessage];
    onMessagesChange(messagesWithAssistant);

    try {
      const contextMessage = {
        role: 'system',
        content: `You are helping analyze the following chapter from a book. Chapter title: "${section.title}". Chapter content: ${section.content?.substring(0, 3000)}...`
      };

      const processedMessages = [
        contextMessage,
        ...updatedMessages.map(m => ({
          role: m.role,
          content: m.content
        }))
      ];

      const response = await fetch('/api/ai/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: processedMessages,
          provider: settings.ai.defaultProvider,
          model: settings.ai.defaultModels[settings.ai.defaultProvider],
          apiKey: settings.ai.defaultProvider !== 'ollama' ? (settings.ai.apiKeys[settings.ai.defaultProvider] || undefined) : undefined,
          action
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body available');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedContent = '';
      let currentThinkingBuffer = '';
      let isInThinkingMode = false;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                // Flush any remaining thinking buffer
                if (currentThinkingBuffer) {
                  accumulatedContent += `<thinking>${currentThinkingBuffer}</thinking>`;
                  currentThinkingBuffer = '';
                }

                // Track token usage on completion (client-side only)
                if (settings.ai.enableTokenTracking && accumulatedContent) {
                  const inputText = processedMessages.map((m: any) => m.content).join(' ');
                  const estimatedTokens = {
                    inputTokens: TokenTracker.estimateTokens(inputText),
                    outputTokens: TokenTracker.estimateTokens(accumulatedContent),
                    totalTokens: TokenTracker.estimateTokens(inputText + accumulatedContent)
                  };
                  TokenTracker.addUsage(settings.ai.defaultProvider, estimatedTokens);
                }

                // Save final assistant message to thread
                if (currentThread && accumulatedContent) {
                  const finalAssistantMessage: ChatMessage = {
                    id: assistantMessageId,
                    role: 'assistant',
                    content: accumulatedContent,
                    timestamp: new Date(),
                    sectionId: section.id,
                  };

                  try {
                    await conversationStorage.addMessage(currentThread.id, finalAssistantMessage);
                    loadThreadSummaries(); // Refresh summaries
                  } catch (error) {
                    console.error('Failed to save assistant message:', error);
                  }
                }

                setIsLoading(false);
                return;
              }
              
              try {
                const parsed = JSON.parse(data);
                console.log('📥 Received chunk:', parsed);
                
                if (parsed.type === 'thinking') {
                  console.log('🧠 Adding thinking content:', parsed.content);
                  // Accumulate thinking tokens into a buffer
                  if (!isInThinkingMode) {
                    isInThinkingMode = true;
                  }
                  currentThinkingBuffer += parsed.content;
                } else if (parsed.type === 'content') {
                  // If we were in thinking mode, flush the buffer first
                  if (isInThinkingMode && currentThinkingBuffer) {
                    accumulatedContent += `<thinking>${currentThinkingBuffer}</thinking>`;
                    currentThinkingBuffer = '';
                    isInThinkingMode = false;
                  }
                  console.log('📝 Adding regular content:', parsed.content);
                  accumulatedContent += parsed.content;
                } else if (parsed.type === 'token_usage') {
                  // Handle token usage data from server
                  console.log('📊 Received token usage:', parsed.usage);
                  if (settings.ai.enableTokenTracking && parsed.usage) {
                    TokenTracker.addUsage(settings.ai.defaultProvider, parsed.usage);
                  }
                } else if (parsed.content) {
                  // Fallback for old format
                  if (isInThinkingMode && currentThinkingBuffer) {
                    accumulatedContent += `<thinking>${currentThinkingBuffer}</thinking>`;
                    currentThinkingBuffer = '';
                    isInThinkingMode = false;
                  }
                  console.log('📥 Received legacy content chunk:', parsed.content.substring(0, 100));
                  accumulatedContent += parsed.content;
                } else if (parsed.error) {
                  throw new Error(parsed.error);
                }
                
                console.log('📚 Accumulated content length:', accumulatedContent.length);
                
                // Update the assistant message with accumulated content
                // Include the current thinking buffer in display
                const displayContent = isInThinkingMode && currentThinkingBuffer 
                  ? accumulatedContent + `<thinking>${currentThinkingBuffer}</thinking>`
                  : accumulatedContent;
                  
                onMessagesChange(prev => 
                  prev.map(msg => 
                    msg.id === assistantMessageId 
                      ? { ...msg, content: displayContent }
                      : msg
                  )
                );
              } catch (error) {
                console.error('Error parsing JSON:', error);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error: any) {
      console.error('💥 Chat error:', error);
      onMessagesChange(prev => 
        prev.map(msg => 
          msg.id === assistantMessageId 
            ? { 
                ...msg, 
                content: `ERROR: ${error.message}`,
                isError: true
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const formatAIResponse = (text: string) => {
    console.log('🔍 Formatting AI response:', { 
      originalText: text, 
      textLength: text.length,
      hasThinkingTags: text.includes('<thinking>'),
      hasClosingThinkingTags: text.includes('</thinking>')
    });

    // Handle complete thinking tags
    const thinkingMatches = text.match(/<thinking>([\s\S]*?)<\/thinking>/g);
    let thinkingContent = '';
    let mainContent = text;
    
    if (thinkingMatches) {
      console.log('📝 Found complete thinking matches:', thinkingMatches.length);
      thinkingContent = thinkingMatches.map(match => 
        match.replace(/<thinking>|<\/thinking>/g, '')
      ).join('\n\n').trim();
      mainContent = text.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
    }
    
    // Handle partial thinking tags (still streaming)
    const partialThinkingMatch = mainContent.match(/<thinking>([\s\S]*)$/);
    if (partialThinkingMatch && !mainContent.includes('</thinking>')) {
      console.log('🔄 Found partial thinking content:', partialThinkingMatch[1].substring(0, 100));
      thinkingContent += (thinkingContent ? '\n\n' : '') + partialThinkingMatch[1];
      mainContent = mainContent.replace(/<thinking>[\s\S]*$/, '').trim();
    }
    
    console.log('📊 Content breakdown:', {
      thinkingContentLength: thinkingContent.length,
      mainContentLength: mainContent.length,
      thinkingPreview: thinkingContent.substring(0, 100),
      mainPreview: mainContent.substring(0, 100)
    });
    
    return (
      <div>
        {settings.ai.showThinking && thinkingContent && (
          <div className="mb-3 border-l-4 border-red-600 pl-3 bg-red-50 rounded-r-lg">
            <button
              onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
              className="flex items-center space-x-2 py-2 text-sm text-red-700 hover:text-red-900 transition-colors w-full"
            >
              {isThinkingExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <span className="font-medium">Thinking</span>
            </button>

            {isThinkingExpanded && (
              <div className="pb-3 pr-3">
                <div className="text-sm text-red-800 whitespace-pre-wrap font-mono bg-white p-3 rounded border border-red-200">
                  {thinkingContent}
                </div>
              </div>
            )}
          </div>
        )}

        {mainContent && (
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Custom styling for markdown elements
                h1: ({ children }: any) => <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>,
                h2: ({ children }: any) => <h2 className="text-lg font-bold mt-3 mb-2">{children}</h2>,
                h3: ({ children }: any) => <h3 className="text-base font-bold mt-3 mb-2">{children}</h3>,
                p: ({ children }: any) => <p className="mb-3 leading-relaxed">{children}</p>,
                ul: ({ children }: any) => <ul className="list-disc list-inside mb-3 ml-4 space-y-1">{children}</ul>,
                ol: ({ children }: any) => <ol className="list-decimal list-inside mb-3 ml-4 space-y-1">{children}</ol>,
                li: ({ children }: any) => <li className="leading-relaxed">{children}</li>,
                strong: ({ children }: any) => <strong className="font-semibold">{children}</strong>,
                em: ({ children }: any) => <em className="italic">{children}</em>,
                code: ({ children }: any) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">{children}</code>,
                pre: ({ children }: any) => <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto mb-3">{children}</pre>,
                table: ({ children }: any) => <table className="min-w-full border-collapse border border-gray-300 mb-3">{children}</table>,
                thead: ({ children }: any) => <thead className="bg-gray-50">{children}</thead>,
                th: ({ children }: any) => <th className="border border-gray-300 px-3 py-2 text-left font-semibold">{children}</th>,
                td: ({ children }: any) => <td className="border border-gray-300 px-3 py-2">{children}</td>,
                blockquote: ({ children }: any) => <blockquote className="border-l-4 border-gray-300 pl-4 my-3 italic text-gray-700">{children}</blockquote>,
              }}
            >
              {mainContent}
            </ReactMarkdown>
          </div>
        )}
      </div>
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  if (!section) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <p>Select a chapter to start chatting</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="p-4 bg-white border-b">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <h3 className="font-medium">Chat about: {section.title}</h3>
            {currentThread && (
              <div className="text-sm text-gray-500">
                • {currentThread.title}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-sm text-gray-600">
              {settings.ai.defaultProvider} • {settings.ai.defaultModels[settings.ai.defaultProvider]}
            </div>
          </div>
        </div>

        {/* Thread Management */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowThreadSelector(!showThreadSelector)}
                className="flex items-center space-x-1"
              >
                <MessageSquare className="h-4 w-4" />
                <span>{currentThread ? currentThread.title : 'Select Thread'}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>

              {showThreadSelector && (
                <div className="absolute top-full left-0 mt-1 w-80 bg-white border rounded-lg shadow-lg z-10">
                  <div className="p-2 border-b">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">Conversation Threads</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsCreatingThread(true)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="max-h-60 overflow-y-auto">
                    {threadSummaries.map((summary) => (
                      <div
                        key={summary.id}
                        className={`p-3 hover:bg-gray-50 cursor-pointer border-b ${
                          currentThread?.id === summary.id ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => switchToThread(summary.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {summary.title}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {summary.messageCount} messages • {summary.updatedAt.toLocaleDateString()}
                            </div>
                            {summary.lastMessage && (
                              <div className="text-xs text-gray-400 truncate mt-1">
                                {summary.lastMessage.substring(0, 50)}...
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteThread(summary.id);
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {threadSummaries.length === 0 && (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        No conversations yet
                      </div>
                    )}
                  </div>

                  {isCreatingThread && (
                    <div className="p-3 border-t bg-gray-50">
                      <input
                        type="text"
                        placeholder="Thread title..."
                        value={newThreadTitle}
                        onChange={(e) => setNewThreadTitle(e.target.value)}
                        className="w-full px-3 py-2 text-sm border rounded mb-2"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            createNewThread();
                          }
                        }}
                        autoFocus
                      />
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={createNewThread}
                          disabled={!newThreadTitle.trim()}
                        >
                          Create
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsCreatingThread(false);
                            setNewThreadTitle('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreatingThread(true)}
              title="New Thread"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {currentThread && (
            <div className="text-xs text-gray-500">
              {currentThread.messageCount} messages
            </div>
          )}
        </div>

        <div className="flex space-x-2">
          {AI_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant="outline"
                size="sm"
                onClick={() => sendMessage('', action.id)}
                disabled={isLoading}
              >
                <Icon className="h-4 w-4 mr-1" />
                {action.name}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages
          .filter(m => m.sectionId === section.id)
          .map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`flex items-start space-x-2 max-w-3xl ${
                  message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                <div
                  className={`p-2 rounded-full ${
                    message.role === 'user' ? 'bg-blue-500' : 'bg-gray-600'
                  }`}
                >
                  {message.role === 'user' ? (
                    <User className="h-4 w-4 text-white" />
                  ) : (
                    <Bot className="h-4 w-4 text-white" />
                  )}
                </div>
                <div
                  className={`px-4 py-2 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-100 text-blue-900'
                      : message.isError
                      ? 'bg-red-50 border border-red-200'
                      : 'bg-white border'
                  }`}
                >
                  {message.isError ? (
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="text-red-800">
                        <p className="font-medium text-red-900 mb-1">Error</p>
                        <p className="text-sm whitespace-pre-wrap">{message.content.replace('ERROR: ', '')}</p>
                      </div>
                    </div>
                  ) : message.role === 'assistant' ? (
                    formatAIResponse(message.content)
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-full bg-gray-600">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="px-4 py-2 rounded-lg bg-white border">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 bg-white border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this chapter..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}