'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DocumentUploader } from '@/components/DocumentUploader';
import { ReaderLayout } from '@/components/ReaderLayout';
import { ParsedDocument } from '@/types/document';
import { LibraryBook } from '@/types/library';
import { libraryStorage } from '@/lib/library-storage';
import { generateId } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Library, BookOpen } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [document, setDocument] = useState<ParsedDocument | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [currentBookId, setCurrentBookId] = useState<string | null>(null);
  const [currentBook, setCurrentBook] = useState<LibraryBook | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load book from URL parameter on mount
  useEffect(() => {
    const bookId = searchParams.get('book');
    if (bookId) {
      loadBookFromId(bookId);
    }
  }, [searchParams]);

  const loadBookFromId = async (bookId: string) => {
    setIsLoading(true);
    try {
      const doc = await libraryStorage.getDocument(bookId);
      const books = await libraryStorage.getBooks();
      const book = books.find(b => b.id === bookId);

      if (doc && book) {
        setDocument(doc);
        setFileName(book.fileName);
        setCurrentBookId(bookId);
        setCurrentBook(book);
        setShowUploader(false);

        // Update last opened
        await libraryStorage.updateBookProgress(bookId, '', 0);
      } else {
        // Book not found, redirect to library
        router.push('/library');
      }
    } catch (error) {
      console.error('Failed to load book:', error);
      router.push('/library');
    } finally {
      setIsLoading(false);
    }
  };

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

    // Set as current document and update URL
    setDocument(doc);
    setFileName(file);
    setCurrentBookId(bookId);
    setCurrentBook(libraryBook);
    setShowUploader(false);

    // Update URL to reflect the current book
    router.push(`/?book=${bookId}`);
  };

  const handleGoToLibrary = () => {
    router.push('/library');
  };

  // If no book is specified in URL and no document loaded, redirect to library
  if (!searchParams.get('book') && !document && !showUploader) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Library className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Welcome to Your Reader</h1>
          <p className="text-gray-600 mb-6">Choose a book from your library or upload a new one to get started</p>
          <div className="space-x-4">
            <Button onClick={handleGoToLibrary} className="bg-blue-600 hover:bg-blue-700">
              <Library className="h-4 w-4 mr-2" />
              Browse Library
            </Button>
            <Button onClick={() => setShowUploader(true)} variant="outline">
              <BookOpen className="h-4 w-4 mr-2" />
              Upload Book
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen">
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center bg-gray-50 h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading book...</p>
          </div>
        </div>
      ) : document ? (
        <ReaderLayout
          document={document}
          fileName={fileName}
          currentBook={currentBook}
          onGoToLibrary={handleGoToLibrary}
        />
      ) : showUploader ? (
        <div className="flex-1 flex items-center justify-center bg-gray-50 h-full">
          <div className="max-w-md w-full">
            <div className="mb-6 text-center">
              <Button
                variant="ghost"
                onClick={handleGoToLibrary}
                className="mb-4"
              >
                ← Back to Library
              </Button>
              <h2 className="text-xl font-semibold text-gray-900">Upload New Book</h2>
            </div>
            <DocumentUploader onDocumentUploaded={handleDocumentUploaded} />
          </div>
        </div>
      ) : null}
    </div>
  );
}