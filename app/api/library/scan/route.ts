import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { DocumentFactory } from '@/lib/parsers/document-factory';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { directoryPath } = body;

    // For browser security, we'll use a predefined library directory
    // In a real desktop app, you'd use electron's dialog.showOpenDialog
    const libraryPath = directoryPath || path.join(process.cwd(), 'library');
    
    const files = await scanDirectory(libraryPath);
    const epubFiles = files.filter(file => file.endsWith('.epub'));
    
    const books = [];
    for (const file of epubFiles) {
      try {
        const filePath = path.join(libraryPath, file);
        const buffer = await readFile(filePath);
        const document = await DocumentFactory.parseDocument(buffer, 'epub');
        
        books.push({
          fileName: file,
          filePath,
          title: document.metadata.title,
          author: document.metadata.author,
          coverImage: document.metadata.coverImage,
        });
      } catch (error) {
        console.error(`Failed to parse ${file}:`, error);
      }
    }
    
    return NextResponse.json({ books });
  } catch (error: any) {
    console.error('Directory scan error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to scan directory' },
      { status: 500 }
    );
  }
}

async function scanDirectory(dirPath: string): Promise<string[]> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    const files: string[] = [];
    
    for (const entry of entries) {
      if (entry.isFile()) {
        files.push(entry.name);
      }
    }
    
    return files;
  } catch (error) {
    console.error('Error scanning directory:', error);
    return [];
  }
}