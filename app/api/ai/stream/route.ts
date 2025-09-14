import { NextRequest } from 'next/server';
import { AIProvider } from '@/lib/ai-providers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, provider, model, apiKey, baseUrl, action } = body;

    if (!messages || !provider || !model) {
      return new Response('Missing required parameters', { status: 400 });
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
      // Always use system role - the AIProvider will handle Anthropic's format
      processedMessages = [
        { role: 'system', content: systemPrompt },
        ...messages
      ];
    }

    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          console.log('🚀 Starting AI stream with messages:', processedMessages.length);
          let chunkCount = 0;
          for await (const chunk of aiProvider.chatStream(processedMessages)) {
            chunkCount++;
            console.log(`📤 Streaming chunk ${chunkCount}:`, chunk);
            const data = encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`);
            controller.enqueue(data);
          }
          console.log(`✅ Stream completed. Total chunks: ${chunkCount}`);
          
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (error: any) {
          console.error('💥 Stream error:', error);
          const errorData = encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`);
          controller.enqueue(errorData);
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('AI stream error:', error);
    return new Response(
      `data: ${JSON.stringify({ error: error.message || 'Failed to process AI request' })}\n\n`,
      { 
        status: 500,
        headers: {
          'Content-Type': 'text/event-stream',
        }
      }
    );
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