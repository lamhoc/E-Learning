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
 * Giải mã các HTML entities thường bị lọt qua từ XML Word, HTML hoặc parser API
 */
export function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * Loại bỏ các tag cấu hình nội bộ của đề thi và hệ thống
 */
export function cleanInternalConfigTags(text: string): string {
  if (!text) return '';
  return text
    .replace(/\[(?:CAMERA_REQUIRED|AUTO_GRADE_ESSAY|SHOW_ANSWERS)(?::(?:true|false))?\]/gi, '')
    .replace(/\[[A-Z0-9_]+:(?:true|false)\]/gi, '')
    .trim();
}

/**
 * Chuẩn hóa toàn diện chuỗi toán học và văn bản học thuật đầu vào:
 * 1. Làm sạch ký tự rác, thẻ reasoning <think>, literal \\n, tag nội bộ
 * 2. Giải mã các HTML entities bị sót (&amp;, &lt;, &gt;, &quot;, &#39;, &nbsp;)
 * 3. Chuẩn hóa tiếng Việt Unicode NFC
 * 4. Chuyển đổi cú pháp LaTeX: \[...\] -> $$...$$ và \(...\) -> $...$ (hỗ trợ nhiều dòng)
 * 5. Khử dấu escape kép (\\\\frac -> \frac, \\\\sqrt -> \sqrt, \\\\overline -> \overline)
 * 6. Khử ký tự escape thừa ngoài khối toán (\% -> %, \_ -> _, \& -> &, \$ -> $)
 * 7. Tự động nhận diện biểu thức toán trần ngoài dấu $ (\frac, \sqrt, \overline, P(S\mid F)) để bọc vào $...$
 */
export function normalizeMathInput(text?: string | null): string {
  if (!text) return '';
  let str = String(text);

  // 1. Loại bỏ ký tự rác / null byte / replacement char
  str = str.replace(/[\u0000\ufffd]/g, '');

  // 2. Loại bỏ thẻ suy luận <think>...</think> của DeepSeek / LLMs
  str = str.replace(/<think>[\s\S]*?<\/think>/gi, '');

  // 3. Chuyển chuỗi literal \\n thành \n thật nếu bị escape 2 lần
  str = str.replace(/\\n/g, '\n');

  // 4. Lọc sạch các tag cấu hình nội bộ
  str = cleanInternalConfigTags(str);

  // 5. Giải mã HTML entities
  str = decodeHtmlEntities(str);

  // 6. Chuẩn hóa Unicode NFC
  str = str.normalize('NFC');

  // 7. Khử escape kép dư thừa cho các lệnh LaTeX phổ biến (\\\\frac -> \frac)
  str = str.replace(/\\\\([a-zA-Z]+)/g, '\\$1');

  // 8. Chuyển đổi \[...\] hoặc \\\[...\\\] thành $$...$$ (hỗ trợ cả nhiều dòng)
  str = str.replace(/(?:\\{1,2}\[)([\s\S]*?)(?:\\{1,2}\])/g, (_, p1) => `$$${p1.trim()}$$`);

  // 9. Chuyển đổi \(...\) hoặc \\\(...\\\) thành $...$
  str = str.replace(/(?:\\{1,2}\()([\s\S]*?)(?:\\{1,2}\))/g, (_, p1) => `$${p1.trim()}$`);

  // 10. Xử lý các đoạn văn bản ngoài khối toán ($...$ hoặc $$...$$)
  const parts = str.split(/(\$\$[\s\S]+?\$\$|\$[^\$\n]+?\$)/g);
  for (let i = 0; i < parts.length; i++) {
    // Chỉ xử lý các đoạn không phải là toán đã được bọc
    if (!parts[i].startsWith('$')) {
      let segment = parts[i];

      // Làm sạch ký tự escape thừa trong văn bản thường
      segment = segment.replace(/\\%/g, '%');
      segment = segment.replace(/\\_/g, '_');
      segment = segment.replace(/\\&/g, '&');
      segment = segment.replace(/\\\$/g, '$');

      // Tự động bọc \frac{...}{...} (hỗ trợ lồng nhau 1 cấp)
      segment = segment.replace(/(\\frac\{(?:[^{}]|\{[^{}]*\})*\}\{(?:[^{}]|\{[^{}]*\})*\})/g, (_, p1) => `$${p1}$`);

      // Tự động bọc \sqrt{...}
      segment = segment.replace(/(\\sqrt(?:\[[^\]]*\])?\{(?:[^{}]|\{[^{}]*\})*\})/g, (_, p1) => `$${p1}$`);

      // Tự động bọc \overline{...} (ví dụ \overline{S}, \overline{A})
      segment = segment.replace(/(\\overline\{[^{}]*\})/g, (_, p1) => `$${p1}$`);

      // Tự động bọc biểu thức xác suất có điều kiện P(S\mid F), P(F\mid S), P(A|B)
      segment = segment.replace(/(\b[A-Za-z]\s*\([A-Za-z0-9_+\-*\/|\\]+(?:\\mid[A-Za-z0-9_+\-*\/|\\]+)?\))/g, (_, p1) => {
        // Chỉ bọc nếu có chứa lệnh toán hoặc điều kiện
        if (p1.includes('\\mid') || p1.includes('|') || p1.includes('\\overline')) {
          return `$${p1}$`;
        }
        return p1;
      });

      // Tự động bọc góc ví dụ \angle ABC, \angle BAD
      segment = segment.replace(/(\\angle\s+[A-Za-z0-9_]+)/g, (_, p1) => `$${p1}$`);

      // Tự động bọc góc / độ ví dụ 30^\circ, 45^\circ, 60^\circ, 90^\circ
      segment = segment.replace(/(\b\d+\s*\^\s*(?:\\circ|\{?\\circ\}?))/g, (_, p1) => `$${p1}$`);

      // Tự động bọc các toán tử so sánh / mũi tên LaTeX trần
      segment = segment.replace(/(\\(?:le|ge|neq|approx|sim|times|cdot|pm|mp|sum|prod|int|infty|alpha|beta|gamma|delta|theta|lambda|mu|pi|sigma|omega|Rightarrow|Leftarrow|Leftrightarrow)\b)/g, (_, p1) => `$${p1}$`);

      parts[i] = segment;
    }
  }
  str = parts.join('');

  return str;
}

function parseSegments(rawText: string): Segment[] {
  const text = normalizeMathInput(rawText);
  const segments: Segment[] = [];
  // Matches $$...$$ (block math, hỗ trợ nhiều dòng) hoặc $...$ (inline math)
  const regex = /\$\$([\s\S]+?)\$\$|\$([^\$\n]+?)\$/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Plain text trước match
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
        value: match[1].trim(),
      });
    } else if (match[2] !== undefined) {
      // Inline math ($...$)
      segments.push({
        type: 'inline-math',
        value: match[2].trim(),
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

// Bọc React.memo để tối ưu hiệu năng render KaTeX
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
      <Component className={cn("max-w-full break-words text-left", className)}>
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
