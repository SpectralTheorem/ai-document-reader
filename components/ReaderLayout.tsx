'use client';

import { useState, useEffect } from 'react';
import { ParsedDocument, Section, ChatMessage } from '@/types/document';
import { ChapterList } from '@/components/ChapterList';
import { ReaderPane } from '@/components/ReaderPane';
import { ChatInterface } from '@/components/ChatInterface';
import { Button } from '@/components/ui/button';
import { X, BookOpen, MessageCircle, AlertTriangle, ChevronLeft, ChevronRight, Columns2, Maximize2, Settings, Library, User, Calendar } from 'lucide-react';
import { SettingsModal } from '@/components/SettingsModal';
import { useSettings } from '@/lib/settings-storage';
import { LibraryBook } from '@/types/library';

interface ReaderLayoutProps {
  document: ParsedDocument;
  fileName: string;
  currentBook?: LibraryBook | null;
  onGoToLibrary: () => void;
}

export function ReaderLayout({ document, fileName, currentBook, onGoToLibrary }: ReaderLayoutProps) {
  const { settings } = useSettings();

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
  const [viewMode, setViewMode] = useState<'read' | 'chat' | 'side-by-side'>(settings.interface.defaultViewMode);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(settings.interface.sidebarCollapsed);
  const [showSettings, setShowSettings] = useState(false);

  // Update view mode when settings change
  useEffect(() => {
    setViewMode(settings.interface.defaultViewMode);
  }, [settings.interface.defaultViewMode]);

  // Update sidebar state when settings change
  useEffect(() => {
    setSidebarCollapsed(settings.interface.sidebarCollapsed);
  }, [settings.interface.sidebarCollapsed]);

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
          <Button onClick={onGoToLibrary} variant="outline">
            Back to Library
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button onClick={onGoToLibrary} variant="ghost" size="sm">
            <Library className="h-4 w-4 mr-2" />
            Library
          </Button>

          {currentBook && (
            <div className="border-l pl-4">
              <h1 className="text-lg font-medium text-gray-900 truncate max-w-md">
                {currentBook.title}
              </h1>
              {currentBook.author && (
                <p className="text-sm text-gray-600 flex items-center">
                  <User className="h-3 w-3 mr-1" />
                  {currentBook.author}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="text-sm text-gray-500">
          {document.sections?.length || 0} chapters
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Chapter Navigation Sidebar */}
        <aside
          className={`${
            sidebarCollapsed ? 'w-12' : 'w-80'
          } border-r bg-white overflow-hidden transition-all duration-300 ease-in-out`}
        >
          <div className="h-full flex flex-col">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                {!sidebarCollapsed && (
                  <h2 className="font-medium text-gray-900">Chapters</h2>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="h-8 w-8"
                >
                  {sidebarCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronLeft className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {!sidebarCollapsed && (
              <div className="flex-1 overflow-y-auto">
                <ChapterList
                  sections={document.sections}
                  selectedSection={selectedSection}
                  onSelectSection={setSelectedSection}
                />
              </div>
            )}

            {/* Settings Button */}
            <div className="p-4 border-t">
              <Button
                variant="ghost"
                size={sidebarCollapsed ? 'icon' : 'sm'}
                onClick={() => setShowSettings(true)}
                className={sidebarCollapsed ? 'w-8 h-8' : 'w-full justify-start'}
                title="Settings"
              >
                <Settings className="h-4 w-4" />
                {!sidebarCollapsed && <span className="ml-2">Settings</span>}
              </Button>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col">
          {/* View Mode Controls */}
          <div className="border-b px-4 py-2 flex items-center justify-between bg-white">
            <div className="flex items-center space-x-2">
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
              <Button
                variant={viewMode === 'side-by-side' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('side-by-side')}
              >
                <Columns2 className="h-4 w-4 mr-2" />
                Side-by-Side
              </Button>
            </div>

            {selectedSection && (
              <div className="text-sm text-gray-600 truncate max-w-md">
                {selectedSection.title}
              </div>
            )}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            {viewMode === 'read' ? (
              <ReaderPane section={selectedSection} />
            ) : viewMode === 'chat' ? (
              <ChatInterface
                section={selectedSection}
                bookId={currentBook?.id || fileName}
                messages={messages}
                onMessagesChange={setMessages}
              />
            ) : (
              /* Side-by-Side View */
              <div className="h-full flex">
                <div className="flex-1 border-r">
                  <ReaderPane section={selectedSection} />
                </div>
                <div className="flex-1">
                  <ChatInterface
                    section={selectedSection}
                    bookId={currentBook?.id || fileName}
                    messages={messages}
                    onMessagesChange={setMessages}
                  />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Settings Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}