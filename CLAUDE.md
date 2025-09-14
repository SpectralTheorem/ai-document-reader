# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server on http://localhost:3005
- `npm run build` - Build the application for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint checks

### Testing
No test commands are currently configured in this project.

## Architecture Overview

This is a Next.js 15 application with TypeScript that serves as an AI-powered document reader with advanced EPUB support and comprehensive multi-agent AI research capabilities.

## Core System Components

### 📚 **Document Processing Pipeline**
- `DocumentFactory` (lib/parsers/document-factory.ts) - Main entry point for document parsing, handles type detection and routing
- `EPUBParser` (lib/parsers/epub-parser.ts) - Advanced EPUB parser that extracts HTML, text, chapters, and metadata
- Document types are defined in `types/document.ts` (EPUB support is complete, PDF planned)

### 🤖 **Multi-Agent Research System**
**Core Architecture:**
- `BookResearchOrchestrator` (lib/agents/BookResearchOrchestrator.ts) - Main coordinator for parallel agent execution
- `BaseAgent` (lib/agents/BaseAgent.ts) - Abstract base class with Claude API integration

**Specialized Research Agents:**
- `BookSearchAgent` - Semantic content discovery and passage retrieval across entire book
- `EvidenceAgent` - Claim verification, evidence gathering, and supporting material identification
- `AnalysisAgent` - Cross-referencing, pattern analysis, and argument structure examination
- `ContextAgent` - Book structure understanding, thematic relationships, and prerequisite knowledge mapping

**Key Features:**
- **Orchestrator-Worker Pattern**: Parallel agent execution with intelligent query analysis
- **Query Type Detection**: Automatic routing to appropriate agent combinations (factual, analytical, comparative, evaluative)
- **Research Synthesis**: Sophisticated combination of agent findings into comprehensive responses
- **Auto-activation**: Transparently enabled when using Anthropic provider with valid API key

### ⚙️ **Configuration Management System**
- `config.yaml` - Centralized configuration for all AI providers, models, and research settings
- `lib/config.ts` - ConfigManager singleton with provider-specific methods and model selection
- **Dynamic Model Loading**: All model references pull from YAML configuration instead of hardcoded values
- **Client-Server Architecture**: `/api/config` endpoint serves configuration to client-side components

### 🔗 **AI Provider Integration**
- `AIProvider` (lib/ai-providers.ts) - Unified interface supporting three providers:
  - **Ollama** (local): Default http://localhost:11434, supports streaming with content and thinking tokens
  - **OpenAI**: Supports streaming, requires API key, pulls models from config
  - **Anthropic**: Supports streaming, requires API key, **enables multi-agent research system**
- **Proper API Integration**: Fixed system message handling for Anthropic's new message format
- **Configuration-Driven**: All models and settings pulled from config.yaml

### 📖 **Library & Conversation System**
- `LibraryBook` and `Library` interfaces (types/library.ts) - Support for persistent book collections
- `library-storage.ts` - Handles book metadata and progress tracking
- `conversationStorage` - Persistent multi-thread conversation system per chapter
- `LibrarySidebar` component - Library management UI with book scanning capabilities

### 🖥️ **User Interface Architecture**
- `ReaderLayout` - Main split-pane interface (chapters sidebar + content/chat area)
- `ChapterList` - Navigation for document sections
- `ReaderPane` - Displays formatted document content with preserved HTML
- `ChatInterface` - **Decluttered interface** with context-aware AI conversations and transparent multi-agent research
- `SettingsModal` - **Dynamic model selection** loaded from configuration system
- `DocumentUploader` - File upload with progress visualization

### 🛠️ **Debug & Development**
- `/debug` - **Standalone debug console page** for comprehensive multi-agent orchestration visualization
- Real-time agent execution monitoring (WebSocket support planned)
- Interactive agent result exploration and debugging capabilities

## API Endpoints

### Core Application
- `/api/upload` - Document upload and parsing
- `/api/ai/route.ts` - Non-streaming AI chat with configuration-based model selection
- `/api/ai/stream/route.ts` - Streaming AI responses with proper system message handling
- `/api/sections` - Chapter/section content retrieval
- `/api/library/scan` - Library directory scanning

### Multi-Agent Research System
- `/api/book-research` - **Primary research endpoint** coordinating specialized agent execution
- `/api/config` - Configuration serving endpoint for client-side dynamic model loading
- `/api/test-anthropic` - API validation and testing endpoint

### Development & Debug
- `/debug` - Standalone debug console for agent orchestration visualization

## File Structure

```
app/                     # Next.js App Router pages and API routes
├── api/
│   ├── book-research/   # Multi-agent research coordination
│   ├── config/          # Configuration serving
│   └── ai/              # AI provider integration
├── debug/               # Standalone debug console page
components/              # React components with UI primitives in ui/
lib/
├── agents/              # Complete multi-agent research system
│   ├── BookResearchOrchestrator.ts
│   ├── BaseAgent.ts
│   ├── BookSearchAgent.ts
│   ├── EvidenceAgent.ts
│   ├── AnalysisAgent.ts
│   └── ContextAgent.ts
├── parsers/             # Document processing pipeline
├── ai-providers.ts      # Unified AI provider interface
└── config.ts            # Configuration management system
types/                   # TypeScript type definitions
uploads/                 # Temporary file storage directory
config.yaml              # Central configuration for models and providers
```

## Key Technical Details

### Multi-Agent Research Integration
- **Transparent Activation**: Research agents automatically enhance responses when using Anthropic provider
- **Query Intelligence**: System analyzes questions to determine optimal agent combination
- **Parallel Execution**: Multiple agents work simultaneously for comprehensive book analysis
- **Research-Grade Output**: Responses include evidence gathering, cross-referencing, and contextual analysis

### Configuration System
- **Dynamic Model Selection**: Settings UI populated from config.yaml
- **Client-Server Architecture**: Configuration served via API to avoid browser compatibility issues
- **Centralized Management**: Single source of truth for all AI models and provider settings

### Development Features
- **Debug Console**: Comprehensive visualization of agent orchestration at `/debug`
- **Real-time Monitoring**: Live agent execution tracking (WebSocket integration planned)
- **Interactive Debugging**: Ability to inspect agent prompts, outputs, and synthesis process

### UI/UX Enhancements
- **Clean Chat Interface**: Decluttered header focusing on essential navigation
- **Dynamic Settings**: Model dropdowns automatically populated from configuration
- **Visual Feedback**: Clear indicators when multi-agent research system is active

## Environment Variables

Optional API keys configured in `.env`:
- `OPENAI_API_KEY` - For OpenAI integration and model access
- `ANTHROPIC_API_KEY` - For Anthropic integration and multi-agent research system
- `OLLAMA_BASE_URL` - Ollama server URL (defaults to localhost:11434)

## Multi-Agent Research Usage

### Automatic Activation Requirements
1. Anthropic provider selected in settings
2. Valid `ANTHROPIC_API_KEY` configured in environment
3. Book successfully loaded with full context enabled

### User Experience
- **Transparent Operation**: Users ask questions naturally without special commands
- **Intelligent Routing**: System automatically determines query type and agent selection
- **Parallel Processing**: Multiple specialized agents execute simultaneously
- **Comprehensive Responses**: Synthesized findings provide research-grade analysis
- **Visual Feedback**: Blue indicator shows when multi-agent system is active

### Query Types & Agent Coordination
- **Factual**: "What does the author say about X?" → BookSearchAgent + EvidenceAgent + ContextAgent
- **Analytical**: "How does X work?" → All agents for comprehensive analysis
- **Comparative**: "How does X relate to Y?" → AnalysisAgent + ContextAgent
- **Evaluative**: "Is X well-supported?" → EvidenceAgent + AnalysisAgent + ContextAgent

### Debug Console Features
- **Agent Orchestration Visualization**: Real-time view of agent execution
- **Individual Agent Outputs**: Inspect raw results before synthesis
- **Performance Monitoring**: Execution timing and confidence metrics
- **Interactive Debugging**: Ability to replay and modify agent results

## Development Principles

- **Configuration-Driven**: All models, providers, and settings managed through config.yaml
- **Client-Server Separation**: Proper boundaries between browser and Node.js capabilities
- **Transparent AI Enhancement**: Multi-agent research operates seamlessly without user complexity
- **Privacy-First**: Book content processed client-side with no external data transmission
- **Debug-Friendly**: Comprehensive tooling for understanding and improving AI agent behavior

This architecture provides a sophisticated, transparent, and highly configurable AI research system for in-depth book analysis while maintaining excellent user experience and developer debugging capabilities.