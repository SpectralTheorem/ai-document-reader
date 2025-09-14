import { NextRequest, NextResponse } from 'next/server';
import { BookResearchOrchestrator } from '@/lib/agents/BookResearchOrchestrator';
import { libraryStorage } from '@/lib/library-storage';
import { BookContext } from '@/lib/agents/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, bookId, apiKey, mode = 'full', enableDebugging = false, sessionId } = body;

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

    // Use provided API key or fall back to environment variable for debug console
    const effectiveApiKey = apiKey || process.env.ANTHROPIC_API_KEY;

    if (!effectiveApiKey) {
      return NextResponse.json(
        { error: 'API key is required for research functionality. Please provide it in the request or set ANTHROPIC_API_KEY environment variable.' },
        { status: 400 }
      );
    }

    // Get book document from storage
    const document = await libraryStorage.getDocument(bookId);
    if (!document) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }

    // Create book context
    const bookContext: BookContext = {
      bookId,
      document
    };

    // Initialize the orchestrator
    const orchestrator = new BookResearchOrchestrator(effectiveApiKey);

    // Conduct research based on mode
    let result;
    if (mode === 'quick') {
      // Quick insight mode for simpler queries
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
      // Full research mode with all agents
      result = await orchestrator.conductResearch(query, bookContext, enableDebugging, sessionId);
      result.mode = 'full';
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Book research API error:', error);

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

// Optional: Add a GET endpoint for testing
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const test = searchParams.get('test');

  if (test === 'true') {
    return NextResponse.json({
      status: 'Book Research API is running',
      availableModes: ['quick', 'full'],
      agents: [
        'BookSearchAgent',
        'EvidenceAgent',
        'AnalysisAgent',
        'ContextAgent'
      ],
      version: '1.0.0'
    });
  }

  return NextResponse.json(
    { error: 'This endpoint requires POST requests' },
    { status: 405 }
  );
}