'use client';

import { Section } from '@/types/document';
import { ChevronRight, ChevronDown, FileText } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ChapterListProps {
  sections: Section[];
  selectedSection: Section | null;
  onSelectSection: (section: Section) => void;
}

export function ChapterList({ sections, selectedSection, onSelectSection }: ChapterListProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleExpanded = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const renderSection = (section: Section, depth: number = 0) => {
    const hasChildren = section.children && section.children.length > 0;
    const isExpanded = expandedSections.has(section.id);
    const isSelected = selectedSection?.id === section.id;

    return (
      <div key={section.id}>
        <div
          className={cn(
            "flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer transition-colors",
            isSelected && "bg-blue-50 hover:bg-blue-100",
            depth > 0 && "border-l-2 border-gray-200"
          )}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          onClick={() => onSelectSection(section)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(section.id);
              }}
              className="mr-1"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <FileText className="h-4 w-4 mr-2 text-gray-400" />
          )}
          <span className={cn(
            "text-sm truncate",
            isSelected && "font-medium text-blue-700"
          )}>
            {section.title}
          </span>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {section.children!.map(child => renderSection(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="py-4">
      <h2 className="px-4 mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wider">
        Chapters
      </h2>
      <div className="space-y-0.5">
        {sections.map(section => renderSection(section))}
      </div>
    </div>
  );
}