import { ChatMessage } from './document';

export interface ConversationThread {
  id: string;
  title: string;
  bookId: string;
  sectionId: string;
  userId?: string; // For future multi-user support
  createdAt: Date;
  updatedAt: Date;
  messages: ChatMessage[];
  isArchived: boolean;
  tags?: string[];
  messageCount: number; // Cached for performance
}

export interface ConversationSummary {
  id: string;
  title: string;
  bookId: string;
  sectionId: string;
  userId?: string;
  messageCount: number;
  lastMessage?: string;
  lastMessageTimestamp?: Date;
  createdAt: Date;
  updatedAt: Date;
  isArchived: boolean;
  tags?: string[];
}

export interface ConversationFilters {
  bookId?: string;
  sectionId?: string;
  userId?: string;
  isArchived?: boolean;
  tags?: string[];
  search?: string;
}

export interface ConversationExportData {
  version: string;
  exportedAt: Date;
  userId?: string;
  conversations: ConversationThread[];
  metadata: {
    totalConversations: number;
    totalMessages: number;
    bookIds: string[];
    dateRange: {
      earliest: Date;
      latest: Date;
    };
  };
}

export interface ConversationSettings {
  retainConversations: boolean;
  maxConversationsPerSection: number;
  autoArchiveAfterDays: number;
  exportIncludeArchived: boolean;
  defaultThreadNaming: 'auto' | 'manual';
  autoSaveInterval: number; // milliseconds
}

// Default conversation settings
export const DEFAULT_CONVERSATION_SETTINGS: ConversationSettings = {
  retainConversations: true,
  maxConversationsPerSection: 10,
  autoArchiveAfterDays: 90,
  exportIncludeArchived: false,
  defaultThreadNaming: 'auto',
  autoSaveInterval: 5000 // 5 seconds
};

// Utility types for UI components
export interface ThreadListItem {
  id: string;
  title: string;
  messageCount: number;
  lastActivity: Date;
  isActive: boolean;
  isArchived: boolean;
}

export interface ConversationStats {
  totalThreads: number;
  totalMessages: number;
  threadsThisWeek: number;
  messagesThisWeek: number;
  averageMessagesPerThread: number;
  mostActiveSection: {
    sectionId: string;
    sectionTitle: string;
    threadCount: number;
  } | null;
}