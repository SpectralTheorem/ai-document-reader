# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server on http://localhost:3000
- `npm run build` - Build the application for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint checks

### Testing
No test commands are currently configured in this project.

## Architecture

This is a Next.js 15 application with TypeScript that serves as an AI-powered document reader with advanced EPUB support and multi-provider AI integration.

### Core Components

**Document Processing Pipeline:**
- `DocumentFactory` (lib/parsers/document-factory.ts) - Main entry point for document parsing, handles type detection and routing
- `EPUBParser` (lib/parsers/epub-parser.ts) - Advanced EPUB parser that extracts HTML, text, chapters, and metadata
- Document types are defined in `types/document.ts` (EPUB support is complete, PDF planned)

**AI Integration:**
- `AIProvider` (lib/ai-providers.ts) - Unified interface supporting three providers:
  - **Ollama** (local): Default http://localhost:11434, supports streaming with both content and thinking tokens
  - **OpenAI**: Supports streaming, requires API key
  - **Anthropic**: Basic support, requires API key
- AI configuration uses environment variables from `.env` (see `.env.example`)

**Library System:**
- `LibraryBook` and `Library` interfaces (types/library.ts) - Support for persistent book collections
- `library-storage.ts` - Handles book metadata and progress tracking
- `LibrarySidebar` component - Library management UI

**UI Architecture:**
- `ReaderLayout` - Main split-pane interface (chapters sidebar + content/chat area)
- `ChapterList` - Navigation for document sections
- `ReaderPane` - Displays formatted document content with preserved HTML
- `ChatInterface` - Context-aware AI conversations about current chapter
- `DocumentUploader` - File upload with progress visualization

### API Endpoints
- `/api/upload` - Document upload and parsing
- `/api/ai/route.ts` - Non-streaming AI chat
- `/api/ai/stream/route.ts` - Streaming AI responses
- `/api/sections` - Chapter/section content retrieval
- `/api/library/scan` - Library directory scanning
- `/api/debug/book` - Book debugging utilities

### File Structure
- `app/` - Next.js App Router pages and API routes
- `components/` - React components with UI primitives in `ui/`
- `lib/` - Core business logic, parsers, and utilities
- `types/` - TypeScript type definitions
- `uploads/` - Temporary file storage directory

### Key Technical Details
- Uses Radix UI primitives for accessible components
- Tailwind CSS for styling with custom typography
- Document content preserves original HTML formatting (italics, bold, paragraphs, lists)
- Streaming AI responses support both regular content and "thinking" tokens (Ollama)
- Library books can be loaded from uploads or scanned directories
- TypeScript configuration uses path aliases (`@/*` maps to root)

### Environment Variables
Optional API keys can be configured in `.env`:
- `OPENAI_API_KEY` - For OpenAI integration
- `ANTHROPIC_API_KEY` - For Anthropic integration
- `OLLAMA_BASE_URL` - Ollama server URL (defaults to localhost:11434)

### Development Notes
- The app supports drag-and-drop EPUB uploads with detailed progress feedback
- Chat interface maintains context awareness of currently selected chapter
- AI responses can include pre-built actions (summarize, extract facts, explain concepts, generate questions)
- Book content is displayed with professional typography using Georgia serif font
