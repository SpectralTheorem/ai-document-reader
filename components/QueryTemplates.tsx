'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Zap,
  User,
  Lightbulb,
  MessageSquare,
  GitCompare,
  FileSearch,
  LayoutGrid,
  ArrowRight,
  TrendingUp,
  Repeat,
  Shield,
  Network,
  CheckCircle,
  TestTube,
  ChevronDown,
  Clock,
  Star
} from 'lucide-react';
import {
  QUERY_TEMPLATES,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  QueryTemplate,
  QueryCategory
} from '@/types/debug-presets';

interface QueryTemplatesProps {
  selectedQuery: string;
  onQuerySelect: (query: string) => void;
  disabled?: boolean;
}

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Zap,
  User,
  Lightbulb,
  MessageSquare,
  GitCompare,
  FileSearch,
  LayoutGrid,
  ArrowRight,
  TrendingUp,
  Repeat,
  Shield,
  Network,
  CheckCircle,
  TestTube
};

export function QueryTemplates({ selectedQuery, onQuerySelect, disabled = false }: QueryTemplatesProps) {
  const [selectedCategory, setSelectedCategory] = useState<QueryCategory | 'all'>('quick');
  const [showAll, setShowAll] = useState(false);
  const [recentQueries, setRecentQueries] = useState<string[]>([]);

  useEffect(() => {
    // Load recent queries from localStorage
    try {
      const stored = localStorage.getItem('debug-recent-queries');
      if (stored) {
        setRecentQueries(JSON.parse(stored));
      }
    } catch (error) {
      console.warn('Failed to load recent queries:', error);
    }
  }, []);

  const addToRecent = (query: string) => {
    if (!query.trim()) return;

    const updated = [query, ...recentQueries.filter(q => q !== query)].slice(0, 5);
    setRecentQueries(updated);

    try {
      localStorage.setItem('debug-recent-queries', JSON.stringify(updated));
    } catch (error) {
      console.warn('Failed to save recent queries:', error);
    }
  };

  const handleTemplateSelect = (template: QueryTemplate) => {
    onQuerySelect(template.query);
    addToRecent(template.query);
  };

  const categories = Object.keys(CATEGORY_LABELS) as QueryCategory[];
  const filteredTemplates = selectedCategory === 'all'
    ? QUERY_TEMPLATES
    : QUERY_TEMPLATES.filter(t => t.category === selectedCategory);

  const getIcon = (iconName?: string) => {
    if (!iconName || !ICON_MAP[iconName]) return null;
    const IconComponent = ICON_MAP[iconName];
    return <IconComponent className="h-4 w-4" />;
  };

  const getCategoryColor = (category: QueryCategory) => {
    return CATEGORY_COLORS[category] || 'bg-gray-500';
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Research Query</label>

        {/* Quick Action Buttons for Popular Templates */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleTemplateSelect(QUERY_TEMPLATES.find(t => t.id === 'quick-overview')!)}
            disabled={disabled}
            className="justify-start"
          >
            <Zap className="h-3 w-3 mr-2" />
            Quick Test
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleTemplateSelect(QUERY_TEMPLATES.find(t => t.id === 'character-importance')!)}
            disabled={disabled}
            className="justify-start"
          >
            <User className="h-3 w-3 mr-2" />
            Character
          </Button>
        </div>

        {/* Category Selector */}
        <div className="mb-3">
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  selectedCategory === category
                    ? `${getCategoryColor(category)} text-white`
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {CATEGORY_LABELS[category]}
              </button>
            ))}
          </div>
        </div>

        {/* Recent Queries */}
        {recentQueries.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <Clock className="h-3 w-3 mr-1 text-gray-400" />
              <span className="text-xs font-medium text-gray-500">Recent</span>
            </div>
            <div className="space-y-1">
              {recentQueries.slice(0, 3).map((query, index) => (
                <button
                  key={index}
                  onClick={() => onQuerySelect(query)}
                  disabled={disabled}
                  className="w-full p-2 text-left text-xs bg-gray-50 hover:bg-gray-100 rounded border truncate"
                >
                  {query}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Template List */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {filteredTemplates.slice(0, showAll ? filteredTemplates.length : 6).map((template) => (
            <div
              key={template.id}
              className={`p-3 border rounded-lg cursor-pointer hover:border-blue-300 transition-colors ${
                selectedQuery === template.query ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
              onClick={() => !disabled && handleTemplateSelect(template)}
            >
              <div className="flex items-start space-x-3">
                <div className={`w-6 h-6 rounded ${getCategoryColor(template.category)} flex items-center justify-center flex-shrink-0`}>
                  {getIcon(template.icon)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-sm">{template.title}</h4>
                    <span className={`px-2 py-0.5 text-xs rounded ${getCategoryColor(template.category)} text-white`}>
                      {CATEGORY_LABELS[template.category]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                  <p className="text-xs text-gray-400 mt-2 truncate">{template.query}</p>
                </div>
              </div>
            </div>
          ))}

          {/* Show More Button */}
          {filteredTemplates.length > 6 && !showAll && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAll(true)}
              className="w-full"
            >
              <ChevronDown className="h-3 w-3 mr-2" />
              Show {filteredTemplates.length - 6} more templates
            </Button>
          )}

          {showAll && filteredTemplates.length > 6 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAll(false)}
              className="w-full"
            >
              Show less
            </Button>
          )}
        </div>

        {/* Custom Query Input */}
        <div className="mt-4">
          <div className="text-xs font-medium text-gray-500 mb-2">Or enter custom query:</div>
          <textarea
            value={selectedQuery}
            onChange={(e) => onQuerySelect(e.target.value)}
            placeholder="Enter your custom research question..."
            disabled={disabled}
            className="w-full h-24 px-3 py-2 border rounded-md resize-none text-sm"
          />
        </div>
      </div>
    </div>
  );
}