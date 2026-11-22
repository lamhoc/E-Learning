'use client';

import React, { useMemo, useState } from 'react';
import katex from 'katex';
import { Check, Copy, Sparkles } from 'lucide-react';
import { normalizeMathInput } from '@/components/ui/math-text';
import { convertMarkdownTablesToLines } from '@/lib/anti-table-processor';

type ChatMessageRendererProps = {
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
 * và làm sạch triệt để mọi dấu ** thô mồ côi.
 */
function tokenizeInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  if (!text) return tokens;

  // Regex nhận diện lần lượt từ trái sang phải:
  // 1. $$...$$ (Block math)
  // 2. $...$ (Inline math)
  // 3. `...` (Inline code)
  // 4. **...** (Bold)
  // 5. *...* (Italic)
  const regex = /\$\$([\s\S]+?)\$\$|\$([^\$\n]+?)\$|`([^`\n]+?)`|\*\*([^\n*]+?)\*\*|\*([^\n*]+?)\*/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const rawText = text.slice(lastIndex, match.index).replace(/\*\*/g, '');
      if (rawText) {
        tokens.push({ type: 'text', value: rawText });
      }
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
    // Làm sạch tuyệt đối mọi dấu ** hoặc * mồ côi ở phần text cuối cùng
    const remaining = text.slice(lastIndex).replace(/\*\*/g, '');
    if (remaining) {
      tokens.push({ type: 'text', value: remaining });
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
              className="my-2 block max-w-full overflow-x-auto overflow-y-hidden py-1 text-center"
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
              className="inline-block px-0.5 align-middle leading-normal"
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
    <div className="my-3 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-md">
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

type BlockItem =
  | { type: 'code-block'; language: string; content: string }
  | { type: 'heading'; level: number; text: string }
  | { type: 'horizontal-rule' }
  | { type: 'option-item'; optKey: string; text: string }
  | { type: 'answer-item'; label: string; text: string }
  | { type: 'explain-item'; text: string }
  | { type: 'list-item'; prefix?: string; text: string }
  | { type: 'paragraph'; text: string };

/**
 * Phân tích nội dung Markdown nhiều dòng thành danh sách các khối (Blocks) chuyên biệt
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

    // 1. Code Block
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
      title = title.replace(/\*\*/g, '').trim();
      blocks.push({ type: 'heading', level, text: title });
      continue;
    }

    // 4. Tiêu đề Câu hỏi độc lập (dạng "**Câu 1: ...**" hoặc "Câu 1: ...")
    const questionHeadingMatch = line.match(/^(?:\*\*)?(câu|bài|question)\s*(\d+)[:.]?(?:\*\*)?\s*(.*)$/i);
    if (questionHeadingMatch) {
      const qNum = questionHeadingMatch[2];
      const rawTitle = questionHeadingMatch[3].replace(/\*\*/g, '').trim();
      blocks.push({
        type: 'heading',
        level: 3,
        text: `Câu ${qNum}${rawTitle ? `: ${rawTitle}` : ''}`,
      });
      continue;
    }

    // 5. Khối Dòng Đáp án đúng (ví dụ: "**Đáp án đúng:** C" hoặc "👉 Đáp án đúng: C")
    const answerMatch = line.match(/^(?:👉\s*)?(?:\*\*)?(?:đáp án|đáp án đúng|answer)[:\s]*(?:\*\*)?\s*([A-D])(?:\b|[\.\)\s])(.*)$/i);
    if (answerMatch) {
      const optKey = answerMatch[1].toUpperCase();
      const extra = answerMatch[2].replace(/\*\*/g, '').trim();
      blocks.push({
        type: 'answer-item',
        label: 'Đáp án đúng',
        text: extra ? `${optKey} (${extra})` : optKey,
      });
      continue;
    }

    // 6. Khối Dòng Giải thích chi tiết (ví dụ: "**Giải thích chi tiết:** ..." hoặc "💡 Giải thích: ...")
    const explainMatch = line.match(/^(?:💡\s*)?(?:\*\*)?(?:giải thích|giải thích chi tiết|hướng dẫn giải|explanation)[:\s]*(?:\*\*)?\s*(.*)$/i);
    if (explainMatch) {
      const explainText = explainMatch[1].replace(/^\*\*/, '').trim();
      blocks.push({
        type: 'explain-item',
        text: explainText,
      });
      continue;
    }

    // 7. Lựa chọn trắc nghiệm độc lập (A. ..., B. ..., **A.** ..., - **A.** ...)
    const optionMatch = line.match(/^(\s*)(?:[-*+]\s+)?(?:\*\*)?([A-D])(?:\.|\)|\:|\-)(?:\*\*)?\s+(.*)$/i);
    if (optionMatch) {
      const optKey = optionMatch[2].toUpperCase();
      let optText = optionMatch[3].trim();
      // Làm sạch dấu ** thừa ở đầu/cuối của nội dung phương án
      optText = optText.replace(/^\*\*/, '').replace(/\*\*$/, '').trim();
      blocks.push({
        type: 'option-item',
        optKey: `${optKey}.`,
        text: optText,
      });
      continue;
    }

    // 8. Danh sách gạch đầu dòng hoặc đánh số (- ..., * ..., 1. ...)
    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
    if (listMatch) {
      blocks.push({
        type: 'list-item',
        prefix: listMatch[2],
        text: listMatch[3],
      });
      continue;
    }

    // 9. Dòng trống
    if (!trimmed) {
      continue;
    }

    // 10. Đoạn văn thường
    blocks.push({ type: 'paragraph', text: line });
  }

  if (inCodeBlock && codeBlockLines.length > 0) {
    blocks.push({
      type: 'code-block',
      language: codeBlockLang,
      content: codeBlockLines.join('\n'),
    });
  }

  return blocks;
}

export const ChatMessageRenderer = React.memo(
  function ChatMessageRenderer({ content, className = '' }: ChatMessageRendererProps) {
    const blocks = useMemo(() => {
      if (!content) return [];
      // 1. Chặn 100% bảng Markdown bằng Anti-Table Post-Processor
      const tableFreeContent = convertMarkdownTablesToLines(content);
      // 2. Chuẩn hóa toàn bộ công thức KaTeX
      const normalized = normalizeMathInput(tableFreeContent);
      // 3. Phân tích các khối dòng chi tiết
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
                  className="my-3 border-t border-slate-200 dark:border-slate-800"
                />
              );

            case 'heading': {
              const tokens = tokenizeInline(block.text);
              if (block.level === 1 || block.level === 2) {
                return (
                  <h3
                    key={idx}
                    className="font-bold text-base text-blue-700 dark:text-blue-300 mt-4 mb-2 flex items-baseline gap-1"
                  >
                    {renderInlineTokens(tokens)}
                  </h3>
                );
              }
              // Level 3 hoặc 4 (Câu 1: ...)
              return (
                <h4
                  key={idx}
                  className="font-bold text-[15px] text-blue-700 dark:text-blue-400 mt-3.5 mb-2 flex items-baseline gap-2"
                >
                  <span className="size-2 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0 self-center" />
                  <span>{renderInlineTokens(tokens)}</span>
                </h4>
              );
            }

            case 'option-item': {
              const tokens = tokenizeInline(block.text);
              return (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 py-1.5 px-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800/60 my-1 font-medium transition hover:border-blue-300 dark:hover:border-blue-500/50 hover:bg-blue-50/30 dark:hover:bg-slate-800/50"
                >
                  <span className="font-bold text-blue-700 dark:text-blue-400 shrink-0 w-5 select-none">
                    {block.optKey}
                  </span>
                  <div className="flex-1 text-slate-800 dark:text-slate-100 leading-relaxed">
                    {renderInlineTokens(tokens)}
                  </div>
                </div>
              );
            }

            case 'answer-item': {
              const tokens = tokenizeInline(block.text);
              return (
                <div
                  key={idx}
                  className="my-2.5 p-2.5 px-3.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-2 text-sm text-emerald-900 dark:text-emerald-200 shadow-2xs"
                >
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 select-none">
                    👉 {block.label}:
                  </span>
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 bg-white dark:bg-emerald-900/60 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-700/80">
                    {renderInlineTokens(tokens)}
                  </span>
                </div>
              );
            }

            case 'explain-item': {
              const tokens = tokenizeInline(block.text);
              return (
                <div
                  key={idx}
                  className="my-2 p-3 rounded-xl bg-blue-50/40 dark:bg-[#131F33] border border-blue-200/60 dark:border-slate-800 text-sm leading-relaxed text-slate-800 dark:text-slate-200 shadow-2xs"
                >
                  <div className="font-semibold text-blue-700 dark:text-blue-400 mb-1 flex items-center gap-1.5 select-none text-xs">
                    <span>💡 Giải thích chi tiết:</span>
                  </div>
                  <div className="leading-relaxed">
                    {renderInlineTokens(tokens)}
                  </div>
                </div>
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
              return (
                <div key={idx} className="flex items-start gap-2.5 py-1 px-1.5">
                  <span className="shrink-0 select-none font-semibold text-blue-600 dark:text-blue-400">
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
