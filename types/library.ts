export interface LibraryBook {
  id: string;
  fileName: string;
  title: string;
  author?: string;
  coverImage?: string;
  lastOpened?: Date;
  addedDate: Date;
  filePath?: string; // For directory-loaded books
  fileSize?: number;
  progress?: {
    sectionId?: string;
    percentage?: number;
  };
}

export interface Library {
  books: LibraryBook[];
  currentBookId?: string;
  libraryPath?: string; // Directory being watched
}