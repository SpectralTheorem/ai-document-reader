'use client';

import { useState, useRef, useEffect } from 'react';
import { Section, ChatMessage } from '@/types/document';
import { Button } from '@/components/ui/button';
import { Send, Bot, User, Sparkles, List, HelpCircle, Lightbulb, FileSearch } from 'lucide-react';
import { generateId } from '@/lib/utils';

interface ChatInterfaceProps {
  section: Section | null;
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

export function ChatInterface({ section, messages, onMessagesChange }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState<'ollama' | 'openai' | 'anthropic'>('ollama');
  const [model, setModel] = useState('llama2');
  const [apiKey, setApiKey] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (content: string, action?: string) => {
    if (!section || (!content.trim() && !action)) return;

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

    try {
      const contextMessage = {
        role: 'system',
        content: `You are helping analyze the following chapter from a book. Chapter title: "${section.title}". Chapter content: ${section.content?.substring(0, 3000)}...`
      };

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            contextMessage,
            ...updatedMessages.map(m => ({
              role: m.role,
              content: m.content
            }))
          ],
          provider,
          model,
          apiKey: provider !== 'ollama' ? apiKey : undefined,
          action
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
        sectionId: section.id,
      };

      onMessagesChange([...updatedMessages, assistantMessage]);
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: `Error: ${error.message}. Make sure Ollama is running locally or provide valid API credentials.`,
        timestamp: new Date(),
        sectionId: section.id,
      };
      onMessagesChange([...updatedMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
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
          <h3 className="font-medium">Chat about: {section.title}</h3>
          <div className="flex items-center space-x-2">
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as any)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="ollama">Ollama (Local)</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
            {provider === 'ollama' ? (
              <input
                type="text"
                placeholder="Model name"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="text-sm border rounded px-2 py-1 w-32"
              />
            ) : (
              <input
                type="password"
                placeholder="API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="text-sm border rounded px-2 py-1 w-32"
              />
            )}
          </div>
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
                      : 'bg-white border'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
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