'use client';

import { useState, useEffect } from 'react';
import { LibraryBook } from '@/types/library';
import { Button } from '@/components/ui/button';
import { 
  Library, 
  FolderOpen, 
  Search, 
  Trash2, 
  Clock, 
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Upload
} from 'lucide-react';
import { libraryStorage } from '@/lib/library-storage';
import { formatDistanceToNow } from '@/lib/utils';

interface LibrarySidebarProps {
  onSelectBook: (bookId: string) => void;
  onUploadClick: () => void;
  currentBookId?: string;
}

export function LibrarySidebar({ onSelectBook, onUploadClick, currentBookId }: LibrarySidebarProps) {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBooks();
  }, []);

  useEffect(() => {
    const handleLibraryUpdate = () => loadBooks();
    window.addEventListener('library-updated', handleLibraryUpdate);
    return () => window.removeEventListener('library-updated', handleLibraryUpdate);
  }, []);

  const loadBooks = async () => {
    try {
      setIsLoading(true);
      const libraryBooks = await libraryStorage.getBooks();
      setBooks(libraryBooks.sort((a, b) => 
        (b.lastOpened?.getTime() || b.addedDate.getTime()) - 
        (a.lastOpened?.getTime() || a.addedDate.getTime())
      ));
    } catch (error) {
      console.error('Failed to load library:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBook = async (bookId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to remove this book from your library?')) {
      await libraryStorage.deleteBook(bookId);
      await loadBooks();
    }
  };

  const handleDirectoryPick = async () => {
    try {
      const response = await fetch('/api/library/scan', {
        method: 'POST',
      });
      if (response.ok) {
        await loadBooks();
      }
    } catch (error) {
      console.error('Failed to scan directory:', error);
    }
  };

  const filteredBooks = books.filter(book => 
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isCollapsed) {
    return (
      <div className="w-12 bg-gray-900 text-white flex flex-col items-center py-4">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 hover:bg-gray-800 rounded"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        <div className="mt-4">
          <Library className="h-5 w-5" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-gray-900 text-white flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Library className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Library</h2>
          </div>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1 hover:bg-gray-800 rounded"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search books..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 space-y-2 border-b border-gray-800">
        <Button
          onClick={onUploadClick}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Book
        </Button>
        <Button
          onClick={handleDirectoryPick}
          variant="outline"
          className="w-full border-gray-700 hover:bg-gray-800"
        >
          <FolderOpen className="h-4 w-4 mr-2" />
          Add Folder
        </Button>
      </div>

      {/* Books List */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="text-center text-gray-400 py-8">
            Loading library...
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            {searchQuery ? 'No books found' : 'Your library is empty'}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredBooks.map((book) => (
              <div
                key={book.id}
                onClick={() => onSelectBook(book.id)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  currentBookId === book.id
                    ? 'bg-blue-600'
                    : 'hover:bg-gray-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">
                      {book.title}
                    </h3>
                    {book.author && (
                      <p className="text-xs text-gray-400 truncate">
                        {book.author}
                      </p>
                    )}
                    <div className="flex items-center space-x-2 mt-2">
                      {book.lastOpened && (
                        <span className="text-xs text-gray-500 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDistanceToNow(book.lastOpened)}
                        </span>
                      )}
                      {book.progress?.percentage && (
                        <span className="text-xs text-gray-500">
                          {Math.round(book.progress.percentage)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteBook(book.id, e)}
                    className="p-1 hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-gray-800 text-xs text-gray-400">
        {books.length} {books.length === 1 ? 'book' : 'books'} in library
      </div>
    </div>
  );
}