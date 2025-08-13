import { NextRequest } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  // Only allow in development mode
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not available in production', { status: 404 });
  }

  try {
    const bookPath = path.join(process.cwd(), 'booky_book.epub');
    const fileBuffer = await readFile(bookPath);
    
    return new Response(fileBuffer, {
      headers: {
        'Content-Type': 'application/epub+zip',
        'Content-Disposition': 'attachment; filename="booky_book.epub"',
      },
    });
  } catch (error) {
    console.error('Debug book not found:', error);
    return new Response('Debug book not found', { status: 404 });
  }
}