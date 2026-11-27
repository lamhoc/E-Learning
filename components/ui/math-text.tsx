'use client';

import React, { useMemo } from 'react';
import katex from 'katex';
import { cn } from '@/lib/utils';
import {
  cleanInternalConfigTags,
  decodeHtmlEntities,
  normalizeMathInput,
  parseSegments,
  stripLeadingQuestionPrefix,
  type Segment,
} from '@/lib/math-normalize';
import { repairLatexAndText } from '@/lib/latex-repair';

export {
  cleanInternalConfigTags,
  decodeHtmlEntities,
  normalizeMathInput,
  parseSegments,
  repairLatexAndText,
  stripLeadingQuestionPrefix,
  type Segment,
};

export type MathTextProps = {
  content?: string | null;
  text?: string | null;
  className?: string;
  as?: 'div' | 'span' | 'p';
};

// Bọc React.memo để tối ưu hiệu năng render KaTeX
export const MathText = React.memo(
  function MathText({
    content,
    text,
    className = '',
    as: Component = 'div',
  }: MathTextProps) {
    const rawContent = text ?? content ?? '';

    const segments = useMemo(() => {
      if (!rawContent) return [];
      return parseSegments(rawContent);
    }, [rawContent]);

    if (!rawContent) return null;

    return (
      <Component className={cn('max-w-full break-words text-left whitespace-pre-line', className)}>
        {segments.map((segment, index) => {
          if (segment.type === 'block-math') {
            try {
              const html = katex.renderToString(segment.value, {
                displayMode: true,
                throwOnError: false,
                strict: false,
              });
              return (
                <span
                  key={index}
                  className="my-2.5 block max-w-full overflow-x-auto overflow-y-hidden py-1.5 text-left"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              );
            } catch {
              return (
                <span key={index} className="text-destructive font-mono text-xs text-left block my-1">
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
                strict: false,
              });
              return (
                <span
                  key={index}
                  className="inline-block align-middle px-0.5 leading-normal overflow-visible"
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

          // Plain text: giữ nguyên xuống dòng từng ý
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
  },
  (prev, next) =>
    (prev.text ?? prev.content) === (next.text ?? next.content) &&
    prev.className === next.className &&
    prev.as === next.as
);
