'use client';

import { useState, useEffect } from 'react';
import { DocumentUploader } from '@/components/DocumentUploader';
import { ReaderLayout } from '@/components/ReaderLayout';
import { ParsedDocument } from '@/types/document';

export default function Home() {
  const [document, setDocument] = useState<ParsedDocument | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isAutoLoading, setIsAutoLoading] = useState(false);

  const handleDocumentUploaded = (doc: ParsedDocument, file: string) => {
    setDocument(doc);
    setFileName(file);
  };

  // Debug auto-upload functionality
  useEffect(() => {
    const autoLoadDebugBook = async () => {
      // Only auto-load in development and if no document is already loaded
      if (process.env.NODE_ENV !== 'production' && !document && !isAutoLoading) {
        console.log('🔧 Debug mode: Auto-loading booky_book.epub...');
        setIsAutoLoading(true);
        
        try {
          const response = await fetch('/api/debug/book');
          if (response.ok) {
            const blob = await response.blob();
            const file = new File([blob], 'booky_book.epub', { type: 'application/epub+zip' });
            
            const formData = new FormData();
            formData.append('file', file);
            
            const uploadResponse = await fetch('/api/upload', {
              method: 'POST',
              body: formData,
            });
            
            if (uploadResponse.ok) {
              const result = await uploadResponse.json();
              console.log('✅ Debug book auto-loaded successfully:', {
                hasResult: !!result,
                hasDocument: !!result.document,
                hasSections: !!result.document?.sections,
                sectionsLength: result.document?.sections?.length || 0
              });
              handleDocumentUploaded(result.document, 'booky_book.epub');
            } else {
              console.log('❌ Failed to process debug book');
            }
          } else {
            console.log('📝 Debug book not available - skipping auto-load');
          }
        } catch (error) {
          console.log('🔍 Debug auto-load failed (this is normal):', error);
        } finally {
          setIsAutoLoading(false);
        }
      }
    };

    autoLoadDebugBook();
  }, [document, isAutoLoading]);

  if (!document) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        {isAutoLoading ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Auto-loading debug book...</p>
          </div>
        ) : (
          <DocumentUploader onDocumentUploaded={handleDocumentUploaded} />
        )}
      </div>
    );
  }

  return (
    <ReaderLayout 
      document={document} 
      fileName={fileName}
      onReset={() => {
        setDocument(null);
        setFileName('');
      }}
    />
  );
}