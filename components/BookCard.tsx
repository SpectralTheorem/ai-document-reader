'use client';

import { LibraryBook } from '@/types/library';
import { formatDistanceToNow } from '@/lib/utils';
import { Clock, Trash2, BookOpen, User, Calendar, MoreVertical } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface BookCardProps {
  book: LibraryBook;
  viewMode: 'grid' | 'list';
  onSelectBook: (bookId: string) => void;
  onDeleteBook: (bookId: string) => void;
  isSelected?: boolean;
}

export function BookCard({ book, viewMode, onSelectBook, onDeleteBook, isSelected }: BookCardProps) {
  const [showActions, setShowActions] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Remove "${book.title}" from your library?`)) {
      onDeleteBook(book.id);
    }
  };

  const progressPercentage = book.progress?.percentage || 0;

  if (viewMode === 'grid') {
    return (
      <div
        onClick={() => onSelectBook(book.id)}
        className={`group relative bg-white rounded-lg shadow-sm border-2 transition-all duration-200 cursor-pointer hover:shadow-md hover:scale-[1.02] ${
          isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
        }`}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Cover Image */}
        <div className="aspect-[3/4] bg-gradient-to-br from-blue-50 to-purple-50 rounded-t-lg relative overflow-hidden">
          {book.coverImage ? (
            <img
              src={book.coverImage}
              alt={`${book.title} cover`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen className="h-12 w-12 text-gray-400" />
            </div>
          )}

          {/* Progress Bar */}
          {progressPercentage > 0 && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/20">
              <div
                className="h-1 bg-blue-500 transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          )}

          {/* Actions */}
          {showActions && (
            <div className="absolute top-2 right-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                className="h-8 w-8 bg-white/90 hover:bg-white shadow-sm"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          )}
        </div>

        {/* Book Info */}
        <div className="p-4">
          <h3 className="font-semibold text-sm line-clamp-2 text-gray-900 mb-1">
            {book.title}
          </h3>

          {book.author && (
            <p className="text-xs text-gray-600 mb-2 line-clamp-1">
              {book.author}
            </p>
          )}

          <div className="flex items-center justify-between text-xs text-gray-500">
            {book.lastOpened ? (
              <span className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {formatDistanceToNow(book.lastOpened)}
              </span>
            ) : (
              <span className="flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                Added {formatDistanceToNow(book.addedDate)}
              </span>
            )}

            {progressPercentage > 0 && (
              <span className="font-medium text-blue-600">
                {Math.round(progressPercentage)}%
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div
      onClick={() => onSelectBook(book.id)}
      className={`group flex items-center p-4 bg-white rounded-lg border-2 transition-all duration-200 cursor-pointer hover:shadow-sm ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* Cover Thumbnail */}
      <div className="w-12 h-16 bg-gradient-to-br from-blue-50 to-purple-50 rounded flex-shrink-0 mr-4 overflow-hidden">
        {book.coverImage ? (
          <img
            src={book.coverImage}
            alt={`${book.title} cover`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-gray-400" />
          </div>
        )}
      </div>

      {/* Book Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">
              {book.title}
            </h3>

            {book.author && (
              <p className="text-sm text-gray-600 truncate flex items-center mt-1">
                <User className="h-3 w-3 mr-1 flex-shrink-0" />
                {book.author}
              </p>
            )}

            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
              {book.lastOpened ? (
                <span className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  Last read {formatDistanceToNow(book.lastOpened)}
                </span>
              ) : (
                <span className="flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  Added {formatDistanceToNow(book.addedDate)}
                </span>
              )}

              {progressPercentage > 0 && (
                <span className="font-medium text-blue-600">
                  {Math.round(progressPercentage)}% complete
                </span>
              )}
            </div>

            {/* Progress Bar */}
            {progressPercentage > 0 && (
              <div className="w-24 h-1 bg-gray-200 rounded-full mt-2">
                <div
                  className="h-1 bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              className="h-8 w-8 text-red-500 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}