'use client';

import { useState } from 'react';
import { ParsedDocument, Section, ChatMessage } from '@/types/document';
import { ChapterList } from '@/components/ChapterList';
import { ReaderPane } from '@/components/ReaderPane';
import { ChatInterface } from '@/components/ChatInterface';
import { Button } from '@/components/ui/button';
import { X, BookOpen, MessageCircle, AlertTriangle } from 'lucide-react';

interface ReaderLayoutProps {
  document: ParsedDocument;
  fileName: string;
  onReset: () => void;
}

export function ReaderLayout({ document, fileName, onReset }: ReaderLayoutProps) {
  // Debug logging
  console.log('📖 ReaderLayout received document:', {
    hasDocument: !!document,
    hasSections: !!document?.sections,
    sectionsLength: document?.sections?.length || 0,
    metadata: document?.metadata
  });

  const [selectedSection, setSelectedSection] = useState<Section | null>(
    document?.sections?.[0] || null
  );
  const [viewMode, setViewMode] = useState<'read' | 'chat'>('read');
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Safety check - if document is malformed, show error
  if (!document || !document.sections || document.sections.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <AlertTriangle className="h-12 w-12 mx-auto mb-2" />
            <p className="text-lg font-medium">Document Error</p>
          </div>
          <p className="text-gray-600 mb-4">
            The document failed to load properly. No sections were found.
          </p>
          <Button onClick={onReset} variant="outline">
            Try Another File
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="border-b px-4 py-3 flex items-center justify-between bg-white">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold truncate max-w-md">
            {document.metadata.title}
          </h1>
          {document.metadata.author && (
            <span className="text-sm text-gray-500">by {document.metadata.author}</span>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onReset}>
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-80 border-r bg-gray-50 overflow-y-auto">
          <ChapterList
            sections={document.sections}
            selectedSection={selectedSection}
            onSelectSection={setSelectedSection}
          />
        </aside>

        <main className="flex-1 flex flex-col">
          <div className="border-b px-4 py-2 flex items-center space-x-2 bg-white">
            <Button
              variant={viewMode === 'read' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('read')}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Read
            </Button>
            <Button
              variant={viewMode === 'chat' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('chat')}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Chat
            </Button>
          </div>

          <div className="flex-1 overflow-hidden">
            {viewMode === 'read' ? (
              <ReaderPane section={selectedSection} />
            ) : (
              <ChatInterface
                section={selectedSection}
                messages={messages}
                onMessagesChange={setMessages}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}