import { NextRequest, NextResponse } from 'next/server';
import { BookResearchOrchestrator } from '@/lib/agents/BookResearchOrchestrator';
import { BookContext } from '@/lib/agents/types';
import { DebugSettings, validateDebugSettings } from '@/types/debug-settings';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, bookId, document, mode = 'full', enableDebugging = false, sessionId, settings } = body;

    // Validate and use settings
    const validatedSettings = settings ? validateDebugSettings(settings) : null;

    console.log('🔍 Debug book-research request:', {
      query: !!query,
      bookId: !!bookId,
      hasDocument: !!document,
      mode,
      enableDebugging,
      sessionId: !!sessionId,
      hasSettings: !!validatedSettings
    });

    if (validatedSettings) {
      console.log('⚙️ Using settings:', {
        tokenLimit: validatedSettings.tokenLimitPerAgent,
        maxSections: validatedSettings.maxSections,
        enabledAgents: validatedSettings.enabledAgents,
        mode: validatedSettings.researchMode
      });
    }

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    if (!bookId) {
      return NextResponse.json(
        { error: 'Book ID is required' },
        { status: 400 }
      );
    }

    if (!document) {
      return NextResponse.json(
        { error: 'Document data is required for debug console' },
        { status: 400 }
      );
    }

    // Use server-side API key from environment
    const apiKey = process.env.ANTHROPIC_API_KEY;
    console.log(`🔑 API key available: ${apiKey ? 'YES' : 'NO'}`);

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required for debug functionality. Please set ANTHROPIC_API_KEY environment variable.' },
        { status: 400 }
      );
    }

    console.log(`📚 Using provided document: "${document.title}" by ${document.author} with ${document.sections?.length || 0} sections`);

    // Create book context with provided document and settings
    const bookContext: BookContext = {
      bookId,
      document,
      debugSettings: validatedSettings
    };

    // Initialize the orchestrator
    const orchestrator = new BookResearchOrchestrator(apiKey);

    // Conduct research with debug enabled
    let result;
    if (mode === 'quick') {
      const insight = await orchestrator.getQuickInsight(query, bookContext);
      result = {
        synthesis: insight,
        agentResults: [],
        totalExecutionTime: 0,
        confidence: 0.7,
        sources: [],
        mode: 'quick'
      };
    } else {
      result = await orchestrator.conductResearch(query, bookContext, enableDebugging, sessionId, validatedSettings);
      result.mode = 'full';
    }

    console.log(`✅ Debug research completed: ${result.agentResults?.length || 0} agents, confidence: ${result.confidence}`);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Debug book research API error:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'Invalid API key or API access denied' },
          { status: 401 }
        );
      }

      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Research failed' },
      { status: 500 }
    );
  }
}