interface TokenUsage {
  date: string; // YYYY-MM-DD format
  openai: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  anthropic: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  ollama: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  totalInputTokens: number;
  totalOutputTokens: number;
  grandTotal: number;
}

interface TokenStats {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

const TOKEN_STORAGE_KEY = 'ai_token_usage';

export class TokenTracker {
  private static getToday(): string {
    return new Date().toISOString().split('T')[0];
  }

  private static getTodaysUsage(): TokenUsage {
    const today = this.getToday();

    // Check if we're in a browser environment
    if (typeof window === 'undefined' || !window.localStorage) {
      return this.createEmptyUsage(today);
    }

    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);

    if (!stored) {
      return this.createEmptyUsage(today);
    }

    try {
      const allUsage: Record<string, TokenUsage> = JSON.parse(stored);
      return allUsage[today] || this.createEmptyUsage(today);
    } catch (error) {
      console.error('Error parsing token usage data:', error);
      return this.createEmptyUsage(today);
    }
  }

  private static createEmptyUsage(date: string): TokenUsage {
    return {
      date,
      openai: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      anthropic: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      ollama: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      totalInputTokens: 0,
      totalOutputTokens: 0,
      grandTotal: 0
    };
  }

  private static saveUsage(usage: TokenUsage): void {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
      let allUsage: Record<string, TokenUsage> = {};

      if (stored) {
        allUsage = JSON.parse(stored);
      }

      allUsage[usage.date] = usage;

      // Keep only last 30 days of data to prevent excessive storage
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];

      Object.keys(allUsage).forEach(date => {
        if (date < cutoffDate) {
          delete allUsage[date];
        }
      });

      localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(allUsage));
    } catch (error) {
      console.error('Error saving token usage data:', error);
    }
  }

  static addUsage(provider: 'openai' | 'anthropic' | 'ollama', stats: TokenStats): void {
    const usage = this.getTodaysUsage();

    // Add to provider-specific stats
    usage[provider].inputTokens += stats.inputTokens;
    usage[provider].outputTokens += stats.outputTokens;
    usage[provider].totalTokens += stats.totalTokens;

    // Update totals
    usage.totalInputTokens = usage.openai.inputTokens + usage.anthropic.inputTokens + usage.ollama.inputTokens;
    usage.totalOutputTokens = usage.openai.outputTokens + usage.anthropic.outputTokens + usage.ollama.outputTokens;
    usage.grandTotal = usage.totalInputTokens + usage.totalOutputTokens;

    this.saveUsage(usage);
  }

  static getTodayStats(): TokenUsage {
    return this.getTodaysUsage();
  }

  static getRecentStats(days: number = 7): Record<string, TokenUsage> {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || !window.localStorage) {
      return {};
    }

    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!stored) return {};

    try {
      const allUsage: Record<string, TokenUsage> = JSON.parse(stored);
      const result: Record<string, TokenUsage> = {};

      const today = new Date();
      for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        if (allUsage[dateStr]) {
          result[dateStr] = allUsage[dateStr];
        }
      }

      return result;
    } catch (error) {
      console.error('Error getting recent stats:', error);
      return {};
    }
  }

  static estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for most models
    return Math.ceil(text.length / 4);
  }

  static resetTodayStats(): void {
    const today = this.getToday();
    const emptyUsage = this.createEmptyUsage(today);
    this.saveUsage(emptyUsage);
  }
}