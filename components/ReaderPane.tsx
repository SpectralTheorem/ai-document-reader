'use client';

import { Section } from '@/types/document';
import '@/styles/epub.css';

interface ReaderPaneProps {
  section: Section | null;
}

export function ReaderPane({ section }: ReaderPaneProps) {
  if (!section) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <p>Select a chapter to start reading</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="max-w-4xl mx-auto px-8 py-12">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">{section.title}</h1>
        
        {section.htmlContent ? (
          <div 
            className="epub-content prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: section.htmlContent }}
            style={{
              lineHeight: '1.8',
              fontSize: '18px',
              color: '#374151'
            }}
          />
        ) : section.content ? (
          <div className="text-base leading-7 text-gray-800 whitespace-pre-wrap">
            {section.content}
          </div>
        ) : (
          <p className="text-gray-500 italic">No content available for this section</p>
        )}
      </div>
      
    </div>
  );
}