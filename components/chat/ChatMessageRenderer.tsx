'use client';

import React, { useMemo, useState } from 'react';
import katex from 'katex';
import { Check, Copy } from 'lucide-react';
import {
  decodeHtmlEntities,
  cleanInternalConfigTags,
  normalizeMathInput,
} from '@/components/ui/math-text';
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

type BlockItem =
  | { type: 'code-block'; language: string; content: string }
  | { type: 'math-block'; content: string }
  | { type: 'heading'; level: number; text: string }
  | { type: 'horizontal-rule' }
  | { type: 'option-item'; optKey: string; text: string }
  | { type: 'answer-item'; label: string; text: string }
  | { type: 'suggestion-item'; label: string; text: string }
  | { type: 'rubric-item'; label: string; text: string }
  | { type: 'explain-item'; text: string }
  | { type: 'list-item'; prefix?: string; text: string }
  | { type: 'paragraph'; text: string };

/**
 * Tokenize một dòng văn bản thành các token định dạng (Toán KaTeX, In đậm, Code, In nghiêng, Text)
 * và loại bỏ triệt để mọi dấu ** mồ côi.
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
      tokens.push({ type: 'math-block', value: match[1].trim() });
    } else if (match[2] !== undefined) {
      tokens.push({ type: 'math-inline', value: match[2].trim() });
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
            strict: false,
          });
          return (
            <span
              key={index}
              className="my-2 block max-w-full overflow-x-auto overflow-y-hidden py-1 text-left"
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
            strict: false,
          });
          return (
            <span
              key={index}
              className="inline-block px-0.5 align-middle leading-normal overflow-visible"
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
    <div className="my-3 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-md text-left">
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
      <pre className="p-3.5 overflow-x-auto text-xs font-mono text-slate-100 leading-normal text-left">
        <code>{content}</code>
      </pre>
    </div>
  );
}

/**
 * Phân tích nội dung Markdown nhiều dòng thành danh sách các khối (Blocks) chuyên biệt.
 * QUY TRÌNH BẢO VỆ CỐT LÕI:
 * 1. Tiền xử lý: Làm sạch rác, tag nội bộ, giải mã entities, chặn bảng.
 * 2. Gom toàn bộ Code Block (```...```) và Display Math Block ($$...$$, \[...\]) TRƯỚC KHI split('\n').
 * 3. Sau khi gom khối xong mới tách dòng markdown và tái cấu trúc các khối hiển thị.
 */
function parseBlocks(rawText: string): BlockItem[] {
  const blocks: BlockItem[] = [];
  if (!rawText) return blocks;

  // ── BƯỚC 1: TIỀN XỬ LÝ CHUỖI TOÀN DIỆN ──
  let text = String(rawText);

  // Chuẩn hóa xuống dòng
  text = text.replace(/\r\n/g, '\n');

  // Làm sạch ký tự rác / null byte / replacement char
  text = text.replace(/[\u0000\ufffd]/g, '');

  // Loại bỏ thẻ suy luận <think>...</think>
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '');

  // Chuyển chuỗi literal \n nếu bị escape 2 lần
  text = text.replace(/\\n/g, '\n');

  // Lọc sạch tag nội bộ
  text = cleanInternalConfigTags(text);

  // Giải mã HTML entities
  text = decodeHtmlEntities(text);

  // Chuẩn hóa Unicode NFC
  text = text.normalize('NFC');

  // Chặn 100% bảng Markdown bằng Anti-Table Post-Processor
  text = convertMarkdownTablesToLines(text);

  // Khử escape kép dư thừa cho các lệnh LaTeX phổ biến (\\\\frac -> \frac)
  text = text.replace(/\\\\([a-zA-Z]+)/g, '\\$1');

  // ── BƯỚC 2: GOM KHỐI CODE & KHỐI MATH NHIỀU DÒNG TRƯỚC KHI TÁCH DÒNG ──
  const codeBlocks: { language: string; content: string }[] = [];
  text = text.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_, lang, content) => {
    const id = codeBlocks.length;
    codeBlocks.push({ language: lang.trim(), content: content.trimEnd() });
    return `\n\n__CODE_BLOCK_${id}__\n\n`;
  });

  const mathBlocks: string[] = [];

  // Gom toàn bộ khối $$...$$ nhiều dòng hoặc 1 dòng
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, mathExpr) => {
    const id = mathBlocks.length;
    let expr = mathExpr.replace(/\\\\([a-zA-Z]+)/g, '\\$1').trim();
    mathBlocks.push(expr);
    return `\n\n__MATH_BLOCK_${id}__\n\n`;
  });

  // Gom toàn bộ khối \[...\] hoặc \\\[...\\\] nhiều dòng hoặc 1 dòng
  text = text.replace(/(?:\\{1,2}\[)([\s\S]+?)(?:\\{1,2}\])/g, (_, mathExpr) => {
    const id = mathBlocks.length;
    let expr = mathExpr.replace(/\\\\([a-zA-Z]+)/g, '\\$1').trim();
    mathBlocks.push(expr);
    return `\n\n__MATH_BLOCK_${id}__\n\n`;
  });

  // Chuyển đổi \(...\) sang $...$
  text = text.replace(/(?:\\{1,2}\()([\s\S]+?)(?:\\{1,2}\))/g, (_, p1) => `$${p1.trim()}$`);

  // Nếu AI xuống dòng bên trong cặp $...$ ngắn (dưới 200 ký tự), gom lại trên 1 dòng
  text = text.replace(/\$([^\$\n]{1,120}\n[^\$\n]{1,120})\$/g, (_, inner) => {
    return `$${inner.replace(/\n+/g, ' ')}$`;
  });

  // ── BƯỚC 3: LÀM SẠCH KÝ TỰ THOÁT VÀ BỌC TOÁN TRẦN NGOÀI KHỐI TOÁN ──
  const parts = text.split(/(__MATH_BLOCK_\d+__|__CODE_BLOCK_\d+__|\$[^\$\n]+?\$)/g);
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (
      !part.startsWith('__MATH_BLOCK_') &&
      !part.startsWith('__CODE_BLOCK_') &&
      !part.startsWith('$')
    ) {
      let segment = part;
      // Khử escape \% -> %, \_ -> _, \& -> &, \$ -> $
      segment = segment.replace(/\\%/g, '%');
      segment = segment.replace(/\\_/g, '_');
      segment = segment.replace(/\\&/g, '&');
      segment = segment.replace(/\\\$/g, '$');

      // Tự động bọc biểu thức \frac trần
      segment = segment.replace(/(\\frac\{(?:[^{}]|\{[^{}]*\})*\}\{(?:[^{}]|\{[^{}]*\})*\})/g, (_, p1) => `$${p1}$`);
      // Tự động bọc \sqrt trần
      segment = segment.replace(/(\\sqrt(?:\[[^\]]*\])?\{(?:[^{}]|\{[^{}]*\})*\})/g, (_, p1) => `$${p1}$`);
      // Tự động bọc \overline trần
      segment = segment.replace(/(\\overline\{[^{}]*\})/g, (_, p1) => `$${p1}$`);
      // Tự động bọc xác suất điều kiện P(S\mid F)
      segment = segment.replace(/(\b[A-Za-z]\s*\([A-Za-z0-9_+\-*\/|\\]+\\mid[A-Za-z0-9_+\-*\/|\\]+\))/g, (_, p1) => `$${p1}$`);
      // Tự động bọc góc độ 30^\circ
      segment = segment.replace(/(\b\d+\s*\^\s*(?:\\circ|\{?\\circ\}?))/g, (_, p1) => `$${p1}$`);

      parts[i] = segment;
    }
  }
  text = parts.join('');

  // ── BƯỚC 4: TÁCH DÒNG VÀ PHÂN TÍCH TỪNG KHỐI ──
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) continue;

    // 1. Kiểm tra placeholder MATH_BLOCK
    const mathMatch = trimmed.match(/^__MATH_BLOCK_(\d+)__$/);
    if (mathMatch) {
      const id = Number(mathMatch[1]);
      if (mathBlocks[id] !== undefined) {
        blocks.push({
          type: 'math-block',
          content: mathBlocks[id],
        });
      }
      continue;
    }

    // Nếu dòng chứa __MATH_BLOCK__ cùng văn bản (ví dụ "- Công thức: __MATH_BLOCK_0__")
    if (trimmed.includes('__MATH_BLOCK_')) {
      const inlineMathParts = trimmed.split(/(__MATH_BLOCK_\d+__)/g);
      for (const p of inlineMathParts) {
        const pTrim = p.trim();
        if (!pTrim) continue;
        const subMathMatch = pTrim.match(/^__MATH_BLOCK_(\d+)__$/);
        if (subMathMatch) {
          const id = Number(subMathMatch[1]);
          if (mathBlocks[id] !== undefined) {
            blocks.push({ type: 'math-block', content: mathBlocks[id] });
          }
        } else {
          // Xử lý tiền tố danh sách nếu có
          const listM = pTrim.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
          if (listM) {
            blocks.push({ type: 'list-item', prefix: listM[2], text: listM[3] });
          } else {
            blocks.push({ type: 'paragraph', text: pTrim });
          }
        }
      }
      continue;
    }

    // 2. Kiểm tra placeholder CODE_BLOCK
    const codeMatch = trimmed.match(/^__CODE_BLOCK_(\d+)__$/);
    if (codeMatch) {
      const id = Number(codeMatch[1]);
      if (codeBlocks[id] !== undefined) {
        blocks.push({
          type: 'code-block',
          language: codeBlocks[id].language,
          content: codeBlocks[id].content,
        });
      }
      continue;
    }

    // 3. Dòng kẻ ngang (--- hoặc *** hoặc ___ hoặc ----)
    if (/^([-*_])(?:\s*\1){2,}$/.test(trimmed)) {
      blocks.push({ type: 'horizontal-rule' });
      continue;
    }

    // 4. Tiêu đề Markdown (Heading #, ##, ###)
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      let title = headingMatch[2].trim();
      title = title.replace(/\*\*/g, '').trim();
      blocks.push({ type: 'heading', level, text: title });
      continue;
    }

    // 5. Tiêu đề Câu hỏi độc lập (dạng "**Câu 1: ...**" hoặc "Câu 1: ...")
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

    // 6. Khối Dòng Đáp án đúng (ví dụ: "**Đáp án đúng:** C" hoặc "👉 Đáp án đúng: C")
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

    // 7. Khối Dòng Giải thích chi tiết (ví dụ: "**Giải thích chi tiết:** ..." hoặc "💡 Giải thích: ...")
    const explainMatch = line.match(/^(?:💡\s*)?(?:\*\*)?(?:giải thích chi tiết|lời giải chi tiết|hướng dẫn giải|giải thích|lời giải|explanation)[:\s]*(?:\*\*)?\s*(.*)$/i);
    if (explainMatch) {
      let explainText = explainMatch[1].replace(/^\*\*/, '').trim();
      explainText = explainText.replace(/^(?:chi tiết|lời giải)\s*[:\-–]?\s*/i, '').trim();
      blocks.push({
        type: 'explain-item',
        text: explainText,
      });
      continue;
    }

    // 7b. Khối Gợi ý trả lời / Đáp án tham khảo (Dành cho câu Tự luận)
    const suggestionMatch = line.match(/^(?:📝|✍️\s*)?(?:\*\*)?(?:gợi ý trả lời|đáp án tham khảo|hướng dẫn trả lời|gợi ý đáp án|gợi ý|câu trả lời mẫu)[:\s]*(?:\*\*)?\s*(.*)$/i);
    if (suggestionMatch) {
      let suggText = suggestionMatch[1].replace(/^\*\*/, '').trim();
      suggText = suggText.replace(/^(?:chi tiết|trả lời|tham khảo)\s*[:\-–]?\s*/i, '').trim();
      blocks.push({
        type: 'suggestion-item',
        label: 'Gợi ý trả lời / Đáp án tham khảo',
        text: suggText,
      });
      continue;
    }

    // 7c. Khối Thang điểm / Rubric (Dành cho câu Tự luận)
    const rubricMatch = line.match(/^(?:📊|🎯\s*)?(?:\*\*)?(?:thang điểm|tiêu chuẩn chấm|tiêu chí chấm|rubric chấm|rubric|biểu điểm)[:\s]*(?:\*\*)?\s*(.*)$/i);
    if (rubricMatch) {
      let rubText = rubricMatch[1].replace(/^\*\*/, '').trim();
      rubText = rubText.replace(/^(?:chi tiết|chấm)\s*[:\-–]?\s*/i, '').trim();
      blocks.push({
        type: 'rubric-item',
        label: 'Thang điểm & Tiêu chí chấm',
        text: rubText,
      });
      continue;
    }

    // 8. Lựa chọn trắc nghiệm độc lập (A. ..., B. ..., **A.** ..., - **A.** ...)
    const optionMatch = line.match(/^(\s*)(?:[-*+]\s+)?(?:\*\*)?([A-D])(?:\.|\)|\:|\-)(?:\*\*)?\s+(.*)$/i);
    if (optionMatch) {
      const optKey = optionMatch[2].toUpperCase();
      let optText = optionMatch[3].trim();
      optText = optText.replace(/^\*\*/, '').replace(/\*\*$/, '').trim();
      blocks.push({
        type: 'option-item',
        optKey: `${optKey}.`,
        text: optText,
      });
      continue;
    }

    // 9. Danh sách gạch đầu dòng hoặc đánh số (- ..., * ..., 1. ...)
    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
    if (listMatch) {
      blocks.push({
        type: 'list-item',
        prefix: listMatch[2],
        text: listMatch[3],
      });
      continue;
    }

    // 10. Đoạn văn thường
    blocks.push({ type: 'paragraph', text: line });
  }

  return blocks;
}

export const ChatMessageRenderer = React.memo(
  function ChatMessageRenderer({ content, className = '' }: ChatMessageRendererProps) {
    const blocks = useMemo(() => {
      if (!content) return [];
      return parseBlocks(content);
    }, [content]);

    if (!content) return null;

    return (
      <div className={`space-y-2.5 leading-relaxed text-sm text-left ${className}`}>
        {blocks.map((block, idx) => {
          switch (block.type) {
            case 'horizontal-rule':
              return (
                <hr
                  key={idx}
                  className="my-3 border-t border-slate-200 dark:border-slate-800"
                />
              );

            case 'math-block': {
              try {
                const html = katex.renderToString(block.content, {
                  displayMode: true,
                  throwOnError: false,
                  strict: false,
                });
                return (
                  <div
                    key={idx}
                    className="my-3 w-full overflow-x-auto overflow-y-hidden py-1.5 text-left text-slate-900 dark:text-white"
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                );
              } catch {
                return (
                  <div
                    key={idx}
                    className="my-2 p-2 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-mono overflow-x-auto text-left"
                  >
                    $${block.content}$$
                  </div>
                );
              }
            }

            case 'heading': {
              const tokens = tokenizeInline(block.text);
              if (block.level === 1 || block.level === 2) {
                return (
                  <h3
                    key={idx}
                    className="font-bold text-base text-blue-700 dark:text-blue-300 mt-4 mb-2 flex items-baseline gap-1 text-left"
                  >
                    {renderInlineTokens(tokens)}
                  </h3>
                );
              }
              // Level 3 hoặc 4 (Câu 1: ...)
              return (
                <h4
                  key={idx}
                  className="font-bold text-[15px] text-blue-700 dark:text-blue-400 mt-3.5 mb-2 flex items-baseline gap-2 text-left"
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
                  className="flex items-start gap-2.5 py-1.5 px-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800/60 my-1 font-medium transition hover:border-blue-300 dark:hover:border-blue-500/50 hover:bg-blue-50/30 dark:hover:bg-slate-800/50 text-left"
                >
                  <span className="font-bold text-blue-700 dark:text-blue-400 shrink-0 w-5 select-none">
                    {block.optKey}
                  </span>
                  <div className="flex-1 text-slate-800 dark:text-slate-100 leading-relaxed text-left">
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
                  className="my-2.5 p-2.5 px-3.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-2 text-sm text-emerald-900 dark:text-emerald-200 shadow-2xs text-left"
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
                  className="my-2 p-3 rounded-xl bg-blue-50/40 dark:bg-[#131F33] border border-blue-200/60 dark:border-slate-800 text-sm leading-relaxed text-slate-800 dark:text-slate-200 shadow-2xs text-left"
                >
                  <div className="font-semibold text-blue-700 dark:text-blue-400 mb-1 flex items-center gap-1.5 select-none text-xs text-left">
                    <span>💡 Giải thích chi tiết:</span>
                  </div>
                  <div className="leading-relaxed text-left">
                    {renderInlineTokens(tokens)}
                  </div>
                </div>
              );
            }

            case 'suggestion-item': {
              const tokens = tokenizeInline(block.text);
              return (
                <div
                  key={idx}
                  className="my-2 p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/50 text-sm leading-relaxed text-slate-800 dark:text-slate-200 shadow-2xs text-left"
                >
                  <div className="font-semibold text-amber-800 dark:text-amber-400 mb-1 flex items-center gap-1.5 select-none text-xs text-left">
                    <span>📝 {block.label}:</span>
                  </div>
                  <div className="leading-relaxed text-left">
                    {renderInlineTokens(tokens)}
                  </div>
                </div>
              );
            }

            case 'rubric-item': {
              const tokens = tokenizeInline(block.text);
              return (
                <div
                  key={idx}
                  className="my-2 p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200/70 dark:border-purple-800/50 text-sm leading-relaxed text-slate-800 dark:text-slate-200 shadow-2xs text-left"
                >
                  <div className="font-semibold text-purple-800 dark:text-purple-400 mb-1 flex items-center gap-1.5 select-none text-xs text-left">
                    <span>🎯 {block.label}:</span>
                  </div>
                  <div className="leading-relaxed text-left">
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
                <div key={idx} className="flex items-start gap-2.5 py-1 px-1 text-left">
                  <span className="shrink-0 select-none font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                    {block.prefix || '•'}
                  </span>
                  <div className="flex-1 text-slate-800 dark:text-slate-100 leading-relaxed text-left">
                    {renderInlineTokens(tokens)}
                  </div>
                </div>
              );
            }

            case 'paragraph': {
              const tokens = tokenizeInline(block.text);
              return (
                <p key={idx} className="text-slate-800 dark:text-slate-100 leading-relaxed text-left">
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
