// Simple debug settings for multi-agent orchestration control

export interface DebugSettings {
  // Token management
  tokenLimitPerAgent: number; // 25k - 150k, default 75k
  maxSections: number; // 5-50, default 20

  // Agent selection
  enabledAgents: {
    bookSearch: boolean;
    evidence: boolean;
    analysis: boolean;
    context: boolean;
  };

  // Research mode
  researchMode: 'quick' | 'full';
}

export const DEFAULT_DEBUG_SETTINGS: DebugSettings = {
  tokenLimitPerAgent: 75000,
  maxSections: 20,
  enabledAgents: {
    bookSearch: true,
    evidence: true,
    analysis: true,
    context: true
  },
  researchMode: 'full'
};

// Settings validation
export function validateDebugSettings(settings: Partial<DebugSettings>): DebugSettings {
  return {
    tokenLimitPerAgent: Math.min(150000, Math.max(25000, settings.tokenLimitPerAgent || DEFAULT_DEBUG_SETTINGS.tokenLimitPerAgent)),
    maxSections: Math.min(50, Math.max(5, settings.maxSections || DEFAULT_DEBUG_SETTINGS.maxSections)),
    enabledAgents: {
      bookSearch: settings.enabledAgents?.bookSearch ?? DEFAULT_DEBUG_SETTINGS.enabledAgents.bookSearch,
      evidence: settings.enabledAgents?.evidence ?? DEFAULT_DEBUG_SETTINGS.enabledAgents.evidence,
      analysis: settings.enabledAgents?.analysis ?? DEFAULT_DEBUG_SETTINGS.enabledAgents.analysis,
      context: settings.enabledAgents?.context ?? DEFAULT_DEBUG_SETTINGS.enabledAgents.context
    },
    researchMode: settings.researchMode || DEFAULT_DEBUG_SETTINGS.researchMode
  };
}

// Settings persistence helpers
export const SETTINGS_STORAGE_KEY = 'debug-settings';

export function saveDebugSettings(settings: DebugSettings): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }
}

export function loadDebugSettings(): DebugSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_DEBUG_SETTINGS;
  }

  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return validateDebugSettings(parsed);
    }
  } catch (error) {
    console.warn('Failed to load debug settings from localStorage:', error);
  }

  return DEFAULT_DEBUG_SETTINGS;
}

export function exportDebugSettings(settings: DebugSettings): string {
  return JSON.stringify(settings, null, 2);
}

export function importDebugSettings(jsonString: string): DebugSettings {
  try {
    const parsed = JSON.parse(jsonString);
    return validateDebugSettings(parsed);
  } catch (error) {
    throw new Error('Invalid JSON format for debug settings');
  }
}