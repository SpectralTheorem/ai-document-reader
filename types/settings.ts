import { ConversationSettings } from './conversations';

export interface AISettings {
  defaultProvider: 'ollama' | 'openai' | 'anthropic';
  defaultModels: {
    ollama: string;
    openai: string;
    anthropic: string;
  };
  apiKeys: {
    openai?: string;
    anthropic?: string;
  };
  enableTokenTracking: boolean;
  showThinking: boolean;
}

export interface ReadingSettings {
  fontFamily: 'georgia' | 'times' | 'arial' | 'system';
  fontSize: number; // 14-24px
  lineHeight: number; // 1.4-2.2
  textColor: string;
  backgroundColor: string;
  theme: 'light' | 'dark' | 'sepia';
  maxWidth: string;
  padding: string;
  textJustify: boolean;
  marginTop: number;
  marginBottom: number;
}

export interface InterfaceSettings {
  defaultViewMode: 'read' | 'chat' | 'side-by-side';
  sidebarCollapsed: boolean;
  autoScroll: boolean;
  autoSaveProgress: boolean;
  compactMode: boolean;
}

export interface DataSettings {
  retainChatHistory: boolean;
  retainReadingProgress: boolean;
  enableAnalytics: boolean;
  autoBackup: boolean;
}

export interface AppSettings {
  ai: AISettings;
  reading: ReadingSettings;
  interface: InterfaceSettings;
  data: DataSettings;
  conversations: ConversationSettings;
  version: string;
  lastUpdated: Date;
}

export interface SettingsCategory {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  description: string;
}

export interface SettingItem {
  id: string;
  label: string;
  description?: string;
  type: 'toggle' | 'select' | 'slider' | 'input' | 'color' | 'button';
  value: any;
  options?: { label: string; value: any }[];
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  onChange: (value: any) => void;
  disabled?: boolean;
}

// Default settings
export const DEFAULT_SETTINGS: AppSettings = {
  ai: {
    defaultProvider: 'ollama',
    defaultModels: {
      ollama: 'gpt-oss',
      openai: 'gpt-5',
      anthropic: 'claude-3-5-sonnet-20241022'
    },
    apiKeys: {},
    enableTokenTracking: true,
    showThinking: true
  },
  reading: {
    fontFamily: 'georgia',
    fontSize: 18,
    lineHeight: 1.8,
    textColor: '#374151',
    backgroundColor: '#ffffff',
    theme: 'light',
    maxWidth: '4xl',
    padding: '8',
    textJustify: false,
    marginTop: 12,
    marginBottom: 8
  },
  interface: {
    defaultViewMode: 'read',
    sidebarCollapsed: false,
    autoScroll: true,
    autoSaveProgress: true,
    compactMode: false
  },
  data: {
    retainChatHistory: true,
    retainReadingProgress: true,
    enableAnalytics: false,
    autoBackup: false
  },
  conversations: {
    retainConversations: true,
    maxConversationsPerSection: 10,
    autoArchiveAfterDays: 90,
    exportIncludeArchived: false,
    defaultThreadNaming: 'auto',
    autoSaveInterval: 5000
  },
  version: '1.0.0',
  lastUpdated: new Date()
};

// Theme configurations
export const THEME_CONFIGS = {
  light: {
    textColor: '#374151',
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    secondaryColor: '#6b7280'
  },
  dark: {
    textColor: '#f9fafb',
    backgroundColor: '#1f2937',
    borderColor: '#374151',
    secondaryColor: '#9ca3af'
  },
  sepia: {
    textColor: '#3c2415',
    backgroundColor: '#fefbf3',
    borderColor: '#e7dcc8',
    secondaryColor: '#8b6914'
  }
};

// Font configurations
export const FONT_CONFIGS = {
  georgia: {
    family: "'Georgia', 'Times New Roman', serif",
    label: 'Georgia (Serif)'
  },
  times: {
    family: "'Times New Roman', serif",
    label: 'Times New Roman'
  },
  arial: {
    family: "'Arial', sans-serif",
    label: 'Arial (Sans-serif)'
  },
  system: {
    family: "system-ui, -apple-system, sans-serif",
    label: 'System Font'
  }
};