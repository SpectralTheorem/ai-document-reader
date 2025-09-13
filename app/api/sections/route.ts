import { NextRequest, NextResponse } from 'next/server';
import { DocumentFactory } from '@/lib/parsers/document-factory';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fileName = searchParams.get('file');
    const sectionId = searchParams.get('sectionId');
    
    if (!fileName) {
      return NextResponse.json({ error: 'File name required' }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'uploads', fileName);
    const documentType = DocumentFactory.getDocumentType(fileName);
    
    if (!documentType) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    const fileBuffer = await readFile(filePath);
    const document = await DocumentFactory.parseDocument(fileBuffer, documentType);
    
    if (sectionId) {
      const section = document.sections.find(s => s.id === sectionId);
      if (!section) {
        return NextResponse.json({ error: 'Section not found' }, { status: 404 });
      }
      return NextResponse.json(section);
    }
    
    return NextResponse.json(document.sections);
  } catch (error: any) {
    console.error('Sections error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve sections' },
      { status: 500 }
    );
  }
}