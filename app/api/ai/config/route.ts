import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const config = {
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
      ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    };

    return Response.json(config);
  } catch (error: any) {
    console.error('Config check error:', error);
    return Response.json(
      { error: 'Failed to check configuration' },
      { status: 500 }
    );
  }
}