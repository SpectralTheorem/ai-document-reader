import { NextRequest, NextResponse } from 'next/server';
import { AIProvider } from '@/lib/ai-providers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, provider, model, apiKey, baseUrl, action } = body;

    if (!messages || !provider || !model) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const aiProvider = new AIProvider({
      provider,
      model,
      apiKey,
      baseUrl
    });

    let processedMessages = messages;
    
    if (action) {
      const systemPrompt = getActionPrompt(action);
      processedMessages = [
        { role: 'system', content: systemPrompt },
        ...messages
      ];
    }

    const response = await aiProvider.chat(processedMessages);
    
    if (response.error) {
      return NextResponse.json(
        { error: response.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ content: response.content });
  } catch (error: any) {
    console.error('AI chat error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process AI request' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const provider = searchParams.get('provider');
    
    if (provider === 'ollama') {
      const baseUrl = searchParams.get('baseUrl') || 'http://localhost:11434';
      const models = await AIProvider.getOllamaModels(baseUrl);
      return NextResponse.json({ models });
    }
    
    return NextResponse.json({ models: [] });
  } catch (error: any) {
    console.error('Get models error:', error);
    return NextResponse.json({ models: [] });
  }
}

function getActionPrompt(action: string): string {
  const prompts: Record<string, string> = {
    'extract-facts': 'Extract all empirical facts, statistics, and verifiable information from the following text. Present them as a bullet-point list.',
    'summarize': 'Provide a concise summary of the following text, highlighting the main points and key takeaways.',
    'explain': 'Explain the following text in simple terms, as if teaching it to someone unfamiliar with the subject.',
    'questions': 'Generate thoughtful questions about the following text that would help deepen understanding of the material.',
    'key-concepts': 'Identify and explain the key concepts and terminology from the following text.',
  };
  
  return prompts[action] || 'Please analyze the following text:';
}