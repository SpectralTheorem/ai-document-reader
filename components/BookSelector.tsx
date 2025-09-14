'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Book, User, Clock, ChevronDown } from 'lucide-react';
import { BookListItem } from '@/app/api/debug/books/route';

interface BookSelectorProps {
  selectedBookId: string;
  onBookSelect: (bookId: string) => void;
  disabled?: boolean;
}

export function BookSelector({ selectedBookId, onBookSelect, disabled = false }: BookSelectorProps) {
  const [books, setBooks] = useState<BookListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const fetchBooks = async () => {
    setLoading(true);
    setError(null);

    try {
      // Import library storage dynamically to avoid SSR issues
      const { libraryStorage } = await import('@/lib/library-storage');

      // Get books from client-side IndexedDB
      const libraryBooks = await libraryStorage.getBooks();

      const bookList: BookListItem[] = libraryBooks.map(book => ({
        id: book.id,
        title: book.title,
        author: book.author,
        coverUrl: book.coverUrl,
        lastUsed: book.lastOpened?.getTime(),
        sectionsCount: book.sectionsCount
      }));

      setBooks(bookList);
      console.log(`📚 Loaded ${bookList.length} books for selection`);

    } catch (error) {
      console.error('Failed to fetch books:', error);
      setError(error instanceof Error ? error.message : 'Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const selectedBook = books.find(book => book.id === selectedBookId);
  const recentBooks = books.filter(book => book.lastUsed).slice(0, 3);
  const allBooks = books.filter(book => !book.lastUsed || !recentBooks.includes(book));

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium">Select Book</label>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchBooks}
          disabled={loading || disabled}
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled || loading}
          className={`w-full px-3 py-2 text-left border rounded-md bg-white hover:bg-gray-50 flex items-center justify-between ${
            disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <Book className="h-4 w-4 text-gray-400 flex-shrink-0" />
            {loading ? (
              <span className="text-gray-500">Loading books...</span>
            ) : selectedBook ? (
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{selectedBook.title}</div>
                {selectedBook.author && (
                  <div className="text-sm text-gray-500 truncate">by {selectedBook.author}</div>
                )}
              </div>
            ) : (
              <span className="text-gray-500">Choose a book...</span>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && !loading && (
          <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-80 overflow-y-auto">
            {error ? (
              <div className="p-3 text-sm text-red-600">
                {error}
              </div>
            ) : books.length === 0 ? (
              <div className="p-3 text-sm text-gray-500">
                No books found. Make sure books are loaded in the main application.
              </div>
            ) : (
              <>
                {/* Recently Used Books */}
                {recentBooks.length > 0 && (
                  <div>
                    <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b">
                      <Clock className="inline h-3 w-3 mr-1" />
                      Recently Used
                    </div>
                    {recentBooks.map((book) => (
                      <button
                        key={book.id}
                        type="button"
                        onClick={() => {
                          onBookSelect(book.id);
                          setIsOpen(false);
                        }}
                        className={`w-full px-3 py-3 text-left hover:bg-gray-50 border-b last:border-b-0 ${
                          selectedBookId === book.id ? 'bg-blue-50 border-blue-200' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          {book.coverUrl ? (
                            <img
                              src={book.coverUrl}
                              alt={`${book.title} cover`}
                              className="w-8 h-10 object-cover rounded flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-10 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                              <Book className="h-4 w-4 text-gray-400" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm truncate">{book.title}</div>
                            {book.author && (
                              <div className="text-xs text-gray-500 truncate flex items-center">
                                <User className="h-3 w-3 mr-1" />
                                {book.author}
                              </div>
                            )}
                            {book.sectionsCount && (
                              <div className="text-xs text-gray-400">
                                {book.sectionsCount} sections
                              </div>
                            )}
                            <div className="text-xs text-gray-400">
                              Used {formatDate(book.lastUsed)}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* All Books */}
                {allBooks.length > 0 && (
                  <div>
                    {recentBooks.length > 0 && (
                      <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b">
                        All Books
                      </div>
                    )}
                    {allBooks.map((book) => (
                      <button
                        key={book.id}
                        type="button"
                        onClick={() => {
                          onBookSelect(book.id);
                          setIsOpen(false);
                        }}
                        className={`w-full px-3 py-3 text-left hover:bg-gray-50 border-b last:border-b-0 ${
                          selectedBookId === book.id ? 'bg-blue-50 border-blue-200' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          {book.coverUrl ? (
                            <img
                              src={book.coverUrl}
                              alt={`${book.title} cover`}
                              className="w-8 h-10 object-cover rounded flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-10 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                              <Book className="h-4 w-4 text-gray-400" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm truncate">{book.title}</div>
                            {book.author && (
                              <div className="text-xs text-gray-500 truncate flex items-center">
                                <User className="h-3 w-3 mr-1" />
                                {book.author}
                              </div>
                            )}
                            {book.sectionsCount && (
                              <div className="text-xs text-gray-400">
                                {book.sectionsCount} sections
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}