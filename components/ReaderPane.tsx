'use client';

import { Section } from '@/types/document';
import { useSettings } from '@/lib/settings-storage';
import { THEME_CONFIGS, FONT_CONFIGS } from '@/types/settings';
import '@/styles/epub.css';

interface ReaderPaneProps {
  section: Section | null;
}

export function ReaderPane({ section }: ReaderPaneProps) {
  const { settings } = useSettings();
  const themeConfig = THEME_CONFIGS[settings.reading.theme];
  const fontConfig = FONT_CONFIGS[settings.reading.fontFamily];

  if (!section) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <p>Select a chapter to start reading</p>
      </div>
    );
  }

  const maxWidthClass = {
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '6xl': 'max-w-6xl',
    'none': 'max-w-none'
  }[settings.reading.maxWidth];

  const containerStyle = {
    backgroundColor: themeConfig.backgroundColor,
    color: themeConfig.textColor,
    fontFamily: fontConfig.family,
    fontSize: `${settings.reading.fontSize}px`,
    lineHeight: settings.reading.lineHeight
  };

  const contentStyle = {
    textAlign: settings.reading.textJustify ? 'justify' : 'left',
    marginTop: `${settings.reading.marginTop * 4}px`,
    marginBottom: `${settings.reading.marginBottom * 4}px`
  } as React.CSSProperties;

  return (
    <div className="h-full overflow-y-auto" style={containerStyle}>
      <div className={`${maxWidthClass} mx-auto px-${settings.reading.padding} py-12`}>
        <h1
          className="text-3xl font-bold mb-8"
          style={{
            color: themeConfig.textColor,
            marginTop: `${settings.reading.marginTop * 4}px`
          }}
        >
          {section.title}
        </h1>

        {section.htmlContent ? (
          <div
            className="epub-content prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: section.htmlContent }}
            style={{
              ...contentStyle,
              fontSize: `${settings.reading.fontSize}px`,
              lineHeight: settings.reading.lineHeight,
              color: themeConfig.textColor
            }}
          />
        ) : section.content ? (
          <div
            className="whitespace-pre-wrap"
            style={{
              ...contentStyle,
              fontSize: `${settings.reading.fontSize}px`,
              lineHeight: settings.reading.lineHeight,
              color: themeConfig.textColor
            }}
          >
            {section.content}
          </div>
        ) : (
          <p className="italic" style={{ color: themeConfig.secondaryColor }}>
            No content available for this section
          </p>
        )}
      </div>
    </div>
  );
}