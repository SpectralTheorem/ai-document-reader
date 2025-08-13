# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-08-13

### Added
- 📚 **Advanced EPUB Support**
  - Rich EPUB parsing with JSZip and xml2js
  - NCX table of contents extraction
  - Spine fallback for chapter ordering
  - HTML content preservation alongside text extraction
  
- 🎨 **Professional Reading Experience**
  - Georgia serif typography with optimized spacing
  - Direct HTML rendering for authentic formatting
  - Preserved italics, bold text, paragraphs, and lists
  - Justified text with proper line height
  - Book-like margins and layout

- 🤖 **Multi-Provider AI Integration**
  - Local AI support via Ollama
  - Cloud AI support (OpenAI, Anthropic)
  - Context-aware chapter conversations
  - Streaming responses for better UX
  
- 🔧 **AI-Powered Actions**
  - Extract empirical facts and statistics
  - Summarize content and key points
  - Explain concepts in simple terms
  - Generate discussion questions
  - Identify key concepts and terminology

- 🎨 **Modern User Interface**
  - Split-pane layout with responsive design
  - Drag-and-drop file upload
  - Detailed progress visualization during upload
  - Toggle between reading and chat modes
  - Clean chapter navigation sidebar

- 🏗️ **Robust Architecture**
  - Next.js 15 with App Router
  - TypeScript for type safety
  - Tailwind CSS with custom styling
  - Modular component structure
  - Error handling and fallbacks

### Technical Details
- Built with Next.js 15, TypeScript, and Tailwind CSS
- Uses JSZip for EPUB archive processing
- Cheerio for HTML parsing and content extraction
- xml2js for metadata processing
- Radix UI components with Lucide React icons
- Styled-jsx for component-scoped styling

### Dependencies
- Core: React 19, Next.js 15, TypeScript
- Styling: Tailwind CSS, styled-jsx
- Document Processing: jszip, cheerio, xml2js
- AI Integration: axios
- UI Components: @radix-ui/react-*, lucide-react

[1.0.0]: https://github.com/username/ai-document-reader/releases/tag/v1.0.0