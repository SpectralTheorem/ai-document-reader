import { NextResponse } from 'next/server';
import { configManager } from '@/lib/config';

export async function GET() {
  try {
    const config = configManager.getConfig();

    // Return the parts of config that the client needs
    const clientConfig = {
      ai: {
        providers: {
          ollama: {
            models: config.ai.providers.ollama.models,
            defaultModel: config.ai.providers.ollama.defaultModel
          },
          openai: {
            models: config.ai.providers.openai.models,
            defaultModel: config.ai.providers.openai.defaultModel
          },
          anthropic: {
            models: config.ai.providers.anthropic.models,
            defaultModel: config.ai.providers.anthropic.defaultModel
          }
        }
      }
    };

    return NextResponse.json(clientConfig);
  } catch (error) {
    console.error('Failed to load config:', error);

    // Return fallback config
    return NextResponse.json({
      ai: {
        providers: {
          ollama: {
            models: ['gpt-oss'],
            defaultModel: 'gpt-oss'
          },
          openai: {
            models: ['gpt-5-mini-2025-08-07', 'gpt-5-2025-08-07', 'gpt-5-nano'],
            defaultModel: 'gpt-5-mini-2025-08-07'
          },
          anthropic: {
            models: ['claude-3-5-haiku-20241022', 'claude-sonnet-4-20250514', 'claude-opus-4-1-20250805'],
            defaultModel: 'claude-3-5-haiku-20241022'
          }
        }
      }
    });
  }
}