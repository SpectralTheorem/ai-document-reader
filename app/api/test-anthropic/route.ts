import { NextRequest, NextResponse } from 'next/server';
import { AIProvider } from '@/lib/ai-providers';
import { getDefaultModel } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, model = getDefaultModel('anthropic') } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    console.log('🧪 Testing Anthropic API with model:', model);

    const provider = new AIProvider({
      provider: 'anthropic',
      apiKey,
      model
    });

    const testMessages = [
      {
        role: 'user',
        content: 'Hello! Can you respond with just "Anthropic API working correctly"?'
      }
    ];

    console.log('🚀 Making test request...');
    const response = await provider.chat(testMessages);
    console.log('✅ Response received:', { content: response.content.substring(0, 100), hasError: !!response.error });

    if (response.error) {
      return NextResponse.json(
        {
          success: false,
          error: response.error,
          details: 'API call failed'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      response: response.content,
      tokenUsage: response.tokenUsage
    });

  } catch (error: any) {
    console.error('❌ Test API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error.response?.data || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to test Anthropic API',
    requiredBody: {
      apiKey: 'your-anthropic-api-key',
      model: 'claude-3-5-sonnet-20241022'
    }
  });
}