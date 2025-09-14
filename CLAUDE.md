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
  - **Anthropic**: Supports streaming, requires API key, **enables multi-agent research system**
- AI configuration uses environment variables from `.env` (see `.env.example`)

**Multi-Agent Research System (Claude Code for Books):**
- `BookResearchOrchestrator` (lib/agents/BookResearchOrchestrator.ts) - Coordinates specialized research agents
- **Specialized Agents:**
  - `BookSearchAgent` - Semantic content discovery across entire book
  - `EvidenceAgent` - Claim verification and supporting evidence gathering
  - `AnalysisAgent` - Cross-referencing, pattern analysis, and synthesis
  - `ContextAgent` - Book structure understanding and thematic relationships
- **Orchestrator-Worker Pattern**: Parallel agent execution with intelligent query analysis
- **Auto-activation**: Enabled automatically when using Anthropic provider with API key

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
- `/api/book-research` - **Multi-agent research system endpoint**
- `/api/sections` - Chapter/section content retrieval
- `/api/library/scan` - Library directory scanning
- `/api/debug/book` - Book debugging utilities

### File Structure
- `app/` - Next.js App Router pages and API routes
- `components/` - React components with UI primitives in `ui/`
- `lib/` - Core business logic, parsers, and utilities
  - `lib/agents/` - **Multi-agent research system components**
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
- Chat interface has **automatic multi-agent research enhancement** when using Anthropic provider
- **Research agents activate transparently** - no manual tool selection required
- AI responses include comprehensive book-wide analysis, evidence gathering, and cross-referencing
- Book content is displayed with professional typography using Georgia serif font

### Multi-Agent Research Usage
**Automatic Activation Requirements:**
1. Anthropic provider selected in settings
2. Valid `ANTHROPIC_API_KEY` configured
3. Book successfully loaded with context enabled

**User Experience:**
- Users ask questions naturally (no special commands needed)
- System automatically determines query type (factual, analytical, comparative, evaluative)
- Parallel agents execute: search, evidence gathering, analysis, context understanding
- Response synthesizes findings into research-grade analysis
- Blue status indicator shows when multi-agent system is active

**Query Types Handled:**
- **Factual**: "What does the author say about X?" → BookSearchAgent + EvidenceAgent + ContextAgent
- **Analytical**: "How does X work?" → All agents for comprehensive analysis
- **Comparative**: "How does X relate to Y?" → AnalysisAgent + ContextAgent
- **Evaluative**: "Is X well-supported?" → EvidenceAgent + AnalysisAgent + ContextAgent
