# AI Document Reader

A sophisticated AI-powered document reader with full-book context awareness and intelligent research capabilities. Upload your books and engage with them through comprehensive AI analysis that understands the entire book, not just individual chapters.

## ✨ Features

### 📚 Advanced Document Support
- **Rich EPUB Parsing**: Full chapter navigation with proper formatting preservation
- **Professional Typography**: Georgia serif font with optimized line spacing and justified text
- **Format Preservation**: Maintains italics, bold text, paragraphs, lists, and blockquotes
- **Smart Chapter Detection**: Extracts titles from NCX files or HTML headings
- **HTML Rendering**: Direct rendering of EPUB HTML for authentic book experience

### 🧠 Full-Book AI Intelligence
- **Book-Wide Context Awareness**: AI understands entire book structure and cross-references
- **Persistent Conversation Threads**: Multi-thread discussions per chapter with automatic titles
- **Multiple AI Providers**: Support for local (Ollama) and cloud-based AI (OpenAI, Anthropic)
- **Chapter-Level AI Actions**:
  - 📊 Extract empirical facts and statistics
  - 📝 Summarize content and key points
  - 💡 Explain complex concepts in simple terms
  - ❓ Generate thoughtful discussion questions
  - 🔍 Identify and define key concepts
- **Multi-Agent Research System** (Anthropic API required):
  - 🤖 **BookSearchAgent**: Semantic content discovery across entire book
  - 📊 **EvidenceAgent**: Claim verification and supporting evidence gathering
  - 🔗 **AnalysisAgent**: Cross-referencing, pattern analysis, and synthesis
  - 📖 **ContextAgent**: Book structure understanding and thematic relationships
  - 🧠 **Research Orchestrator**: Coordinates agents and synthesizes findings
- **Enhanced Context Assembly**: AI receives related chapters and book structure, not just current chapter
- **Streaming Responses**: Real-time AI responses with thinking token support

### 🎨 User Experience
- **Intelligent Library Management**: Upload books that persist with reading progress
- **Split-pane Interface**: Elegant layout with chapters on left, content/chat on right
- **Thread-Based Conversations**: Multiple conversation threads per chapter with persistent history
- **Centered Action Interface**: Claude-style action buttons for empty chats
- **Progress Visualization**: Detailed upload progress with step-by-step feedback
- **Responsive Design**: Clean, modern UI that works across devices
- **Instant Thread Creation**: One-click new conversation threads with auto-generated timestamps

## Getting Started

### Prerequisites

- Node.js 18+ installed
- (Optional) Ollama for local AI: https://ollama.ai

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (optional for API providers):
```bash
cp .env.example .env
# Edit .env with your API keys
```

4. Run the development server:
```bash
npm run dev
```

5. Open http://localhost:3000

### Using Ollama (Local AI)

1. Install Ollama: https://ollama.ai
2. Pull a model:
```bash
ollama pull llama2
# or
ollama pull mistral
```
3. Ensure Ollama is running (it starts automatically after installation)
4. Select "Ollama (Local)" in the chat interface

### Using Cloud AI Providers

1. Get API keys from:
   - OpenAI: https://platform.openai.com
   - Anthropic: https://console.anthropic.com

2. Add keys to your `.env` file or enter them in the UI

## Usage

1. **Upload Document**: Drag and drop or browse for EPUB files (auto-saved to library)
2. **Navigate Chapters**: Click chapters in the left sidebar to read or start conversations
3. **Chat with Full Context**: Use chapter-level or full-book context tools
4. **Multiple Conversations**: Create multiple conversation threads per chapter
5. **Multi-Agent Research**: Ask questions naturally - the AI research system automatically:
   - Detects query type (factual, analytical, comparative, evaluative)
   - Deploys specialized agents in parallel
   - Searches entire book content semantically
   - Gathers supporting evidence and cross-references
   - Analyzes patterns and relationships
   - Synthesizes comprehensive research-grade responses
6. **Switch Providers**: Choose between local Ollama or cloud APIs (Anthropic enables full research system)

## 🏗️ Architecture

### Technology Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript for type safety
- **Styling**: Tailwind CSS with custom typography
- **Document Processing**:
  - JSZip for EPUB archive extraction
  - Cheerio for HTML parsing and content extraction
  - xml2js for XML metadata processing
- **Storage**:
  - IndexedDB for client-side book storage and conversation persistence
  - Browser-based book content management for privacy
- **AI Integration**:
  - Axios-based providers for Ollama, OpenAI, and Anthropic
  - **Multi-agent research system** with Claude SDK TypeScript
  - **Orchestrator-worker pattern** with parallel agent execution
  - Full-book context management with semantic search
  - Claude Code-inspired architecture for comprehensive understanding
- **UI Components**: Radix UI primitives with Lucide React icons

### Key Components
- **EPUBParser**: Advanced parser that extracts both HTML and text content
- **DocumentFactory**: Abstracted interface for multiple document types
- **BookResearchOrchestrator**: Coordinates specialized research agents with intelligent query analysis
- **Specialized Research Agents**: BookSearchAgent, EvidenceAgent, AnalysisAgent, ContextAgent
- **BookContextManager**: Full-book context awareness and semantic search
- **ConversationStorage**: Persistent multi-thread conversation management
- **LibraryStorage**: IndexedDB-based book library with progress tracking
- **ReaderLayout**: Responsive split-pane interface with library integration
- **ChatInterface**: Context-aware AI conversation system with automatic research enhancement
- **AIProvider**: Unified interface for multiple AI services with multi-agent capabilities

## Future Enhancements

- [ ] PDF support with smart chapter detection
- [ ] Vector embeddings for enhanced semantic search
- [ ] BOOK.md generation for automatic book summaries
- [ ] Export AI-generated content and conversations
- [ ] Bookmarks and annotations with context linking
- [ ] Multi-document cross-referencing and comparison
- [ ] Advanced semantic search with relevance ranking
- [ ] Integration with external research databases

## Troubleshooting

### Ollama Connection Issues
- Ensure Ollama is running: `ollama list`
- Check if it's accessible: `curl http://localhost:11434/api/tags`
- Verify the model is installed: `ollama pull llama2`

### EPUB Parsing Issues
- Ensure the EPUB file is not corrupted
- Try a different EPUB file to isolate the issue
- Check console for specific error messages

### Book Context Not Available
- Ensure the book has been successfully uploaded and processed
- Check browser console for IndexedDB access issues
- Try refreshing the page to reinitialize book context
- Verify the book contains readable text content

### Multi-Agent Research System Not Working
- Ensure Anthropic is selected as the AI provider in settings
- Verify `ANTHROPIC_API_KEY` is configured in `.env` or entered in UI
- Check that the blue "AI Research Agent Active" indicator appears
- For API key issues, check browser network tab for 401/403 errors
- Rate limiting: Research system will fallback to basic AI if rate limited

## 📸 Screenshots

![Upload Interface](docs/screenshots/upload.png)
*Drag-and-drop upload with detailed progress visualization*

![Reading Interface](docs/screenshots/reader.png)
*Professional book reading experience with preserved formatting*

![AI Chat Interface](docs/screenshots/chat.png)
*Context-aware AI conversations about book content*

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 Changelog

### v2.1.0 (2024-12-15)
- 🤖 **Multi-Agent Research System**: Claude Code for books with 4 specialized research agents
- 🧠 **Automatic AI Enhancement**: Questions automatically enhanced with comprehensive research
- 🔍 **Parallel Agent Execution**: BookSearchAgent, EvidenceAgent, AnalysisAgent, ContextAgent work simultaneously
- 📊 **Query Intelligence**: Automatic detection of factual, analytical, comparative, and evaluative queries
- 🎯 **Research Synthesis**: Multi-agent findings combined into comprehensive, research-grade responses
- ⚡ **Transparent Operation**: No manual tool selection - AI research happens automatically

### v2.0.0 (2024-12-15)
- 🧠 **Full-Book Context Awareness**: AI now understands entire book structure and relationships
- 🔍 **Advanced Book Analysis Tools**: Search, cross-references, key terms, and evidence finding
- 💬 **Multi-Thread Conversations**: Persistent conversation threads per chapter
- 📚 **Intelligent Library Management**: Automatic book storage with reading progress
- 🎯 **Enhanced Context Assembly**: AI receives related chapters and book structure
- 🖼️ **Improved UX**: Centered action buttons, instant thread creation, better navigation

### v1.0.0 (2024-08-13)
- ✨ Initial release with EPUB support
- 🤖 Multi-provider AI integration (Ollama, OpenAI, Anthropic)
- 📚 Advanced HTML formatting preservation
- 🎨 Professional typography and reading experience
- 💬 Context-aware chapter discussions
- 📊 Pre-built AI analysis actions

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- [Project Gutenberg](https://www.gutenberg.org/) for providing free EPUB books for testing
- [Ollama](https://ollama.ai/) for making local AI accessible
- [Next.js](https://nextjs.org/) team for the excellent framework