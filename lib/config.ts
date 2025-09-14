import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

export interface AIProviderConfig {
  baseUrl: string;
  models: string[];
  defaultModel: string;
  apiVersion?: string;
  maxTokens?: number;
}

export interface ResearchConfig {
  enabled: boolean;
  orchestrator: {
    maxTokens: number;
    temperature: number;
    enableThinking: boolean;
  };
  agents: {
    BookSearchAgent: { enabled: boolean; maxResults: number };
    EvidenceAgent: { enabled: boolean; evidenceTypes: string[] };
    AnalysisAgent: { enabled: boolean; maxCrossReferences: number };
    ContextAgent: { enabled: boolean; includeStructure: boolean };
  };
}

export interface AppConfig {
  ai: {
    providers: {
      ollama: AIProviderConfig;
      openai: AIProviderConfig;
      anthropic: AIProviderConfig;
    };
  };
  research: ResearchConfig;
  app: {
    name: string;
    version: string;
    features: {
      multiAgentResearch: boolean;
      fullBookContext: boolean;
      persistentConversations: boolean;
      libraryManagement: boolean;
    };
  };
}

class ConfigManager {
  private config: AppConfig | null = null;
  private configPath: string;

  constructor() {
    this.configPath = path.join(process.cwd(), 'config.yaml');
  }

  public getConfig(): AppConfig {
    if (!this.config) {
      this.loadConfig();
    }
    return this.config!;
  }

  public getProviderConfig(provider: 'ollama' | 'openai' | 'anthropic'): AIProviderConfig {
    const config = this.getConfig();
    return config.ai.providers[provider];
  }

  public getAvailableModels(provider: 'ollama' | 'openai' | 'anthropic'): string[] {
    const providerConfig = this.getProviderConfig(provider);
    return providerConfig.models;
  }

  public getDefaultModel(provider: 'ollama' | 'openai' | 'anthropic'): string {
    const providerConfig = this.getProviderConfig(provider);
    return providerConfig.defaultModel;
  }

  public getResearchConfig(): ResearchConfig {
    const config = this.getConfig();
    return config.research;
  }

  private loadConfig(): void {
    try {
      const fileContents = fs.readFileSync(this.configPath, 'utf8');
      this.config = yaml.load(fileContents) as AppConfig;
    } catch (error) {
      console.error('Failed to load config.yaml, using defaults:', error);
      this.config = this.getDefaultConfig();
    }
  }

  private getDefaultConfig(): AppConfig {
    return {
      ai: {
        providers: {
          ollama: {
            baseUrl: "http://localhost:11434",
            models: ["llama3.2", "mistral"],
            defaultModel: "llama3.2"
          },
          openai: {
            baseUrl: "https://api.openai.com/v1",
            models: ["gpt-4o-mini", "gpt-4"],
            defaultModel: "gpt-4o-mini"
          },
          anthropic: {
            baseUrl: "https://api.anthropic.com",
            models: ["claude-3-5-sonnet-20241022"],
            defaultModel: "claude-3-5-sonnet-20241022",
            apiVersion: "2023-06-01",
            maxTokens: 8192
          }
        }
      },
      research: {
        enabled: true,
        orchestrator: {
          maxTokens: 4000,
          temperature: 0.1,
          enableThinking: true
        },
        agents: {
          BookSearchAgent: { enabled: true, maxResults: 5 },
          EvidenceAgent: { enabled: true, evidenceTypes: ["examples", "statistics", "quotes", "case_studies"] },
          AnalysisAgent: { enabled: true, maxCrossReferences: 10 },
          ContextAgent: { enabled: true, includeStructure: true }
        }
      },
      app: {
        name: "AI Document Reader",
        version: "2.1.0",
        features: {
          multiAgentResearch: true,
          fullBookContext: true,
          persistentConversations: true,
          libraryManagement: true
        }
      }
    };
  }

  public reloadConfig(): void {
    this.config = null;
    this.loadConfig();
  }
}

// Singleton instance
export const configManager = new ConfigManager();

// Convenience exports
export const getProviderConfig = (provider: 'ollama' | 'openai' | 'anthropic') =>
  configManager.getProviderConfig(provider);

export const getAvailableModels = (provider: 'ollama' | 'openai' | 'anthropic') =>
  configManager.getAvailableModels(provider);

export const getDefaultModel = (provider: 'ollama' | 'openai' | 'anthropic') =>
  configManager.getDefaultModel(provider);

export const getResearchConfig = () => configManager.getResearchConfig();