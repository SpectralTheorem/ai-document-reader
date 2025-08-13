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

  async *chatStream(messages: Array<{ role: string; content: string }>): AsyncGenerator<any, void, unknown> {
    try {
      switch (this.config.provider) {
        case 'ollama':
          yield* this.streamWithOllama(messages);
          break;
        case 'openai':
          yield* this.streamWithOpenAI(messages);
          break;
        case 'anthropic':
          yield* this.streamWithAnthropic(messages);
          break;
        default:
          throw new Error(`Unsupported provider: ${this.config.provider}`);
      }
    } catch (error: any) {
      yield { type: 'error', content: `Error: ${error.message || 'An error occurred while processing your request'}` };
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
      throw new Error('OpenAI API key is required. Please enter your API key in the settings.');
    }

    try {
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
    } catch (error: any) {
      let errorMessage = 'OpenAI API error';
      
      if (error.response) {
        const status = error.response.status;
        if (status === 401) {
          errorMessage = 'Invalid OpenAI API key. Please check your API key and try again.';
        } else if (status === 403) {
          errorMessage = 'OpenAI API access forbidden. Please check your account permissions.';
        } else if (status === 429) {
          errorMessage = 'OpenAI API rate limit exceeded. Please try again in a moment.';
        } else if (status === 500) {
          errorMessage = 'OpenAI API server error. Please try again later.';
        } else {
          errorMessage = `OpenAI API error (${status})`;
        }
        
        if (error.response.data?.error?.message) {
          errorMessage += ` Details: ${error.response.data.error.message}`;
        }
      } else if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      
      throw new Error(errorMessage);
    }
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

  private async *streamWithOllama(messages: Array<{ role: string; content: string }>): AsyncGenerator<any, void, unknown> {
    const baseUrl = this.config.baseUrl || 'http://localhost:11434';
    
    let response;
    try {
      response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          stream: true
        }),
      });
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED' || error.message.includes('fetch')) {
        throw new Error('Cannot connect to Ollama server. Make sure Ollama is running on http://localhost:11434');
      }
      throw new Error(`Ollama connection error: ${error.message}`);
    }

    if (!response.ok) {
      let errorMessage = `Ollama API error (${response.status})`;
      
      if (response.status === 404) {
        errorMessage = `Model "${this.config.model}" not found. Please check if the model is installed in Ollama.`;
      } else if (response.status === 500) {
        errorMessage = 'Ollama server error. Please check the Ollama logs.';
      }
      
      try {
        const errorData = await response.text();
        if (errorData) {
          errorMessage += ` Details: ${errorData}`;
        }
      } catch (e) {
        // Ignore text parsing errors for error response
      }
      
      throw new Error(errorMessage);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body available');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            console.log('🔍 Raw Ollama line:', line);
            try {
              const parsed = JSON.parse(line);
              console.log('📋 Parsed Ollama response:', parsed);
              
              // Handle both thinking and content fields from Ollama
              if (parsed.message?.thinking) {
                console.log('🧠 Yielding thinking content:', parsed.message.thinking);
                yield { type: 'thinking', content: parsed.message.thinking };
              }
              if (parsed.message?.content) {
                console.log('✅ Yielding regular content:', parsed.message.content);
                yield { type: 'content', content: parsed.message.content };
              }
              if (!parsed.message?.thinking && !parsed.message?.content) {
                console.log('⚠️ No content or thinking in parsed response');
              }
            } catch (error) {
              console.error('❌ Error parsing JSON:', error, 'Line was:', line);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private async *streamWithOpenAI(messages: Array<{ role: string; content: string }>): AsyncGenerator<any, void, unknown> {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key is required. Please enter your API key in the settings.');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model || 'gpt-4',
        messages,
        stream: true
      }),
    });

    if (!response.ok) {
      let errorMessage = `OpenAI API error (${response.status})`;
      
      if (response.status === 401) {
        errorMessage = 'Invalid OpenAI API key. Please check your API key and try again.';
      } else if (response.status === 403) {
        errorMessage = 'OpenAI API access forbidden. Please check your account permissions.';
      } else if (response.status === 429) {
        errorMessage = 'OpenAI API rate limit exceeded. Please try again in a moment.';
      } else if (response.status === 500) {
        errorMessage = 'OpenAI API server error. Please try again later.';
      }
      
      try {
        const errorData = await response.json();
        if (errorData.error?.message) {
          errorMessage += ` Details: ${errorData.error.message}`;
        }
      } catch (e) {
        // Ignore JSON parsing errors for error response
      }
      
      throw new Error(errorMessage);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body available');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                yield { type: 'content', content: content };
              }
            } catch (error) {
              console.error('Error parsing JSON:', error);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private async *streamWithAnthropic(messages: Array<{ role: string; content: string }>): AsyncGenerator<any, void, unknown> {
    // For now, fall back to non-streaming for Anthropic
    // Anthropic's streaming API has a different format
    const response = await this.chatWithAnthropic(messages);
    yield { type: 'content', content: response.content };
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