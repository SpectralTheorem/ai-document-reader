// Query templates and presets for debug console

export type QueryCategory = 'character' | 'theme' | 'argument' | 'comparative' | 'evidence' | 'structure' | 'quick';

export interface QueryTemplate {
  id: string;
  title: string;
  query: string;
  category: QueryCategory;
  description: string;
  icon?: string;
}

export const QUERY_TEMPLATES: QueryTemplate[] = [
  // Quick test queries
  {
    id: 'quick-overview',
    title: 'Quick Overview',
    query: 'Provide a brief overview of the main topics and structure of this book.',
    category: 'quick',
    description: 'Fast general analysis for testing',
    icon: 'Zap'
  },
  {
    id: 'test-agents',
    title: 'Test All Agents',
    query: 'Test query to verify all agents are working correctly.',
    category: 'quick',
    description: 'Simple test to check agent functionality',
    icon: 'TestTube'
  },

  // Character Analysis
  {
    id: 'character-importance',
    title: 'Character Analysis',
    query: 'Pick a person featured in the book and look for key examples of their importance throughout the book. Provide chapter numbers.',
    category: 'character',
    description: 'Analyze a key figure and trace their significance',
    icon: 'User'
  },
  {
    id: 'character-development',
    title: 'Character Development',
    query: 'How does the main character or key figure develop or change throughout the book? What drives this development?',
    category: 'character',
    description: 'Track character growth and motivations',
    icon: 'TrendingUp'
  },

  // Theme Exploration
  {
    id: 'main-themes',
    title: 'Main Themes',
    query: 'What are the central themes of this book and how do they develop across different chapters?',
    category: 'theme',
    description: 'Identify and trace thematic development',
    icon: 'Lightbulb'
  },
  {
    id: 'recurring-concepts',
    title: 'Recurring Concepts',
    query: 'What concepts, ideas, or motifs appear repeatedly throughout the book? How do they evolve?',
    category: 'theme',
    description: 'Find patterns and recurring elements',
    icon: 'Repeat'
  },

  // Argument Analysis
  {
    id: 'main-argument',
    title: 'Core Argument',
    query: 'What is the author\'s main argument or thesis? How is it presented and supported throughout the book?',
    category: 'argument',
    description: 'Identify and analyze the central argument',
    icon: 'MessageSquare'
  },
  {
    id: 'evidence-support',
    title: 'Supporting Evidence',
    query: 'What are the strongest pieces of evidence the author uses to support their main claims?',
    category: 'argument',
    description: 'Examine the quality of supporting evidence',
    icon: 'Shield'
  },

  // Comparative Analysis
  {
    id: 'chapter-comparison',
    title: 'Chapter Comparison',
    query: 'Compare and contrast the approaches, examples, or perspectives presented in different chapters.',
    category: 'comparative',
    description: 'Find similarities and differences between sections',
    icon: 'GitCompare'
  },
  {
    id: 'concept-relationships',
    title: 'Concept Relationships',
    query: 'How do the different concepts and ideas in the book relate to each other? What are the connections?',
    category: 'comparative',
    description: 'Map relationships between key concepts',
    icon: 'Network'
  },

  // Evidence Review
  {
    id: 'fact-check',
    title: 'Fact Verification',
    query: 'What factual claims does the author make? How well are they supported by evidence within the text?',
    category: 'evidence',
    description: 'Verify claims and examine evidence quality',
    icon: 'CheckCircle'
  },
  {
    id: 'source-analysis',
    title: 'Source Analysis',
    query: 'What sources, examples, and references does the author rely on? How credible and relevant are they?',
    category: 'evidence',
    description: 'Evaluate the author\'s sources and references',
    icon: 'FileSearch'
  },

  // Structure Analysis
  {
    id: 'book-structure',
    title: 'Book Structure',
    query: 'How is the book organized? What is the logic behind the chapter structure and flow?',
    category: 'structure',
    description: 'Analyze organizational structure and flow',
    icon: 'LayoutGrid'
  },
  {
    id: 'narrative-flow',
    title: 'Narrative Flow',
    query: 'How does the narrative or argument progress from beginning to end? What is the overall journey?',
    category: 'structure',
    description: 'Trace the progression of ideas or story',
    icon: 'ArrowRight'
  }
];

export const CATEGORY_LABELS: Record<QueryCategory, string> = {
  quick: 'Quick Tests',
  character: 'Character Analysis',
  theme: 'Themes & Concepts',
  argument: 'Arguments & Claims',
  comparative: 'Comparisons',
  evidence: 'Evidence Review',
  structure: 'Structure & Flow'
};

export const CATEGORY_COLORS: Record<QueryCategory, string> = {
  quick: 'bg-yellow-500',
  character: 'bg-blue-500',
  theme: 'bg-purple-500',
  argument: 'bg-green-500',
  comparative: 'bg-orange-500',
  evidence: 'bg-red-500',
  structure: 'bg-gray-500'
};

// Session persistence helpers
export interface DebugPresets {
  lastBookId?: string;
  lastQuery?: string;
  favoriteQueries: string[];
  queryHistory: Array<{
    bookId: string;
    query: string;
    timestamp: number;
  }>;
}

export const PRESETS_STORAGE_KEY = 'debug-presets';

export function saveDebugPresets(presets: DebugPresets): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  }
}

export function loadDebugPresets(): DebugPresets {
  if (typeof window === 'undefined') {
    return {
      favoriteQueries: [],
      queryHistory: []
    };
  }

  try {
    const stored = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load debug presets from localStorage:', error);
  }

  return {
    favoriteQueries: [],
    queryHistory: []
  };
}