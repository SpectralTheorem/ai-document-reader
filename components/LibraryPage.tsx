'use client';

import { useState, useEffect } from 'react';
import { LibraryBook } from '@/types/library';
import { BookCard } from '@/components/BookCard';
import { DocumentUploader } from '@/components/DocumentUploader';
import { Button } from '@/components/ui/button';
import {
  Library,
  Search,
  Grid3X3,
  List,
  Upload,
  FolderOpen,
  Filter,
  SortAsc,
  SortDesc,
  Clock,
  Star,
  BookMarked
} from 'lucide-react';
import { libraryStorage } from '@/lib/library-storage';

interface LibraryPageProps {
  onSelectBook: (bookId: string) => void;
  onBookUploaded: (doc: any, fileName: string) => void;
  currentBookId?: string;
}

type SortOption = 'recent' | 'title' | 'author' | 'progress' | 'added';
type FilterOption = 'all' | 'reading' | 'finished' | 'unread';

export function LibraryPage({ onSelectBook, onBookUploaded, currentBookId }: LibraryPageProps) {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<LibraryBook[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadBooks();
  }, []);

  useEffect(() => {
    const handleLibraryUpdate = () => loadBooks();
    window.addEventListener('library-updated', handleLibraryUpdate);
    return () => window.removeEventListener('library-updated', handleLibraryUpdate);
  }, []);

  useEffect(() => {
    filterAndSortBooks();
  }, [books, searchQuery, sortBy, filterBy]);

  const loadBooks = async () => {
    try {
      setIsLoading(true);
      const libraryBooks = await libraryStorage.getBooks();
      setBooks(libraryBooks);
    } catch (error) {
      console.error('Failed to load library:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortBooks = () => {
    let filtered = [...books];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(book =>
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply category filter
    if (filterBy !== 'all') {
      filtered = filtered.filter(book => {
        const progress = book.progress?.percentage || 0;
        switch (filterBy) {
          case 'reading':
            return progress > 0 && progress < 100;
          case 'finished':
            return progress >= 100;
          case 'unread':
            return progress === 0;
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'author':
          return (a.author || '').localeCompare(b.author || '');
        case 'progress':
          return (b.progress?.percentage || 0) - (a.progress?.percentage || 0);
        case 'added':
          return b.addedDate.getTime() - a.addedDate.getTime();
        case 'recent':
        default:
          return (b.lastOpened?.getTime() || b.addedDate.getTime()) -
                 (a.lastOpened?.getTime() || a.addedDate.getTime());
      }
    });

    setFilteredBooks(filtered);
  };

  const handleDeleteBook = async (bookId: string) => {
    await libraryStorage.deleteBook(bookId);
    await loadBooks();
    setSelectedBooks(prev => {
      const next = new Set(prev);
      next.delete(bookId);
      return next;
    });
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

  const handleDocumentUploaded = async (doc: any, fileName: string) => {
    // The upload handling will be done in the parent component
    setShowUploader(false);
    onBookUploaded(doc, fileName);
  };

  const getFilterCount = (filter: FilterOption) => {
    if (filter === 'all') return books.length;
    return books.filter(book => {
      const progress = book.progress?.percentage || 0;
      switch (filter) {
        case 'reading': return progress > 0 && progress < 100;
        case 'finished': return progress >= 100;
        case 'unread': return progress === 0;
        default: return true;
      }
    }).length;
  };

  if (showUploader) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="mb-6 text-center">
            <Button
              variant="ghost"
              onClick={() => setShowUploader(false)}
              className="mb-4"
            >
              ← Back to Library
            </Button>
            <h2 className="text-xl font-semibold text-gray-900">Upload New Book</h2>
          </div>
          <DocumentUploader onDocumentUploaded={handleDocumentUploaded} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Library className="h-6 w-6 text-gray-700" />
            <h1 className="text-xl font-semibold text-gray-900">My Library</h1>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {books.length} {books.length === 1 ? 'book' : 'books'}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              onClick={() => setShowUploader(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Book
            </Button>

            <Button
              onClick={handleDirectoryPick}
              variant="outline"
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              Add Folder
            </Button>
          </div>
        </div>
      </header>

      {/* Controls */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search books by title or author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* View Controls */}
          <div className="flex items-center space-x-4">
            {/* Filters */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as FilterOption)}
                className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Books ({getFilterCount('all')})</option>
                <option value="reading">Currently Reading ({getFilterCount('reading')})</option>
                <option value="finished">Finished ({getFilterCount('finished')})</option>
                <option value="unread">Unread ({getFilterCount('unread')})</option>
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center space-x-2">
              <SortAsc className="h-4 w-4 text-gray-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="recent">Recently Opened</option>
                <option value="title">Title (A-Z)</option>
                <option value="author">Author (A-Z)</option>
                <option value="progress">Reading Progress</option>
                <option value="added">Date Added</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-8 w-8 p-0"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-8 w-8 p-0"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Books Display */}
      <main className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your library...</p>
            </div>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="text-center py-12">
            <BookMarked className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery || filterBy !== 'all' ? 'No books found' : 'Your library is empty'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || filterBy !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by uploading your first book'
              }
            </p>
            {!searchQuery && filterBy === 'all' && (
              <Button onClick={() => setShowUploader(true)} className="bg-blue-600 hover:bg-blue-700">
                <Upload className="h-4 w-4 mr-2" />
                Upload Your First Book
              </Button>
            )}
          </div>
        ) : (
          <div className={
            viewMode === 'grid'
              ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6'
              : 'space-y-4 max-w-4xl'
          }>
            {filteredBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                viewMode={viewMode}
                onSelectBook={onSelectBook}
                onDeleteBook={handleDeleteBook}
                isSelected={currentBookId === book.id}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}