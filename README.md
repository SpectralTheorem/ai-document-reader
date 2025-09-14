# AI Document Reader

A sophisticated AI-powered document reader with comprehensive multi-agent research capabilities and full-book context awareness. Upload your books and engage with them through intelligent AI analysis powered by specialized research agents that work together to provide deep, research-grade insights.

## ✨ Key Features

### 🤖 Multi-Agent Research System
- **Intelligent Agent Orchestration**: Four specialized AI agents work in parallel for comprehensive book analysis
  - **BookSearchAgent**: Semantic content discovery and passage retrieval across entire book
  - **EvidenceAgent**: Claim verification, evidence gathering, and supporting material identification
  - **AnalysisAgent**: Cross-referencing, pattern analysis, and argument structure examination
  - **ContextAgent**: Book structure understanding, thematic relationships, and prerequisite knowledge mapping
- **Query Intelligence**: Automatic analysis determines optimal agent combination for each question
- **Research-Grade Output**: Responses include evidence gathering, cross-referencing, and contextual analysis
- **Transparent Operation**: Seamless multi-agent enhancement without user complexity

### 📚 Advanced Document Support
- **Rich EPUB Parsing**: Full chapter navigation with proper formatting preservation
- **Professional Typography**: Georgia serif font with optimized line spacing and justified text
- **Format Preservation**: Maintains italics, bold text, paragraphs, lists, and blockquotes
- **Smart Chapter Detection**: Extracts titles from NCX files or HTML headings
- **HTML Rendering**: Direct rendering of EPUB HTML for authentic book experience

### 🧠 Full-Book Intelligence
- **Book-Wide Context Awareness**: AI understands entire book structure and cross-references
- **Persistent Conversation Threads**: Multi-thread discussions per chapter with automatic titles
- **Configuration-Driven AI**: Dynamic model selection from centralized YAML configuration
- **Multiple AI Providers**: Support for local (Ollama) and cloud-based AI (OpenAI, Anthropic)
- **Enhanced Research**: Multi-agent system automatically activated with Anthropic provider

### 🎨 Clean User Interface
- **Decluttered Design**: Focus on essential navigation and content
- **Side-by-Side View**: Split view with content and AI chat interface
- **Dynamic Settings**: Model selection automatically populated from configuration
- **Collapsible Sidebar**: Hide/show chapter navigation as needed
- **Professional Reading Experience**: Optimized typography and spacing

### ⚙️ Advanced Configuration
- **YAML-Based Configuration**: Centralized management of all AI models and providers
- **Dynamic Model Loading**: Settings automatically updated from configuration file
- **Client-Server Architecture**: Proper separation of browser and Node.js capabilities
- **Environment Variable Support**: Secure API key management

### 🛠️ Development & Debugging
- **Standalone Debug Console**: Comprehensive visualization of multi-agent orchestration at `/debug`
- **Real-Time Monitoring**: Live agent execution tracking (WebSocket support planned)
- **Interactive Debugging**: Inspect individual agent prompts, outputs, and synthesis process
- **Performance Metrics**: Detailed timing and confidence scoring for each agent

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Optional: API keys for OpenAI and/or Anthropic (for enhanced research capabilities)
- Optional: Ollama installation for local AI processing

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/SpectralTheorem/ai-document-reader.git
   cd ai-document-reader
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure AI providers** (optional)
   ```bash
   cp .env.example .env
   # Edit .env with your API keys:
   # OPENAI_API_KEY=your_openai_key
   # ANTHROPIC_API_KEY=your_anthropic_key
   # OLLAMA_BASE_URL=http://localhost:11434
   ```

4. **Update model configuration** (optional)
   Edit `config.yaml` to add or modify available AI models for each provider.

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Main application: http://localhost:3005
   - Debug console: http://localhost:3005/debug

## 📖 Usage

### Basic Reading
1. Upload an EPUB file using the drag-and-drop interface
2. Navigate chapters using the sidebar
3. Read with professional typography and formatting

### AI-Powered Analysis
1. **Set up AI provider**: Go to Settings and configure your preferred AI provider
2. **For Multi-Agent Research**: Use Anthropic provider with valid API key
3. **Ask questions**: Click on any chapter to start AI-powered discussions
4. **Deep Analysis**: Multi-agent system automatically provides comprehensive research for complex queries

### Multi-Agent Research System
When using Anthropic with a valid API key:
- **Factual Questions**: "What evidence does the book provide for climate change?" → Multiple agents gather evidence, verify claims, and provide context
- **Analytical Questions**: "How does the author's argument develop across chapters?" → Agents analyze structure, cross-reference content, and identify patterns
- **Comparative Questions**: "How do these concepts relate to each other?" → Agents find connections and analyze relationships
- **Evaluative Questions**: "How well-supported is this claim?" → Agents verify evidence and assess argument strength

### Debug Console
Access `/debug` to:
- Monitor real-time agent execution
- Inspect individual agent outputs before synthesis
- View performance metrics and timing data
- Debug and iterate on agent behavior

## 🏗️ Architecture

### Multi-Agent System
- **Orchestrator-Worker Pattern**: BookResearchOrchestrator coordinates parallel agent execution
- **Specialized Agents**: Each agent has a specific research focus and expertise
- **Intelligent Routing**: Query analysis determines optimal agent combinations
- **Synthesis Engine**: Combines individual agent findings into coherent responses

### Configuration Management
- **Centralized Config**: Single `config.yaml` file manages all models and providers
- **Dynamic Loading**: Settings UI automatically populated from configuration
- **API-Based Serving**: `/api/config` endpoint serves configuration to client

### Development Features
- **Comprehensive Logging**: Detailed execution tracking throughout agent system
- **Debug Visualization**: Standalone debug console for orchestration monitoring
- **Performance Monitoring**: Timing and confidence metrics for optimization

## 🔧 Configuration

### AI Models Configuration (`config.yaml`)
```yaml
ai:
  providers:
    ollama:
      baseUrl: "http://localhost:11434"
      models: ["gpt-oss"]
      defaultModel: "gpt-oss"
    openai:
      baseUrl: "https://api.openai.com/v1"
      models: ["gpt-5-2025-08-07", "gpt-5-mini", "gpt-5-nano"]
      defaultModel: "gpt-5-mini-2025-08-07"
    anthropic:
      baseUrl: "https://api.anthropic.com"
      models: ["claude-opus-4-1-20250805", "claude-sonnet-4-20250514", "claude-3-5-haiku-20241022"]
      defaultModel: "claude-3-5-haiku-20241022"
```

### Research System Configuration
```yaml
research:
  enabled: true
  maxAgents: 4
  timeoutMs: 30000
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run the linter (`npm run lint`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with Next.js 15, TypeScript, and Tailwind CSS
- Multi-agent research system inspired by advanced AI orchestration patterns
- EPUB parsing capabilities for comprehensive book support
- Anthropic Claude for intelligent research agent capabilities

---

**Ready to transform how you read and research books? Upload your first EPUB and experience AI-powered deep reading!** 🚀