import { ConversationThread, ConversationSummary, ConversationFilters, ConversationExportData, ConversationStats } from '@/types/conversations';
import { ChatMessage } from '@/types/document';
import { generateId } from '@/lib/utils';

const DB_NAME = 'ReaderConversations';
const DB_VERSION = 1;
const THREADS_STORE = 'threads';
const SUMMARIES_STORE = 'summaries';

class ConversationStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create conversation threads store (full data)
        if (!db.objectStoreNames.contains(THREADS_STORE)) {
          const threadsStore = db.createObjectStore(THREADS_STORE, { keyPath: 'id' });
          threadsStore.createIndex('bookId', 'bookId', { unique: false });
          threadsStore.createIndex('sectionId', 'sectionId', { unique: false });
          threadsStore.createIndex('userId', 'userId', { unique: false });
          threadsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          threadsStore.createIndex('bookSection', ['bookId', 'sectionId'], { unique: false });
          threadsStore.createIndex('userBookSection', ['userId', 'bookId', 'sectionId'], { unique: false });
        }

        // Create conversation summaries store (for fast listing)
        if (!db.objectStoreNames.contains(SUMMARIES_STORE)) {
          const summariesStore = db.createObjectStore(SUMMARIES_STORE, { keyPath: 'id' });
          summariesStore.createIndex('bookId', 'bookId', { unique: false });
          summariesStore.createIndex('sectionId', 'sectionId', { unique: false });
          summariesStore.createIndex('userId', 'userId', { unique: false });
          summariesStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          summariesStore.createIndex('bookSection', ['bookId', 'sectionId'], { unique: false });
        }
      };
    });
  }

  // Generate auto title from first message
  private generateAutoTitle(firstMessage: string, maxLength: number = 50): string {
    const cleaned = firstMessage.replace(/^\[Action:.*?\]/, '').trim();
    if (cleaned.length <= maxLength) return cleaned;
    return cleaned.substring(0, maxLength - 3) + '...';
  }

  // Create a new conversation thread
  async createThread(
    bookId: string,
    sectionId: string,
    title?: string,
    userId?: string
  ): Promise<ConversationThread> {
    if (!this.db) await this.init();

    const now = new Date();
    const thread: ConversationThread = {
      id: generateId(),
      title: title || 'New Conversation',
      bookId,
      sectionId,
      userId,
      createdAt: now,
      updatedAt: now,
      messages: [],
      isArchived: false,
      messageCount: 0
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([THREADS_STORE, SUMMARIES_STORE], 'readwrite');

      transaction.oncomplete = () => resolve(thread);
      transaction.onerror = () => reject(transaction.error);

      // Store full thread
      transaction.objectStore(THREADS_STORE).put(thread);

      // Store summary
      const summary: ConversationSummary = {
        id: thread.id,
        title: thread.title,
        bookId: thread.bookId,
        sectionId: thread.sectionId,
        userId: thread.userId,
        messageCount: 0,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
        isArchived: false,
        tags: thread.tags
      };
      transaction.objectStore(SUMMARIES_STORE).put(summary);
    });
  }

  // Add message to thread
  async addMessage(threadId: string, message: ChatMessage): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([THREADS_STORE, SUMMARIES_STORE], 'readwrite');

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      const threadsStore = transaction.objectStore(THREADS_STORE);
      const summariesStore = transaction.objectStore(SUMMARIES_STORE);

      const getRequest = threadsStore.get(threadId);

      getRequest.onsuccess = () => {
        const thread = getRequest.result as ConversationThread;
        if (!thread) {
          reject(new Error('Thread not found'));
          return;
        }

        // Add message to thread
        thread.messages.push(message);
        thread.messageCount = thread.messages.length;
        thread.updatedAt = new Date();

        // Auto-update title if it's the first user message and title is generic
        if (thread.messages.length === 1 &&
            message.role === 'user' &&
            (thread.title === 'New Conversation' || thread.title.startsWith('Thread'))) {
          thread.title = this.generateAutoTitle(message.content);
        }

        // Update full thread
        threadsStore.put(thread);

        // Update summary
        const summary: ConversationSummary = {
          id: thread.id,
          title: thread.title,
          bookId: thread.bookId,
          sectionId: thread.sectionId,
          userId: thread.userId,
          messageCount: thread.messageCount,
          lastMessage: message.content.substring(0, 100),
          lastMessageTimestamp: message.timestamp,
          createdAt: thread.createdAt,
          updatedAt: thread.updatedAt,
          isArchived: thread.isArchived,
          tags: thread.tags
        };
        summariesStore.put(summary);
      };
    });
  }

  // Get full thread with messages
  async getThread(threadId: string): Promise<ConversationThread | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([THREADS_STORE], 'readonly');
      const request = transaction.objectStore(THREADS_STORE).get(threadId);

      request.onsuccess = () => {
        const thread = request.result;
        if (thread) {
          // Convert date strings back to Date objects
          thread.createdAt = new Date(thread.createdAt);
          thread.updatedAt = new Date(thread.updatedAt);
          thread.messages = thread.messages.map((msg: ChatMessage) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
        }
        resolve(thread || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Get thread summaries (for listing)
  async getThreadSummaries(filters?: ConversationFilters): Promise<ConversationSummary[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([SUMMARIES_STORE], 'readonly');
      const store = transaction.objectStore(SUMMARIES_STORE);

      let request: IDBRequest;

      // Use appropriate index based on filters
      if (filters?.bookId && filters?.sectionId) {
        const index = store.index('bookSection');
        request = index.getAll([filters.bookId, filters.sectionId]);
      } else if (filters?.bookId) {
        const index = store.index('bookId');
        request = index.getAll(filters.bookId);
      } else if (filters?.sectionId) {
        const index = store.index('sectionId');
        request = index.getAll(filters.sectionId);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => {
        let summaries = request.result as ConversationSummary[];

        // Apply additional filters
        if (filters) {
          summaries = summaries.filter(summary => {
            if (filters.userId && summary.userId !== filters.userId) return false;
            if (filters.isArchived !== undefined && summary.isArchived !== filters.isArchived) return false;
            if (filters.search) {
              const searchLower = filters.search.toLowerCase();
              return summary.title.toLowerCase().includes(searchLower) ||
                     summary.lastMessage?.toLowerCase().includes(searchLower);
            }
            return true;
          });
        }

        // Sort by most recent activity
        summaries.sort((a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );

        // Convert date strings back to Date objects
        summaries = summaries.map(summary => ({
          ...summary,
          createdAt: new Date(summary.createdAt),
          updatedAt: new Date(summary.updatedAt),
          lastMessageTimestamp: summary.lastMessageTimestamp ?
            new Date(summary.lastMessageTimestamp) : undefined
        }));

        resolve(summaries);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Update thread metadata
  async updateThread(threadId: string, updates: Partial<ConversationThread>): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([THREADS_STORE, SUMMARIES_STORE], 'readwrite');

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      const threadsStore = transaction.objectStore(THREADS_STORE);
      const summariesStore = transaction.objectStore(SUMMARIES_STORE);

      const getRequest = threadsStore.get(threadId);

      getRequest.onsuccess = () => {
        const thread = getRequest.result as ConversationThread;
        if (!thread) {
          reject(new Error('Thread not found'));
          return;
        }

        // Apply updates
        Object.assign(thread, updates, { updatedAt: new Date() });

        threadsStore.put(thread);

        // Update summary if relevant fields changed
        if ('title' in updates || 'isArchived' in updates || 'tags' in updates) {
          const getSummaryRequest = summariesStore.get(threadId);
          getSummaryRequest.onsuccess = () => {
            const summary = getSummaryRequest.result as ConversationSummary;
            if (summary) {
              if ('title' in updates) summary.title = updates.title!;
              if ('isArchived' in updates) summary.isArchived = updates.isArchived!;
              if ('tags' in updates) summary.tags = updates.tags;
              summary.updatedAt = thread.updatedAt;
              summariesStore.put(summary);
            }
          };
        }
      };
    });
  }

  // Delete thread
  async deleteThread(threadId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([THREADS_STORE, SUMMARIES_STORE], 'readwrite');

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      transaction.objectStore(THREADS_STORE).delete(threadId);
      transaction.objectStore(SUMMARIES_STORE).delete(threadId);
    });
  }

  // Export conversations
  async exportConversations(filters?: ConversationFilters): Promise<ConversationExportData> {
    const summaries = await this.getThreadSummaries(filters);
    const threads: ConversationThread[] = [];

    for (const summary of summaries) {
      const thread = await this.getThread(summary.id);
      if (thread) threads.push(thread);
    }

    const now = new Date();
    const bookIds = [...new Set(threads.map(t => t.bookId))];
    const allMessages = threads.flatMap(t => t.messages);

    const dates = allMessages.map(m => m.timestamp);
    const earliest = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : now;
    const latest = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : now;

    return {
      version: '1.0.0',
      exportedAt: now,
      userId: filters?.userId,
      conversations: threads,
      metadata: {
        totalConversations: threads.length,
        totalMessages: allMessages.length,
        bookIds,
        dateRange: { earliest, latest }
      }
    };
  }

  // Import conversations
  async importConversations(data: ConversationExportData): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const thread of data.conversations) {
      try {
        await this.importSingleThread(thread);
        success++;
      } catch (error) {
        console.error('Failed to import thread:', thread.id, error);
        failed++;
      }
    }

    return { success, failed };
  }

  private async importSingleThread(thread: ConversationThread): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([THREADS_STORE, SUMMARIES_STORE], 'readwrite');

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      // Store full thread
      transaction.objectStore(THREADS_STORE).put(thread);

      // Create summary
      const summary: ConversationSummary = {
        id: thread.id,
        title: thread.title,
        bookId: thread.bookId,
        sectionId: thread.sectionId,
        userId: thread.userId,
        messageCount: thread.messageCount,
        lastMessage: thread.messages.length > 0 ?
          thread.messages[thread.messages.length - 1].content.substring(0, 100) : undefined,
        lastMessageTimestamp: thread.messages.length > 0 ?
          thread.messages[thread.messages.length - 1].timestamp : undefined,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
        isArchived: thread.isArchived,
        tags: thread.tags
      };
      transaction.objectStore(SUMMARIES_STORE).put(summary);
    });
  }

  // Get conversation statistics
  async getStats(filters?: ConversationFilters): Promise<ConversationStats> {
    const summaries = await this.getThreadSummaries(filters);
    const totalThreads = summaries.length;
    const totalMessages = summaries.reduce((sum, s) => sum + s.messageCount, 0);

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentSummaries = summaries.filter(s => s.updatedAt > oneWeekAgo);
    const threadsThisWeek = recentSummaries.length;
    const messagesThisWeek = recentSummaries.reduce((sum, s) => sum + s.messageCount, 0);

    const averageMessagesPerThread = totalThreads > 0 ? totalMessages / totalThreads : 0;

    // Find most active section
    const sectionCounts = new Map<string, number>();
    summaries.forEach(s => {
      const current = sectionCounts.get(s.sectionId) || 0;
      sectionCounts.set(s.sectionId, current + 1);
    });

    let mostActiveSection = null;
    if (sectionCounts.size > 0) {
      const [sectionId, threadCount] = [...sectionCounts.entries()]
        .sort(([,a], [,b]) => b - a)[0];
      mostActiveSection = {
        sectionId,
        sectionTitle: `Section ${sectionId}`, // Would need to lookup actual title
        threadCount
      };
    }

    return {
      totalThreads,
      totalMessages,
      threadsThisWeek,
      messagesThisWeek,
      averageMessagesPerThread,
      mostActiveSection
    };
  }

  // Clear all conversations
  async clearAll(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([THREADS_STORE, SUMMARIES_STORE], 'readwrite');

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      transaction.objectStore(THREADS_STORE).clear();
      transaction.objectStore(SUMMARIES_STORE).clear();
    });
  }
}

export const conversationStorage = new ConversationStorage();