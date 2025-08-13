'use client';

import { useState } from 'react';
import { DocumentUploader } from '@/components/DocumentUploader';
import { ReaderLayout } from '@/components/ReaderLayout';
import { ParsedDocument } from '@/types/document';

export default function Home() {
  const [document, setDocument] = useState<ParsedDocument | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const handleDocumentUploaded = (doc: ParsedDocument, file: string) => {
    setDocument(doc);
    setFileName(file);
  };

  if (!document) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <DocumentUploader onDocumentUploaded={handleDocumentUploaded} />
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