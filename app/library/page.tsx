'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LibraryPage } from '@/components/LibraryPage';
import { DocumentUploader } from '@/components/DocumentUploader';
import { ParsedDocument } from '@/types/document';
import { LibraryBook } from '@/types/library';
import { libraryStorage } from '@/lib/library-storage';
import { generateId } from '@/lib/utils';

export default function Library() {
  const router = useRouter();

  const handleSelectBook = (bookId: string) => {
    // Navigate to the main reader with the book ID
    router.push(`/?book=${bookId}`);
  };

  const handleDocumentUploaded = async (doc: ParsedDocument, fileName: string) => {
    // Create a library entry for the uploaded book
    const bookId = generateId();
    const libraryBook: LibraryBook = {
      id: bookId,
      fileName: fileName,
      title: doc.metadata.title || fileName,
      author: doc.metadata.author,
      coverImage: doc.metadata.coverImage,
      addedDate: new Date(),
      lastOpened: new Date(),
    };

    // Save to library
    await libraryStorage.addBook(libraryBook, doc);

    // Trigger library update
    window.dispatchEvent(new Event('library-updated'));

    // Navigate to the reader with the new book
    router.push(`/?book=${bookId}`);
  };

  return (
    <LibraryPage
      onSelectBook={handleSelectBook}
      onBookUploaded={handleDocumentUploaded}
    />
  );
}