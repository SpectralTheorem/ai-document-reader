import { AppSettings, DEFAULT_SETTINGS } from '@/types/settings';

const SETTINGS_STORAGE_KEY = 'reader_app_settings';

export class SettingsStorage {
  private static isClient(): boolean {
    return typeof window !== 'undefined' && window.localStorage;
  }

  private static encrypt(text: string): string {
    // Simple base64 encoding for basic obfuscation
    // In production, use proper encryption
    return btoa(text);
  }

  private static decrypt(encrypted: string): string {
    try {
      return atob(encrypted);
    } catch {
      return encrypted; // Return as-is if not encrypted
    }
  }

  static getSettings(): AppSettings {
    if (!this.isClient()) {
      return { ...DEFAULT_SETTINGS };
    }

    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!stored) {
        return { ...DEFAULT_SETTINGS };
      }

      const parsed = JSON.parse(stored);

      // Merge with defaults to handle new settings added in updates
      const settings = this.mergeWithDefaults(parsed);

      // Decrypt API keys
      if (settings.ai.apiKeys.openai) {
        settings.ai.apiKeys.openai = this.decrypt(settings.ai.apiKeys.openai);
      }
      if (settings.ai.apiKeys.anthropic) {
        settings.ai.apiKeys.anthropic = this.decrypt(settings.ai.apiKeys.anthropic);
      }

      return settings;
    } catch (error) {
      console.error('Error loading settings:', error);
      return { ...DEFAULT_SETTINGS };
    }
  }

  static saveSettings(settings: AppSettings): void {
    if (!this.isClient()) {
      return;
    }

    try {
      // Create a copy to avoid mutating the original
      const settingsToSave = JSON.parse(JSON.stringify(settings));

      // Encrypt API keys before saving
      if (settingsToSave.ai.apiKeys.openai) {
        settingsToSave.ai.apiKeys.openai = this.encrypt(settingsToSave.ai.apiKeys.openai);
      }
      if (settingsToSave.ai.apiKeys.anthropic) {
        settingsToSave.ai.apiKeys.anthropic = this.encrypt(settingsToSave.ai.apiKeys.anthropic);
      }

      settingsToSave.lastUpdated = new Date();
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settingsToSave));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  static updateSetting<T extends keyof AppSettings>(
    category: T,
    key: keyof AppSettings[T],
    value: any
  ): void {
    const settings = this.getSettings();
    (settings[category] as any)[key] = value;
    this.saveSettings(settings);
  }

  static updateAISetting<T extends keyof AppSettings['ai']>(
    key: T,
    value: AppSettings['ai'][T]
  ): void {
    this.updateSetting('ai', key, value);
  }

  static updateReadingSetting<T extends keyof AppSettings['reading']>(
    key: T,
    value: AppSettings['reading'][T]
  ): void {
    this.updateSetting('reading', key, value);
  }

  static updateInterfaceSetting<T extends keyof AppSettings['interface']>(
    key: T,
    value: AppSettings['interface'][T]
  ): void {
    this.updateSetting('interface', key, value);
  }

  static updateDataSetting<T extends keyof AppSettings['data']>(
    key: T,
    value: AppSettings['data'][T]
  ): void {
    this.updateSetting('data', key, value);
  }

  private static mergeWithDefaults(stored: any): AppSettings {
    const merged = { ...DEFAULT_SETTINGS };

    // Deep merge each category
    if (stored.ai) {
      merged.ai = { ...DEFAULT_SETTINGS.ai, ...stored.ai };
      if (stored.ai.defaultModels) {
        merged.ai.defaultModels = { ...DEFAULT_SETTINGS.ai.defaultModels, ...stored.ai.defaultModels };
      }
      if (stored.ai.apiKeys) {
        merged.ai.apiKeys = { ...DEFAULT_SETTINGS.ai.apiKeys, ...stored.ai.apiKeys };
      }
    }

    if (stored.reading) {
      merged.reading = { ...DEFAULT_SETTINGS.reading, ...stored.reading };
    }

    if (stored.interface) {
      merged.interface = { ...DEFAULT_SETTINGS.interface, ...stored.interface };
    }

    if (stored.data) {
      merged.data = { ...DEFAULT_SETTINGS.data, ...stored.data };
    }

    // Preserve version and timestamp if they exist
    if (stored.version) merged.version = stored.version;
    if (stored.lastUpdated) merged.lastUpdated = new Date(stored.lastUpdated);

    return merged;
  }

  static resetSettings(): void {
    if (!this.isClient()) {
      return;
    }

    localStorage.removeItem(SETTINGS_STORAGE_KEY);
  }

  static exportSettings(): string {
    const settings = this.getSettings();

    // Remove sensitive data for export
    const exportData = {
      ...settings,
      ai: {
        ...settings.ai,
        apiKeys: {} // Don't export API keys
      }
    };

    return JSON.stringify(exportData, null, 2);
  }

  static importSettings(settingsJson: string): boolean {
    try {
      const importedSettings = JSON.parse(settingsJson);
      const validatedSettings = this.mergeWithDefaults(importedSettings);
      this.saveSettings(validatedSettings);
      return true;
    } catch (error) {
      console.error('Error importing settings:', error);
      return false;
    }
  }

  static clearAllData(): void {
    if (!this.isClient()) {
      return;
    }

    // Clear settings
    this.resetSettings();

    // Clear token usage data
    localStorage.removeItem('ai_token_usage');

    // Clear any other app-related localStorage items
    const keysToRemove = Object.keys(localStorage).filter(key =>
      key.startsWith('reader_') || key.startsWith('ai_')
    );

    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  static getAPIKey(provider: 'openai' | 'anthropic'): string | undefined {
    const settings = this.getSettings();
    return settings.ai.apiKeys[provider];
  }

  static setAPIKey(provider: 'openai' | 'anthropic', key: string): void {
    const settings = this.getSettings();
    settings.ai.apiKeys[provider] = key;
    this.saveSettings(settings);
  }

  static removeAPIKey(provider: 'openai' | 'anthropic'): void {
    const settings = this.getSettings();
    delete settings.ai.apiKeys[provider];
    this.saveSettings(settings);
  }

  static hasAPIKey(provider: 'openai' | 'anthropic'): boolean {
    const key = this.getAPIKey(provider);
    return !!(key && key.trim());
  }
}

// React hook for settings
import { useState, useEffect } from 'react';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load settings on mount
    const loadedSettings = SettingsStorage.getSettings();
    setSettings(loadedSettings);
    setIsLoading(false);
  }, []);

  const updateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    SettingsStorage.saveSettings(newSettings);
  };

  const updateCategory = <T extends keyof AppSettings>(
    category: T,
    updates: Partial<AppSettings[T]>
  ) => {
    const newSettings = {
      ...settings,
      [category]: {
        ...settings[category],
        ...updates
      }
    };
    updateSettings(newSettings);
  };

  return {
    settings,
    isLoading,
    updateSettings,
    updateCategory,
    resetSettings: () => {
      SettingsStorage.resetSettings();
      setSettings(DEFAULT_SETTINGS);
    },
    exportSettings: SettingsStorage.exportSettings,
    importSettings: (json: string) => {
      const success = SettingsStorage.importSettings(json);
      if (success) {
        setSettings(SettingsStorage.getSettings());
      }
      return success;
    }
  };
}

export default SettingsStorage;