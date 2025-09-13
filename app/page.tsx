'use client';

import { useState, useEffect } from 'react';
import { DocumentUploader } from '@/components/DocumentUploader';
import { ReaderLayout } from '@/components/ReaderLayout';
import { LibrarySidebar } from '@/components/LibrarySidebar';
import { ParsedDocument } from '@/types/document';
import { LibraryBook } from '@/types/library';
import { libraryStorage } from '@/lib/library-storage';
import { generateId } from '@/lib/utils';

export default function Home() {
  const [document, setDocument] = useState<ParsedDocument | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [currentBookId, setCurrentBookId] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleDocumentUploaded = async (doc: ParsedDocument, file: string) => {
    // Create a library entry for the uploaded book
    const bookId = generateId();
    const libraryBook: LibraryBook = {
      id: bookId,
      fileName: file,
      title: doc.metadata.title || file,
      author: doc.metadata.author,
      coverImage: doc.metadata.coverImage,
      addedDate: new Date(),
      lastOpened: new Date(),
    };

    // Save to library
    await libraryStorage.addBook(libraryBook, doc);
    
    // Trigger library update
    window.dispatchEvent(new Event('library-updated'));

    // Set as current document
    setDocument(doc);
    setFileName(file);
    setCurrentBookId(bookId);
    setShowUploader(false);
  };

  const handleSelectBook = async (bookId: string) => {
    setIsLoading(true);
    try {
      const doc = await libraryStorage.getDocument(bookId);
      const books = await libraryStorage.getBooks();
      const book = books.find(b => b.id === bookId);
      
      if (doc && book) {
        setDocument(doc);
        setFileName(book.fileName);
        setCurrentBookId(bookId);
        setShowUploader(false);
        
        // Update last opened
        await libraryStorage.updateBookProgress(bookId, '', 0);
      }
    } catch (error) {
      console.error('Failed to load book:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setDocument(null);
    setFileName('');
    setCurrentBookId(null);
    setShowUploader(true);
  };

  const handleUploadClick = () => {
    setShowUploader(true);
    setDocument(null);
    setFileName('');
  };

  return (
    <div className="h-screen flex">
      {/* Library Sidebar */}
      <LibrarySidebar 
        onSelectBook={handleSelectBook}
        onUploadClick={handleUploadClick}
        currentBookId={currentBookId || undefined}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading book...</p>
            </div>
          </div>
        ) : document ? (
          <ReaderLayout 
            document={document} 
            fileName={fileName}
            onReset={handleReset}
          />
        ) : showUploader ? (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <DocumentUploader onDocumentUploaded={handleDocumentUploaded} />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-500">
              <p className="text-lg mb-4">Welcome to your reading library</p>
              <p>Select a book from the library or upload a new one</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}