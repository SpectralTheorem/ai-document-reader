import { LibraryBook } from '@/types/library';
import { ParsedDocument } from '@/types/document';

const DB_NAME = 'ReaderLibrary';
const DB_VERSION = 1;
const BOOKS_STORE = 'books';
const DOCUMENTS_STORE = 'documents';

class LibraryStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create books metadata store
        if (!db.objectStoreNames.contains(BOOKS_STORE)) {
          const booksStore = db.createObjectStore(BOOKS_STORE, { keyPath: 'id' });
          booksStore.createIndex('fileName', 'fileName', { unique: false });
          booksStore.createIndex('addedDate', 'addedDate', { unique: false });
        }

        // Create documents content store
        if (!db.objectStoreNames.contains(DOCUMENTS_STORE)) {
          db.createObjectStore(DOCUMENTS_STORE, { keyPath: 'id' });
        }
      };
    });
  }

  async addBook(book: LibraryBook, document: ParsedDocument): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([BOOKS_STORE, DOCUMENTS_STORE], 'readwrite');
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      // Store book metadata
      transaction.objectStore(BOOKS_STORE).put(book);
      
      // Store document content
      transaction.objectStore(DOCUMENTS_STORE).put({
        id: book.id,
        document
      });
    });
  }

  async getBooks(): Promise<LibraryBook[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([BOOKS_STORE], 'readonly');
      const request = transaction.objectStore(BOOKS_STORE).getAll();

      request.onsuccess = () => {
        const books = request.result.map(book => ({
          ...book,
          lastOpened: book.lastOpened ? new Date(book.lastOpened) : undefined,
          addedDate: new Date(book.addedDate)
        }));
        resolve(books);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getDocument(bookId: string): Promise<ParsedDocument | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DOCUMENTS_STORE], 'readonly');
      const request = transaction.objectStore(DOCUMENTS_STORE).get(bookId);

      request.onsuccess = () => {
        resolve(request.result?.document || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async updateBookProgress(bookId: string, sectionId: string, percentage: number): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([BOOKS_STORE], 'readwrite');
      const store = transaction.objectStore(BOOKS_STORE);
      const getRequest = store.get(bookId);

      getRequest.onsuccess = () => {
        const book = getRequest.result;
        if (book) {
          book.lastOpened = new Date();
          book.progress = { sectionId, percentage };
          store.put(book);
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async deleteBook(bookId: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([BOOKS_STORE, DOCUMENTS_STORE], 'readwrite');
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      transaction.objectStore(BOOKS_STORE).delete(bookId);
      transaction.objectStore(DOCUMENTS_STORE).delete(bookId);
    });
  }
}

export const libraryStorage = new LibraryStorage();