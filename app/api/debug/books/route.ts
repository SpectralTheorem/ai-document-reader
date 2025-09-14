import { NextRequest, NextResponse } from 'next/server';
import { libraryStorage } from '@/lib/library-storage';

export interface BookListItem {
  id: string;
  title: string;
  author?: string;
  coverUrl?: string;
  lastUsed?: number;
  genre?: string;
  sectionsCount?: number;
}

export async function GET(request: NextRequest) {
  try {
    console.log('📚 Fetching book list for debug console...');

    // Get all books from library storage
    const books: BookListItem[] = [];

    // Get books from storage
    try {
      const libraryBooks = await libraryStorage.getAllBooks();
      console.log(`📖 Found ${libraryBooks.length} books in library`);

      for (const book of libraryBooks) {
        books.push({
          id: book.id,
          title: book.title,
          author: book.author,
          coverUrl: book.coverUrl,
          lastUsed: book.lastAccessed,
          sectionsCount: book.sectionsCount
        });
      }
    } catch (error) {
      console.warn('⚠️ Failed to get books from library storage:', error);
    }

    // Sort books: recently used first, then alphabetically by title
    books.sort((a, b) => {
      // First priority: recently used
      if (a.lastUsed && b.lastUsed) {
        return b.lastUsed - a.lastUsed;
      }
      if (a.lastUsed && !b.lastUsed) return -1;
      if (!a.lastUsed && b.lastUsed) return 1;

      // Second priority: alphabetical by title
      return a.title.localeCompare(b.title);
    });

    console.log(`✅ Returning ${books.length} books for debug console`);

    return NextResponse.json({
      success: true,
      books,
      total: books.length
    });

  } catch (error) {
    console.error('Debug books API error:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch books',
      books: [],
      total: 0
    }, { status: 500 });
  }
}