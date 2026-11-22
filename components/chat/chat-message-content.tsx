'use client';

import React, { useMemo, useState } from 'react';
import katex from 'katex';
import { Check, Copy } from 'lucide-react';
import { MathText, normalizeMathInput } from '@/components/ui/math-text';

type ChatMessageContentProps = {
  content?: string | null;
  className?: string;
};

type InlineToken =
  | { type: 'math-block'; value: string }
  | { type: 'math-inline'; value: string }
  | { type: 'code-inline'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'italic'; value: string }
  | { type: 'text'; value: string };

/**
 * Tokenize một dòng văn bản thành các token định dạng (Toán KaTeX, In đậm, Code, In nghiêng, Text)
 */
function tokenizeInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  if (!text) return tokens;

  // Regex nhận diện lần lượt từ trái sang phải:
  // 1. $$...$$ (Block math)
  // 2. $...$ (Inline math)
  // 3. `...` (Inline code)
  // 4. **...** (Bold - hỗ trợ mọi ký tự bên trong)
  // 5. *...* (Italic)
  const regex = /\$\$([\s\S]+?)\$\$|\$([^\$\n]+?)\$|`([^`\n]+?)`|\*\*([^\n]+?)\*\*|\*([^\n]+?)\*/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        type: 'text',
        value: text.slice(lastIndex, match.index),
      });
    }

    if (match[1] !== undefined) {
      tokens.push({ type: 'math-block', value: match[1] });
    } else if (match[2] !== undefined) {
      tokens.push({ type: 'math-inline', value: match[2] });
    } else if (match[3] !== undefined) {
      tokens.push({ type: 'code-inline', value: match[3] });
    } else if (match[4] !== undefined) {
      tokens.push({ type: 'bold', value: match[4] });
    } else if (match[5] !== undefined) {
      tokens.push({ type: 'italic', value: match[5] });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    // Làm sạch dấu ** hoặc * mồ côi nếu có ở phần text cuối cùng
    const remaining = text.slice(lastIndex).replace(/\*\*/g, '');
    if (remaining) {
      tokens.push({
        type: 'text',
        value: remaining,
      });
    }
  }

  return tokens;
}

/**
 * Render an toàn các token inline (có hỗ trợ đệ quy cho math/code bên trong bold)
 */
function renderInlineTokens(tokens: InlineToken[]): React.ReactNode {
  return tokens.map((token, index) => {
    switch (token.type) {
      case 'math-block': {
        try {
          const html = katex.renderToString(token.value, {
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
            <span key={index} className="font-mono text-xs text-rose-500">
              $${token.value}$$
            </span>
          );
        }
      }

      case 'math-inline': {
        try {
          const html = katex.renderToString(token.value, {
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
            <span key={index} className="font-mono text-xs text-rose-500">
              ${token.value}$
            </span>
          );
        }
      }

      case 'code-inline': {
        return (
          <code
            key={index}
            className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-xs font-mono text-emerald-700 dark:text-emerald-300 border border-slate-200 dark:border-slate-700"
          >
            {token.value}
          </code>
        );
      }

      case 'bold': {
        // Bên trong bold có thể chứa công thức toán hoặc code, parse tiếp để hiển thị sạch sẽ
        const subTokens = tokenizeInline(token.value);
        return (
          <strong key={index} className="font-semibold text-slate-900 dark:text-white">
            {renderInlineTokens(subTokens)}
          </strong>
        );
      }

      case 'italic': {
        const subTokens = tokenizeInline(token.value);
        return (
          <em key={index} className="italic text-slate-700 dark:text-slate-300">
            {renderInlineTokens(subTokens)}
          </em>
        );
      }

      case 'text':
      default:
        return <React.Fragment key={index}>{token.value}</React.Fragment>;
    }
  });
}

type BlockItem =
  | { type: 'code-block'; language: string; content: string }
  | { type: 'heading'; level: number; text: string }
  | { type: 'horizontal-rule' }
  | { type: 'list-item'; prefix?: string; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'paragraph'; text: string };

/**
 * Phân tích nội dung Markdown nhiều dòng thành danh sách các khối (Blocks)
 */
function parseBlocks(rawText: string): BlockItem[] {
  const blocks: BlockItem[] = [];
  const lines = rawText.split('\n');

  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Kiểm tra bắt đầu/kết thúc Code Block
    if (trimmed.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLang = trimmed.slice(3).trim();
        codeBlockLines = [];
        continue;
      } else {
        inCodeBlock = false;
        blocks.push({
          type: 'code-block',
          language: codeBlockLang,
          content: codeBlockLines.join('\n'),
        });
        continue;
      }
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // 2. Dòng kẻ ngang (--- hoặc *** hoặc ___ hoặc ----)
    if (/^([-*_])(?:\s*\1){2,}$/.test(trimmed)) {
      blocks.push({ type: 'horizontal-rule' });
      continue;
    }

    // 3. Tiêu đề Markdown (Heading #, ##, ###)
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      let title = headingMatch[2].trim();
      // Làm sạch toàn bộ dấu ** trong tiêu đề để tránh lộ markdown thô vì thẻ heading đã được in đậm
      title = title.replace(/\*\*/g, '').trim();
      blocks.push({ type: 'heading', level, text: title });
      continue;
    }

    // 4. Tiêu đề Câu hỏi độc lập (dạng "**Câu 1: ...**" hoặc "Câu 1: ...")
    const questionHeadingMatch = line.match(/^(\*\*)?(câu|bài|question)\s*(\d+)[:.](\*\*)?\s*(.*)$/i);
    if (questionHeadingMatch) {
      const qNum = questionHeadingMatch[3];
      const rawText = questionHeadingMatch[5].replace(/\*\*/g, '').trim();
      blocks.push({
        type: 'heading',
        level: 4,
        text: `Câu ${qNum}: ${rawText}`,
      });
      continue;
    }

    // 5. Kiểm tra Bảng Markdown (dòng tiêu đề và dòng phân cách |---|---|)
    if (
      trimmed.includes('|') &&
      i + 1 < lines.length &&
      /^\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?$/.test(lines[i + 1].trim())
    ) {
      const headerLine = trimmed;
      const headers = headerLine
        .split('|')
        .map((c) => c.trim())
        .filter((c, idx, arr) => (idx === 0 && !c ? false : idx === arr.length - 1 && !c ? false : true));

      i++; // Bỏ qua dòng phân cách (|---|---|)

      const rows: string[][] = [];
      while (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (!nextLine || !nextLine.includes('|')) break;
        i++;
        const cells = nextLine
          .split('|')
          .map((c) => c.trim())
          .filter((c, idx, arr) => (idx === 0 && !c ? false : idx === arr.length - 1 && !c ? false : true));
        rows.push(cells);
      }

      blocks.push({
        type: 'table',
        headers,
        rows,
      });
      continue;
    }

    // 6. Lựa chọn trắc nghiệm độc lập (A. ..., B. ..., **A.** ..., **B.** ...)
    const optionMatch = line.match(/^(\s*)(?:[-*+]\s+)?(\*\*)?([A-D])[:.)-](\*\*)?\s+(.*)$/i);
    if (optionMatch) {
      const optKey = optionMatch[3].toUpperCase();
      const optText = optionMatch[5].trim();
      blocks.push({
        type: 'list-item',
        prefix: `${optKey}.`,
        text: optText,
      });
      continue;
    }

    // 7. Danh sách gạch đầu dòng hoặc đánh số (- ..., * ..., 1. ..., 👉 ..., 💡 ...)
    const listMatch = line.match(/^(\s*)([-*+]|\d+\.|\uD83D\uDC49|\uD83D\uDCA1)\s+(.*)$/);
    if (listMatch) {
      blocks.push({
        type: 'list-item',
        prefix: listMatch[2],
        text: listMatch[3],
      });
      continue;
    }

    // 8. Dòng trống
    if (!trimmed) {
      continue;
    }

    // 9. Đoạn văn thường
    blocks.push({ type: 'paragraph', text: line });
  }

  // Nếu file kết thúc khi code block chưa đóng
  if (inCodeBlock && codeBlockLines.length > 0) {
    blocks.push({
      type: 'code-block',
      language: codeBlockLang,
      content: codeBlockLines.join('\n'),
    });
  }

  return blocks;
}

function CodeBlockView({ language, content }: { language: string; content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  };

  return (
    <div className="my-2.5 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-md">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/60 px-3 py-1.5 text-[11px] font-mono text-slate-400">
        <span>{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          title="Sao chép toàn bộ mã nguồn"
        >
          {copied ? (
            <>
              <Check className="size-3 text-emerald-400" />
              <span className="text-emerald-400">Đã chép</span>
            </>
          ) : (
            <>
              <Copy className="size-3" />
              <span>Sao chép</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-xs font-mono text-slate-100 leading-normal">
        <code>{content}</code>
      </pre>
    </div>
  );
}

export const ChatMessageContent = React.memo(
  function ChatMessageContent({ content, className = '' }: ChatMessageContentProps) {
    const blocks = useMemo(() => {
      if (!content) return [];
      const normalized = normalizeMathInput(content);
      return parseBlocks(normalized);
    }, [content]);

    if (!content) return null;

    return (
      <div className={`space-y-2.5 leading-relaxed text-sm ${className}`}>
        {blocks.map((block, idx) => {
          switch (block.type) {
            case 'horizontal-rule':
              return (
                <hr
                  key={idx}
                  className="my-3 border-t border-slate-200 dark:border-slate-700/80"
                />
              );

            case 'table':
              return (
                <div key={idx} className="my-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        {block.headers.map((h, hIdx) => (
                          <th key={hIdx} className="px-3 py-2 border-r last:border-r-0 border-slate-200 dark:border-slate-700 whitespace-nowrap">
                            <MathText content={h} as="span" />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-[#111C2D]">
                      {block.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="px-3 py-2 border-r last:border-r-0 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                              <MathText content={cell} as="span" />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );

            case 'heading': {
              const tokens = tokenizeInline(block.text);
              if (block.level === 1 || block.level === 2) {
                return (
                  <h3
                    key={idx}
                    className="font-bold text-base text-blue-700 dark:text-blue-300 mt-3.5 mb-1.5 flex items-baseline gap-1"
                  >
                    {renderInlineTokens(tokens)}
                  </h3>
                );
              }
              // Level 3 hoặc 4 (ví dụ: ### Câu 1: ...)
              return (
                <h4
                  key={idx}
                  className="font-bold text-[14.5px] text-blue-700 dark:text-amber-400 mt-3 mb-1.5 flex items-baseline gap-1.5"
                >
                  <span className="size-2 rounded-full bg-blue-600 dark:bg-amber-400 shrink-0 self-center" />
                  <span>{renderInlineTokens(tokens)}</span>
                </h4>
              );
            }

            case 'code-block':
              return (
                <CodeBlockView
                  key={idx}
                  language={block.language}
                  content={block.content}
                />
              );

            case 'list-item': {
              const tokens = tokenizeInline(block.text);
              const isOption = /^[A-D]\./i.test(block.prefix?.trim() || '');

              return (
                <div
                  key={idx}
                  className={`flex items-start gap-2.5 py-1 px-1.5 ${
                    isOption
                      ? 'rounded-xl bg-slate-50/80 dark:bg-slate-800/40 px-3 py-1.5 border border-slate-200/60 dark:border-slate-700/50 my-1 font-medium transition hover:border-blue-300 dark:hover:border-blue-500/50'
                      : ''
                  }`}
                >
                  <span
                    className={`shrink-0 select-none ${
                      isOption
                        ? 'font-bold text-blue-700 dark:text-amber-400 w-5'
                        : 'font-semibold text-blue-600 dark:text-blue-400'
                    }`}
                  >
                    {block.prefix || '•'}
                  </span>
                  <div className="flex-1 text-slate-800 dark:text-slate-100 leading-relaxed">
                    {renderInlineTokens(tokens)}
                  </div>
                </div>
              );
            }

            case 'paragraph': {
              const tokens = tokenizeInline(block.text);
              return (
                <p key={idx} className="text-slate-800 dark:text-slate-100 leading-relaxed">
                  {renderInlineTokens(tokens)}
                </p>
              );
            }

            default:
              return null;
          }
        })}
      </div>
    );
  },
  (prev, next) => prev.content === next.content && prev.className === next.className
);

export { ChatMessageRenderer } from './ChatMessageRenderer';
