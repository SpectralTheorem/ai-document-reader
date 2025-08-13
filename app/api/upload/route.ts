import { NextRequest, NextResponse } from 'next/server';
import { DocumentFactory } from '@/lib/parsers/document-factory';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const documentType = DocumentFactory.getDocumentType(file.name);
    if (!documentType) {
      return NextResponse.json({ error: 'Unsupported file type. Please upload an EPUB file.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const parsedDocument = await DocumentFactory.parseDocument(buffer, documentType);
    
    console.log('📋 Upload API returning document:', {
      hasDocument: !!parsedDocument,
      hasSections: !!parsedDocument?.sections,
      sectionsCount: parsedDocument?.sections?.length || 0,
      hasMetadata: !!parsedDocument?.metadata,
      title: parsedDocument?.metadata?.title
    });
    
    return NextResponse.json({
      success: true,
      fileName: file.name,
      document: parsedDocument
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process file' },
      { status: 500 }
    );
  }
}