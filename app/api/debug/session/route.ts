import { NextRequest, NextResponse } from 'next/server';
import { BookResearchOrchestrator } from '@/lib/agents/BookResearchOrchestrator';
import { libraryStorage } from '@/lib/library-storage';
import { BookContext } from '@/lib/agents/types';
import { debugEmitter, DebugSession } from '@/lib/agents/debug-types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, bookId, enableDebugging = true, document } = body;

    // Debug logging
    console.log('🔍 Debug session request body keys:', Object.keys(body));
    console.log('📋 Received parameters:', {
      query: !!query,
      bookId: !!bookId,
      enableDebugging,
      hasDocument: !!document,
      documentKeys: document ? Object.keys(document) : []
    });

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
        { error: 'Document data is required. Please provide the document from client-side storage.' },
        { status: 400 }
      );
    }

    // For debug sessions, we'll use a test API key or environment variable
    const apiKey = process.env.ANTHROPIC_API_KEY;
    console.log(`🔑 API key available: ${apiKey ? 'YES' : 'NO'}`);
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required for debug functionality. Please set ANTHROPIC_API_KEY environment variable.' },
        { status: 400 }
      );
    }

    console.log(`📚 Received document for debug session - Book: "${document.title}" by ${document.author}`);
    console.log(`📖 Document has ${document.sections?.length || 0} sections`);

    // Create book context
    const bookContext: BookContext = {
      bookId,
      document
    };

    // Initialize the orchestrator
    const orchestrator = new BookResearchOrchestrator(apiKey);

    // Create a debug session to track the research process
    const sessionId = `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const debugSession: DebugSession = {
      id: sessionId,
      query,
      bookId,
      timestamp: Date.now(),
      agents: [],
      status: 'idle'
    };

    // Start the research process with debug enabled
    // We'll run this in the background and return the session immediately
    setTimeout(async () => {
      try {
        console.log(`🔍 Starting debug research session: ${sessionId} with query: "${query}"`);
        console.log(`📝 Book context has ${document.sections.length} sections`);
        const result = await orchestrator.conductResearch(query, bookContext, enableDebugging, sessionId);
        console.log(`✅ Debug session ${sessionId} completed successfully`);
        console.log(`📊 Result summary: ${result.agentResults.length} agents, confidence: ${result.confidence}`);
      } catch (error) {
        console.error(`❌ Debug session ${sessionId} failed:`, error);
        console.error(`🔍 Error details:`, error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error);
        debugEmitter.emit({
          type: 'session_failed',
          timestamp: Date.now(),
          sessionId,
          data: {
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }
    }, 100);

    // Return the session info immediately
    return NextResponse.json({
      success: true,
      sessionId,
      session: debugSession,
      message: 'Debug session started. Use WebSocket connection to monitor progress.'
    });

  } catch (error) {
    console.error('Debug session API error:', error);

    // Handle specific error types
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to start debug session' },
      { status: 500 }
    );
  }
}