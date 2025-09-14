import { NextRequest } from 'next/server';
import { debugEmitter } from '@/lib/agents/debug-types';

export async function GET(request: NextRequest) {
  // Server-Sent Events endpoint for debug events
  console.log('🔌 SSE connection attempt, headers:', {
    accept: request.headers.get('accept'),
    cacheControl: request.headers.get('cache-control'),
    upgrade: request.headers.get('upgrade')
  });

  // For development, we'll use Server-Sent Events instead of WebSocket
  // as Next.js doesn't have built-in WebSocket support in App Router
  const stream = new ReadableStream({
    start(controller) {
      console.log('🔌 Debug client connected via SSE');
      console.log('🔧 DebugEmitter instance:', debugEmitter.constructor.name);

      const encoder = new TextEncoder();

      // Send initial connection confirmation
      const data = encoder.encode(`data: ${JSON.stringify({
        type: 'connected',
        timestamp: Date.now(),
        message: 'Debug stream connected'
      })}\n\n`);
      controller.enqueue(data);

      // Subscribe to debug events
      const unsubscribe = debugEmitter.subscribe((event) => {
        try {
          console.log('📨 SSE forwarding debug event:', event.type, 'sessionId:', event.sessionId);
          const eventData = encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
          controller.enqueue(eventData);
        } catch (error) {
          console.error('Failed to send debug event:', error);
        }
      });

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        console.log('🔌 Debug client disconnected');
        unsubscribe();
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}