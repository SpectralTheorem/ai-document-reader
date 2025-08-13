# AI Document Reader

A sophisticated AI-powered document reader with advanced EPUB support and intelligent text interaction capabilities. Upload your books and engage with them through AI-powered conversations and analysis.

## ✨ Features

### 📚 Advanced Document Support
- **Rich EPUB Parsing**: Full chapter navigation with proper formatting preservation
- **Professional Typography**: Georgia serif font with optimized line spacing and justified text
- **Format Preservation**: Maintains italics, bold text, paragraphs, lists, and blockquotes
- **Smart Chapter Detection**: Extracts titles from NCX files or HTML headings
- **HTML Rendering**: Direct rendering of EPUB HTML for authentic book experience

### 🤖 AI-Powered Interactions
- **Context-Aware Chat**: Intelligent conversations about specific chapters
- **Multiple AI Providers**: Support for local (Ollama) and cloud-based AI (OpenAI, Anthropic)
- **Pre-built AI Actions**:
  - 📊 Extract empirical facts and statistics
  - 📝 Summarize content and key points
  - 💡 Explain complex concepts in simple terms
  - ❓ Generate thoughtful discussion questions
  - 🔍 Identify and define key concepts
- **Streaming Responses**: Real-time AI responses for better UX

### 🎨 User Experience
- **Split-pane Interface**: Elegant layout with chapters on left, content/chat on right
- **Progress Visualization**: Detailed upload progress with step-by-step feedback
- **Responsive Design**: Clean, modern UI that works across devices
- **Reading Modes**: Toggle between reading and AI chat interfaces

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

1. **Upload Document**: Drag and drop or browse for EPUB files
2. **Navigate Chapters**: Click chapters in the left sidebar
3. **Read or Chat**: Toggle between reading and AI chat modes
4. **AI Actions**: Use preset actions or ask custom questions
5. **Switch Providers**: Choose between local Ollama or cloud APIs

## 🏗️ Architecture

### Technology Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript for type safety
- **Styling**: Tailwind CSS with custom typography
- **Document Processing**: 
  - JSZip for EPUB archive extraction
  - Cheerio for HTML parsing and content extraction
  - xml2js for XML metadata processing
- **AI Integration**: Axios-based providers for Ollama, OpenAI, and Anthropic
- **UI Components**: Radix UI primitives with Lucide React icons

### Key Components
- **EPUBParser**: Advanced parser that extracts both HTML and text content
- **DocumentFactory**: Abstracted interface for multiple document types
- **ReaderLayout**: Responsive split-pane interface
- **ChatInterface**: Context-aware AI conversation system
- **AIProvider**: Unified interface for multiple AI services

## Future Enhancements

- [ ] PDF support with smart chapter detection
- [ ] Persistent chat history
- [ ] Export AI-generated content
- [ ] Bookmarks and annotations
- [ ] Multi-document support
- [ ] Advanced search functionality

## Troubleshooting

### Ollama Connection Issues
- Ensure Ollama is running: `ollama list`
- Check if it's accessible: `curl http://localhost:11434/api/tags`
- Verify the model is installed: `ollama pull llama2`

### EPUB Parsing Issues
- Ensure the EPUB file is not corrupted
- Try a different EPUB file to isolate the issue
- Check console for specific error messages

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