import axios from 'axios';

export interface AIConfig {
  provider: 'ollama' | 'openai' | 'anthropic';
  apiKey?: string;
  baseUrl?: string;
  model: string;
}

export interface AIResponse {
  content: string;
  error?: string;
}

export class AIProvider {
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  async chat(messages: Array<{ role: string; content: string }>): Promise<AIResponse> {
    try {
      switch (this.config.provider) {
        case 'ollama':
          return await this.chatWithOllama(messages);
        case 'openai':
          return await this.chatWithOpenAI(messages);
        case 'anthropic':
          return await this.chatWithAnthropic(messages);
        default:
          throw new Error(`Unsupported provider: ${this.config.provider}`);
      }
    } catch (error: any) {
      return {
        content: '',
        error: error.message || 'An error occurred while processing your request'
      };
    }
  }

  private async chatWithOllama(messages: Array<{ role: string; content: string }>): Promise<AIResponse> {
    const baseUrl = this.config.baseUrl || 'http://localhost:11434';
    const response = await axios.post(`${baseUrl}/api/chat`, {
      model: this.config.model,
      messages,
      stream: false
    });

    return {
      content: response.data.message.content
    };
  }

  private async chatWithOpenAI(messages: Array<{ role: string; content: string }>): Promise<AIResponse> {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: this.config.model || 'gpt-4',
        messages
      },
      {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      content: response.data.choices[0].message.content
    };
  }

  private async chatWithAnthropic(messages: Array<{ role: string; content: string }>): Promise<AIResponse> {
    if (!this.config.apiKey) {
      throw new Error('Anthropic API key is required');
    }

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: this.config.model || 'claude-3-opus-20240229',
        messages,
        max_tokens: 4096
      },
      {
        headers: {
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      content: response.data.content[0].text
    };
  }

  static async getOllamaModels(baseUrl: string = 'http://localhost:11434'): Promise<string[]> {
    try {
      const response = await axios.get(`${baseUrl}/api/tags`);
      return response.data.models.map((m: any) => m.name);
    } catch (error) {
      console.error('Failed to fetch Ollama models:', error);
      return [];
    }
  }
}