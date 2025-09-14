import axios from 'axios';
import { getProviderConfig, getDefaultModel } from './config';

export interface AIConfig {
  provider: 'ollama' | 'openai' | 'anthropic';
  apiKey?: string;
  baseUrl?: string;
  model: string;
}

export interface AIResponse {
  content: string;
  error?: string;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
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
      // Check for environment variable
      const envKey = process.env.OPENAI_API_KEY;
      if (envKey) {
        this.config.apiKey = envKey;
      } else {
        throw new Error('OpenAI API key is required. Please enter your API key in the settings.');
      }
    }

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: this.config.model || getDefaultModel('openai'),
          messages
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result: AIResponse = {
        content: response.data.choices[0].message.content
      };

      // Track token usage if available
      if (response.data.usage) {
        const tokenUsage = {
          inputTokens: response.data.usage.prompt_tokens || 0,
          outputTokens: response.data.usage.completion_tokens || 0,
          totalTokens: response.data.usage.total_tokens || 0
        };

        result.tokenUsage = tokenUsage;
      }

      return result;
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
      // Check for environment variable
      const envKey = process.env.ANTHROPIC_API_KEY;
      if (envKey) {
        this.config.apiKey = envKey;
      } else {
        throw new Error('Anthropic API key is required');
      }
    }

    try {
      const anthropicConfig = getProviderConfig('anthropic');
      const model = this.config.model || getDefaultModel('anthropic');

      console.log('🤖 Making Anthropic API call with model:', model);

      // Separate system message from user/assistant messages
      const systemMessage = messages.find(m => m.role === 'system');
      const userMessages = messages.filter(m => m.role !== 'system');

      // Prepare request body
      const requestBody: any = {
        model,
        messages: userMessages,
        max_tokens: anthropicConfig.maxTokens || 8192
      };

      // Add system message as top-level parameter if it exists
      if (systemMessage) {
        requestBody.system = systemMessage.content;
      }

      const response = await axios.post(
        `${anthropicConfig.baseUrl}/v1/messages`,
        requestBody,
        {
          headers: {
            'x-api-key': this.config.apiKey,
            'anthropic-version': anthropicConfig.apiVersion || '2023-06-01',
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Anthropic API response received successfully');
      return this.processAnthropicResponse(response);

    } catch (error: any) {
      console.error('❌ Anthropic API error:', error.response?.data || error.message);

      if (error.response?.status === 400) {
        const errorData = error.response.data;
        if (errorData.error?.message) {
          throw new Error(`Anthropic API 400: ${errorData.error.message}`);
        } else {
          throw new Error(`Anthropic API 400: Bad Request - ${JSON.stringify(errorData)}`);
        }
      }

      throw error;
    }
  }

  private processAnthropicResponse(response: any): AIResponse {
    const result: AIResponse = {
      content: response.data.content[0].text
    };

    // Track token usage if available
    if (response.data.usage) {
      const tokenUsage = {
        inputTokens: response.data.usage.input_tokens || 0,
        outputTokens: response.data.usage.output_tokens || 0,
        totalTokens: (response.data.usage.input_tokens || 0) + (response.data.usage.output_tokens || 0)
      };

      result.tokenUsage = tokenUsage;
    }

    return result;
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
      // Check for environment variable
      const envKey = process.env.OPENAI_API_KEY;
      if (envKey) {
        this.config.apiKey = envKey;
      } else {
        throw new Error('OpenAI API key is required. Please enter your API key in the settings.');
      }
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model || getDefaultModel('openai'),
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
    if (!this.config.apiKey) {
      // Check for environment variable
      const envKey = process.env.ANTHROPIC_API_KEY;
      if (envKey) {
        this.config.apiKey = envKey;
      } else {
        throw new Error('Anthropic API key is required');
      }
    }

    try {
      const anthropicConfig = getProviderConfig('anthropic');
      const model = this.config.model || getDefaultModel('anthropic');

      console.log('🤖 Making Anthropic streaming API call with model:', model);

      // Separate system message from user/assistant messages
      const systemMessage = messages.find(m => m.role === 'system');
      const userMessages = messages.filter(m => m.role !== 'system');

      // Prepare request body
      const requestBody: any = {
        model,
        messages: userMessages,
        max_tokens: anthropicConfig.maxTokens || 8192,
        stream: true
      };

      // Add system message as top-level parameter if it exists
      if (systemMessage) {
        requestBody.system = systemMessage.content;
      }

      const response = await fetch(
        `${anthropicConfig.baseUrl}/v1/messages`,
        {
          method: 'POST',
          headers: {
            'x-api-key': this.config.apiKey,
            'anthropic-version': anthropicConfig.apiVersion || '2023-06-01',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        let errorMessage = `Anthropic API error (${response.status})`;

        if (response.status === 400) {
          const errorData = await response.json();
          if (errorData.error?.message) {
            errorMessage = `Anthropic API 400: ${errorData.error.message}`;
          } else {
            errorMessage = `Anthropic API 400: Bad Request - ${JSON.stringify(errorData)}`;
          }
        } else if (response.status === 401) {
          errorMessage = 'Invalid Anthropic API key. Please check your API key and try again.';
        } else if (response.status === 429) {
          errorMessage = 'Anthropic API rate limit exceeded. Please try again in a moment.';
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
                if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                  yield { type: 'content', content: parsed.delta.text };
                }
              } catch (error) {
                console.error('Error parsing Anthropic streaming JSON:', error);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

    } catch (error: any) {
      console.error('❌ Anthropic streaming API error:', error.message);

      if (error.response?.status === 400) {
        const errorData = error.response.data;
        if (errorData.error?.message) {
          throw new Error(`Anthropic API 400: ${errorData.error.message}`);
        } else {
          throw new Error(`Anthropic API 400: Bad Request - ${JSON.stringify(errorData)}`);
        }
      }

      throw error;
    }
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