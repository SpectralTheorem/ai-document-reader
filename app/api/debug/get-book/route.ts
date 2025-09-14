import { NextRequest, NextResponse } from 'next/server';
import { libraryStorage } from '@/lib/library-storage';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId');

    if (!bookId) {
      return NextResponse.json(
        { error: 'Book ID is required' },
        { status: 400 }
      );
    }

    console.log(`📚 Attempting to get book: ${bookId}`);

    // Try to get the document from storage
    // Note: This will return null on server side due to IndexedDB limitations
    const document = await libraryStorage.getDocument(bookId);

    if (!document) {
      console.log(`❌ Book not found in server storage: ${bookId}`);
      return NextResponse.json(
        {
          error: 'Book not found in server storage. The debug console needs books to be available server-side.',
          suggestion: 'Please use the regular chat interface instead, or implement server-side book storage.'
        },
        { status: 404 }
      );
    }

    console.log(`✅ Found book: "${document.title}" by ${document.author}`);

    return NextResponse.json({
      success: true,
      document,
      bookId
    });

  } catch (error) {
    console.error('Get book API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get book' },
      { status: 500 }
    );
  }
}