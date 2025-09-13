'use client';

import { useState } from 'react';
import { useSettings } from '@/lib/settings-storage';
import { TokenTracker } from '@/lib/token-tracker';
import { Button } from '@/components/ui/button';
import {
  X,
  Bot,
  BookOpen,
  Monitor,
  Database,
  Eye,
  EyeOff,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  Check,
  AlertTriangle
} from 'lucide-react';
import { THEME_CONFIGS, FONT_CONFIGS } from '@/types/settings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = 'ai' | 'reading' | 'interface' | 'data';

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, updateCategory, resetSettings, exportSettings, importSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<SettingsTab>('ai');
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [apiKeyInputs, setApiKeyInputs] = useState({
    openai: settings.ai.apiKeys.openai || '',
    anthropic: settings.ai.apiKeys.anthropic || ''
  });
  const [importData, setImportData] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [tokenUsage, setTokenUsage] = useState(TokenTracker.getTodayStats());

  // Refresh token usage
  const refreshTokenUsage = () => {
    setTokenUsage(TokenTracker.getTodayStats());
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'ai' as SettingsTab, label: 'AI & Chat', icon: Bot },
    { id: 'reading' as SettingsTab, label: 'Reading', icon: BookOpen },
    { id: 'interface' as SettingsTab, label: 'Interface', icon: Monitor },
    { id: 'data' as SettingsTab, label: 'Data', icon: Database }
  ];

  const toggleApiKeyVisibility = (provider: string) => {
    setShowApiKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const handleApiKeyChange = (provider: 'openai' | 'anthropic', value: string) => {
    setApiKeyInputs(prev => ({ ...prev, [provider]: value }));
    updateCategory('ai', {
      ...settings.ai,
      apiKeys: { ...settings.ai.apiKeys, [provider]: value }
    });
  };

  const handleExportSettings = () => {
    const data = exportSettings();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reader-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportSettings = () => {
    if (importData.trim()) {
      const success = importSettings(importData);
      if (success) {
        setImportData('');
        setShowImportModal(false);
        // Refresh the page to apply new settings
        window.location.reload();
      } else {
        alert('Failed to import settings. Please check the file format.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-xl">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Settings</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex">
          {/* Sidebar */}
          <div className="w-64 border-r bg-gray-50">
            <nav className="p-4 space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto max-h-[calc(90vh-88px)]">
            {activeTab === 'ai' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">AI Provider Settings</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Default Provider</label>
                      <select
                        value={settings.ai.defaultProvider}
                        onChange={(e) => updateCategory('ai', {
                          ...settings.ai,
                          defaultProvider: e.target.value as any
                        })}
                        className="w-full border rounded px-3 py-2"
                      >
                        <option value="ollama">Ollama (Local)</option>
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic</option>
                      </select>
                    </div>

                    {/* API Keys */}
                    <div className="space-y-3">
                      <h4 className="font-medium">API Keys</h4>

                      {/* OpenAI */}
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">OpenAI API Key</label>
                        <div className="flex space-x-2">
                          <div className="flex-1 relative">
                            <input
                              type={showApiKeys.openai ? 'text' : 'password'}
                              value={apiKeyInputs.openai}
                              onChange={(e) => handleApiKeyChange('openai', e.target.value)}
                              placeholder="sk-..."
                              className="w-full border rounded px-3 py-2 pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
                              onClick={() => toggleApiKeyVisibility('openai')}
                            >
                              {showApiKeys.openai ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                          {apiKeyInputs.openai && (
                            <div className="flex items-center">
                              <Check className="h-4 w-4 text-green-600" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Anthropic */}
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Anthropic API Key</label>
                        <div className="flex space-x-2">
                          <div className="flex-1 relative">
                            <input
                              type={showApiKeys.anthropic ? 'text' : 'password'}
                              value={apiKeyInputs.anthropic}
                              onChange={(e) => handleApiKeyChange('anthropic', e.target.value)}
                              placeholder="sk-ant-..."
                              className="w-full border rounded px-3 py-2 pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
                              onClick={() => toggleApiKeyVisibility('anthropic')}
                            >
                              {showApiKeys.anthropic ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                          {apiKeyInputs.anthropic && (
                            <div className="flex items-center">
                              <Check className="h-4 w-4 text-green-600" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Default Models */}
                    <div className="space-y-3">
                      <h4 className="font-medium">Default Models</h4>

                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Ollama Model</label>
                        <input
                          type="text"
                          value={settings.ai.defaultModels.ollama}
                          onChange={(e) => updateCategory('ai', {
                            ...settings.ai,
                            defaultModels: { ...settings.ai.defaultModels, ollama: e.target.value }
                          })}
                          className="w-full border rounded px-3 py-2"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-gray-600 mb-1">OpenAI Model</label>
                        <select
                          value={settings.ai.defaultModels.openai}
                          onChange={(e) => updateCategory('ai', {
                            ...settings.ai,
                            defaultModels: { ...settings.ai.defaultModels, openai: e.target.value }
                          })}
                          className="w-full border rounded px-3 py-2"
                        >
                          <option value="gpt-5">GPT-5</option>
                          <option value="o3">O3</option>
                          <option value="gpt-5-mini">GPT-5 Mini</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Anthropic Model</label>
                        <select
                          value={settings.ai.defaultModels.anthropic}
                          onChange={(e) => updateCategory('ai', {
                            ...settings.ai,
                            defaultModels: { ...settings.ai.defaultModels, anthropic: e.target.value }
                          })}
                          className="w-full border rounded px-3 py-2"
                        >
                          <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                          <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                          <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                        </select>
                      </div>
                    </div>

                    {/* Toggles */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Enable Token Tracking</span>
                        <input
                          type="checkbox"
                          checked={settings.ai.enableTokenTracking}
                          onChange={(e) => updateCategory('ai', {
                            ...settings.ai,
                            enableTokenTracking: e.target.checked
                          })}
                          className="rounded"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Show Thinking Process</span>
                        <input
                          type="checkbox"
                          checked={settings.ai.showThinking}
                          onChange={(e) => updateCategory('ai', {
                            ...settings.ai,
                            showThinking: e.target.checked
                          })}
                          className="rounded"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Token Usage Section */}
                {settings.ai.enableTokenTracking && (
                  <div className="border-t pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium">Token Usage</h3>
                      <Button variant="outline" size="sm" onClick={refreshTokenUsage}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Refresh
                      </Button>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Today's Total</span>
                        <span className="text-lg font-semibold">{tokenUsage.grandTotal.toLocaleString()}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Input:</span>
                          <span className="ml-2 font-medium">{tokenUsage.totalInputTokens.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Output:</span>
                          <span className="ml-2 font-medium">{tokenUsage.totalOutputTokens.toLocaleString()}</span>
                        </div>
                      </div>

                      {tokenUsage.grandTotal > 0 && (
                        <div className="border-t pt-3 space-y-1">
                          {tokenUsage.openai.totalTokens > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">OpenAI:</span>
                              <span>{tokenUsage.openai.totalTokens.toLocaleString()}</span>
                            </div>
                          )}
                          {tokenUsage.anthropic.totalTokens > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Anthropic:</span>
                              <span>{tokenUsage.anthropic.totalTokens.toLocaleString()}</span>
                            </div>
                          )}
                          {tokenUsage.ollama.totalTokens > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Ollama:</span>
                              <span>{tokenUsage.ollama.totalTokens.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            TokenTracker.resetTodayStats();
                            refreshTokenUsage();
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Reset Today's Usage
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'reading' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Reading Experience</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Theme</label>
                      <select
                        value={settings.reading.theme}
                        onChange={(e) => updateCategory('reading', {
                          ...settings.reading,
                          theme: e.target.value as any
                        })}
                        className="w-full border rounded px-3 py-2"
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="sepia">Sepia</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Font Family</label>
                      <select
                        value={settings.reading.fontFamily}
                        onChange={(e) => updateCategory('reading', {
                          ...settings.reading,
                          fontFamily: e.target.value as any
                        })}
                        className="w-full border rounded px-3 py-2"
                      >
                        {Object.entries(FONT_CONFIGS).map(([key, config]) => (
                          <option key={key} value={key}>{config.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Font Size: {settings.reading.fontSize}px
                      </label>
                      <input
                        type="range"
                        min="14"
                        max="24"
                        value={settings.reading.fontSize}
                        onChange={(e) => updateCategory('reading', {
                          ...settings.reading,
                          fontSize: parseInt(e.target.value)
                        })}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Line Height: {settings.reading.lineHeight}
                      </label>
                      <input
                        type="range"
                        min="1.4"
                        max="2.2"
                        step="0.1"
                        value={settings.reading.lineHeight}
                        onChange={(e) => updateCategory('reading', {
                          ...settings.reading,
                          lineHeight: parseFloat(e.target.value)
                        })}
                        className="w-full"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Justify Text</span>
                      <input
                        type="checkbox"
                        checked={settings.reading.textJustify}
                        onChange={(e) => updateCategory('reading', {
                          ...settings.reading,
                          textJustify: e.target.checked
                        })}
                        className="rounded"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Content Width</label>
                      <select
                        value={settings.reading.maxWidth}
                        onChange={(e) => updateCategory('reading', {
                          ...settings.reading,
                          maxWidth: e.target.value
                        })}
                        className="w-full border rounded px-3 py-2"
                      >
                        <option value="2xl">Narrow</option>
                        <option value="4xl">Medium</option>
                        <option value="6xl">Wide</option>
                        <option value="none">Full Width</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'interface' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Interface Behavior</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Default View Mode</label>
                      <select
                        value={settings.interface.defaultViewMode}
                        onChange={(e) => updateCategory('interface', {
                          ...settings.interface,
                          defaultViewMode: e.target.value as any
                        })}
                        className="w-full border rounded px-3 py-2"
                      >
                        <option value="read">Read Only</option>
                        <option value="chat">Chat Only</option>
                        <option value="side-by-side">Side-by-Side</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Remember Sidebar State</span>
                      <input
                        type="checkbox"
                        checked={settings.interface.sidebarCollapsed}
                        onChange={(e) => updateCategory('interface', {
                          ...settings.interface,
                          sidebarCollapsed: e.target.checked
                        })}
                        className="rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Auto-scroll to New Messages</span>
                      <input
                        type="checkbox"
                        checked={settings.interface.autoScroll}
                        onChange={(e) => updateCategory('interface', {
                          ...settings.interface,
                          autoScroll: e.target.checked
                        })}
                        className="rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Auto-save Reading Progress</span>
                      <input
                        type="checkbox"
                        checked={settings.interface.autoSaveProgress}
                        onChange={(e) => updateCategory('interface', {
                          ...settings.interface,
                          autoSaveProgress: e.target.checked
                        })}
                        className="rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Compact Mode</span>
                      <input
                        type="checkbox"
                        checked={settings.interface.compactMode}
                        onChange={(e) => updateCategory('interface', {
                          ...settings.interface,
                          compactMode: e.target.checked
                        })}
                        className="rounded"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'data' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Data Management</h3>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Retain Chat History</span>
                      <input
                        type="checkbox"
                        checked={settings.data.retainChatHistory}
                        onChange={(e) => updateCategory('data', {
                          ...settings.data,
                          retainChatHistory: e.target.checked
                        })}
                        className="rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Retain Reading Progress</span>
                      <input
                        type="checkbox"
                        checked={settings.data.retainReadingProgress}
                        onChange={(e) => updateCategory('data', {
                          ...settings.data,
                          retainReadingProgress: e.target.checked
                        })}
                        className="rounded"
                      />
                    </div>
                  </div>
                </div>

                {/* Import/Export */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4">Backup & Restore</h3>

                  <div className="space-y-3">
                    <Button onClick={handleExportSettings} variant="outline" className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Export Settings
                    </Button>

                    <Button
                      onClick={() => setShowImportModal(true)}
                      variant="outline"
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Import Settings
                    </Button>

                    <Button
                      onClick={() => {
                        if (confirm('This will reset all settings to defaults. Continue?')) {
                          resetSettings();
                        }
                      }}
                      variant="outline"
                      className="w-full text-orange-600 hover:text-orange-700"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset to Defaults
                    </Button>

                    <Button
                      onClick={() => {
                        if (confirm('This will permanently delete ALL app data including books, chats, and settings. This cannot be undone. Continue?')) {
                          // Clear all data including IndexedDB
                          const clearData = async () => {
                            // Clear localStorage
                            localStorage.clear();

                            // Clear IndexedDB
                            const databases = await indexedDB.databases();
                            await Promise.all(databases.map(db => {
                              if (db.name?.includes('Reader')) {
                                return new Promise<void>((resolve) => {
                                  const deleteReq = indexedDB.deleteDatabase(db.name!);
                                  deleteReq.onsuccess = () => resolve();
                                  deleteReq.onerror = () => resolve();
                                });
                              }
                            }));

                            // Reload the page
                            window.location.reload();
                          };

                          clearData();
                        }
                      }}
                      variant="outline"
                      className="w-full text-red-600 hover:text-red-700"
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Clear All Data
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Import Settings</h3>
            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder="Paste your settings JSON here..."
              className="w-full h-32 border rounded px-3 py-2 text-sm"
            />
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="ghost" onClick={() => setShowImportModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleImportSettings}>
                Import
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}