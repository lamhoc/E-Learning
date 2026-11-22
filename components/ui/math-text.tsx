'use client';

import React, { useMemo } from 'react';
import katex from 'katex';
import { cn } from '@/lib/utils';

type MathTextProps = {
  content?: string | null;
  className?: string;
  as?: 'div' | 'span' | 'p';
};

type Segment =
  | { type: 'text'; value: string }
  | { type: 'inline-math'; value: string }
  | { type: 'block-math'; value: string };

/**
 * Chuẩn hóa toàn diện chuỗi toán học đầu vào:
 * 1. Chuyển đổi cú pháp LaTeX chuẩn \[...\] -> $$...$$ và \(...\) -> $...$
 * 2. Khử dấu escape kép dư thừa (ví dụ \\frac -> \frac, \\sqrt -> \sqrt)
 * 3. Tự động bọc các biểu thức toán đơn lẻ ngoài dấu $ (như \frac{a}{b}, \sqrt{x}, 30^\circ) vào $...$
 * 4. Chuẩn hóa tiếng Việt Unicode NFC và loại bỏ ký tự điều khiển lỗi
 */
export function normalizeMathInput(text?: string | null): string {
  if (!text) return '';
  let str = String(text);

  // 1. Loại bỏ ký tự rác / null byte
  str = str.replace(/[\u0000\ufffd]/g, '');

  // 2. Chuẩn hóa Unicode NFC
  str = str.normalize('NFC');

  // 3. Khử escape kép dư thừa cho các lệnh LaTeX phổ biến (\\\\frac -> \frac)
  str = str.replace(/\\\\([a-zA-Z]+)/g, '\\$1');

  // 4. Chuyển đổi \[...\] hoặc \\\[...\\\] thành $$...$$
  str = str.replace(/(?:\\{1,2}\[)([\s\S]*?)(?:\\{1,2}\])/g, (_, p1) => `$$${p1}$$`);

  // 5. Chuyển đổi \(...\) hoặc \\\(...\\\) thành $...$
  str = str.replace(/(?:\\{1,2}\()([\s\S]*?)(?:\\{1,2}\))/g, (_, p1) => `$${p1}$`);

  // 6. Nhận diện các biểu thức LaTeX đơn lẻ còn đứng ngoài dấu $ (như \frac{...}{...}, \sqrt{...}, 30^\circ, \angle ABC)
  // Chỉ bọc nếu chưa nằm trong cặp $...$ hoặc $$...$$
  const parts = str.split(/(\$\$[\s\S]+?\$\$|\$[^\$\n]+?\$)/g);
  for (let i = 0; i < parts.length; i++) {
    // Chỉ xử lý các đoạn không phải là toán đã được bọc ($...)
    if (!parts[i].startsWith('$')) {
      let segment = parts[i];
      // Tự động bọc \frac{...}{...}
      segment = segment.replace(/(\\frac\{[^{}]*\}\{[^{}]*\})/g, (_, p1) => `$${p1}$`);
      // Tự động bọc \sqrt{...}
      segment = segment.replace(/(\\sqrt\{[^{}]*\})/g, (_, p1) => `$${p1}$`);
      // Tự động bọc góc ví dụ \angle ABC, \angle BAD
      segment = segment.replace(/(\\angle\s+[A-Za-z0-9_]+)/g, (_, p1) => `$${p1}$`);
      // Tự động bọc góc / độ ví dụ 30^\circ, 45^\circ, 60^\circ, 90^\circ
      segment = segment.replace(/(\b\d+\s*\^\s*(?:\\circ|\{?\\circ\}?))/g, (_, p1) => `$${p1}$`);
      // Khử ký hiệu phần trăm LaTeX (\% -> %) trong văn bản thường
      segment = segment.replace(/\\%/g, '%');
      parts[i] = segment;
    }
  }
  str = parts.join('');

  return str;
}

function parseSegments(rawText: string): Segment[] {
  const text = normalizeMathInput(rawText);
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

// Bọc React.memo để loại bỏ hoàn toàn việc re-parse và render KaTeX nặng nề khi parent re-render
export const MathText = React.memo(
  function MathText({
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
      <Component className={cn("max-w-full break-words", className)}>
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
                  className="my-2 block max-w-full overflow-x-auto overflow-y-hidden py-1.5 text-center"
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
                  className="inline-block align-middle px-0.5 leading-normal"
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
  },
  (prev, next) =>
    prev.content === next.content &&
    prev.className === next.className &&
    prev.as === next.as
);
