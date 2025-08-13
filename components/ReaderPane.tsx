'use client';

import { Section } from '@/types/document';

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
      
      <style jsx global>{`
        .epub-content {
          font-family: 'Georgia', 'Times New Roman', serif;
        }
        
        .epub-content p {
          margin-bottom: 1.5em;
          line-height: 1.8;
          text-align: justify;
          text-indent: 0;
        }
        
        .epub-content h1, .epub-content h2, .epub-content h3, 
        .epub-content h4, .epub-content h5, .epub-content h6 {
          font-weight: bold;
          margin: 2em 0 1em 0;
          line-height: 1.3;
        }
        
        .epub-content h1 { font-size: 2em; }
        .epub-content h2 { font-size: 1.5em; }
        .epub-content h3 { font-size: 1.3em; }
        .epub-content h4 { font-size: 1.1em; }
        
        .epub-content em, .epub-content i {
          font-style: italic;
        }
        
        .epub-content strong, .epub-content b {
          font-weight: bold;
        }
        
        .epub-content blockquote {
          border-left: 4px solid #e5e7eb;
          padding-left: 1.5em;
          margin: 2em 0;
          font-style: italic;
          color: #6b7280;
        }
        
        .epub-content ul, .epub-content ol {
          margin: 1.5em 0;
          padding-left: 2em;
        }
        
        .epub-content li {
          margin-bottom: 0.5em;
          line-height: 1.7;
        }
        
        .epub-content hr {
          border: none;
          border-top: 1px solid #d1d5db;
          margin: 3em 0;
        }
        
        .epub-content div {
          margin-bottom: 1em;
        }
        
        /* Handle common EPUB CSS classes */
        .epub-content .center, .epub-content .centered {
          text-align: center;
        }
        
        .epub-content .right {
          text-align: right;
        }
        
        .epub-content .indent {
          text-indent: 2em;
        }
        
        .epub-content .small-caps {
          font-variant: small-caps;
        }
        
        .epub-content .footnote {
          font-size: 0.9em;
          color: #6b7280;
        }
        
        /* Typography improvements */
        .epub-content {
          hyphens: auto;
          word-spacing: 0.1em;
        }
        
        /* Better spacing for dialogue and special formatting */
        .epub-content .dialogue {
          margin-left: 1em;
        }
        
        .epub-content .poetry, .epub-content .verse {
          white-space: pre-line;
          margin: 2em 0;
          padding-left: 2em;
        }
      `}</style>
    </div>
  );
}