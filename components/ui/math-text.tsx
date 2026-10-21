'use client';

import React, { useMemo } from 'react';
import katex from 'katex';

type MathTextProps = {
  content?: string | null;
  className?: string;
  as?: 'div' | 'span' | 'p';
};

type Segment =
  | { type: 'text'; value: string }
  | { type: 'inline-math'; value: string }
  | { type: 'block-math'; value: string };

function parseSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  // Matches $$...$$ (block) or $...$ (inline, without unescaped newlines)
  const regex = /\$\$([\s\S]+?)\$\$|\$([^\$\n]+?)\$/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Plain text before the match
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        value: text.slice(lastIndex, match.index),
      });
    }

    if (match[1] !== undefined) {
      // Block math ($$...$$)
      segments.push({
        type: 'block-math',
        value: match[1],
      });
    } else if (match[2] !== undefined) {
      // Inline math ($...$)
      segments.push({
        type: 'inline-math',
        value: match[2],
      });
    }

    lastIndex = regex.lastIndex;
  }

  // Trailing plain text
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      value: text.slice(lastIndex),
    });
  }

  return segments;
}

export function MathText({
  content,
  className = '',
  as: Component = 'div',
}: MathTextProps) {
  const segments = useMemo(() => {
    if (!content) return [];
    return parseSegments(content);
  }, [content]);

  if (!content) return null;

  return (
    <Component className={className}>
      {segments.map((segment, index) => {
        if (segment.type === 'block-math') {
          try {
            const html = katex.renderToString(segment.value, {
              displayMode: true,
              throwOnError: false,
            });
            return (
              <span
                key={index}
                className="my-2 block overflow-x-auto text-center"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch {
            return (
              <span key={index} className="text-destructive font-mono text-xs">
                $${segment.value}$$
              </span>
            );
          }
        }

        if (segment.type === 'inline-math') {
          try {
            const html = katex.renderToString(segment.value, {
              displayMode: false,
              throwOnError: false,
            });
            return (
              <span
                key={index}
                className="inline-block px-0.5 align-middle"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch {
            return (
              <span key={index} className="text-destructive font-mono text-xs">
                ${segment.value}$
              </span>
            );
          }
        }

        // Plain text: preserve line breaks
        const lines = segment.value.split('\n');
        return (
          <React.Fragment key={index}>
            {lines.map((line, lIdx) => (
              <React.Fragment key={lIdx}>
                {lIdx > 0 && <br />}
                {line}
              </React.Fragment>
            ))}
          </React.Fragment>
        );
      })}
    </Component>
  );
}
