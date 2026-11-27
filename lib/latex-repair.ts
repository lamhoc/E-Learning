/**
 * Bộ phục hồi LaTeX & văn bản dùng chung (isomorphic: chạy được ở cả Server lẫn Client).
 *
 * Mục đích: cứu mọi chuỗi công thức bị hỏng do đi qua JSON (`\b`, `\f`, `\n`, `\r`, `\t` bị nuốt
 * thành ký tự điều khiển), do AI viết thiếu dấu `\`, hoặc dữ liệu cũ đã lưu trong DB.
 * Được gọi bởi `<MathText />` (`lib/math-normalize.ts`) và bộ kiểm duyệt câu hỏi AI phía server.
 */

// Danh sách lệnh KaTeX/LaTeX hợp lệ thường gặp (dùng để phân biệt lệnh thật với lỗi gõ như `\y`, `\z`)
const KNOWN_LATEX_COMMANDS = new Set<string>([
  // Chữ Hy Lạp
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'varepsilon', 'zeta', 'eta', 'theta', 'vartheta',
  'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'pi', 'varpi', 'rho', 'varrho', 'sigma', 'varsigma',
  'tau', 'upsilon', 'phi', 'varphi', 'chi', 'psi', 'omega',
  'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Upsilon', 'Phi', 'Psi', 'Omega',
  // Cấu trúc & định dạng
  'frac', 'dfrac', 'tfrac', 'cfrac', 'sqrt', 'binom', 'dbinom', 'tbinom', 'over', 'choose',
  'vec', 'overrightarrow', 'overleftarrow', 'overline', 'underline', 'widehat', 'widetilde', 'hat',
  'bar', 'tilde', 'dot', 'ddot', 'acute', 'grave', 'breve', 'check', 'overbrace', 'underbrace',
  'boldsymbol', 'mathbf', 'mathrm', 'mathit', 'mathbb', 'mathcal', 'mathsf', 'mathtt', 'mathfrak',
  'text', 'textbf', 'textit', 'textrm', 'mbox', 'operatorname', 'displaystyle', 'textstyle',
  'scriptstyle', 'begin', 'end', 'left', 'right', 'big', 'Big', 'bigg', 'Bigg', 'bigl', 'bigr',
  'Bigl', 'Bigr', 'middle', 'limits', 'nolimits', 'substack', 'stackrel', 'overset', 'underset',
  'color', 'boxed', 'hline', 'cline', 'cr', 'newline', 'tag', 'nonumber', 'notag', 'phantom',
  // Toán tử & quan hệ
  'times', 'div', 'cdot', 'cdots', 'ldots', 'dots', 'vdots', 'ddots', 'pm', 'mp', 'ast', 'star',
  'circ', 'bullet', 'oplus', 'otimes', 'le', 'leq', 'ge', 'geq', 'ne', 'neq', 'leqslant',
  'geqslant', 'll', 'gg', 'approx', 'sim', 'simeq', 'cong', 'equiv', 'propto', 'parallel', 'perp',
  'mid', 'nmid', 'vert', 'Vert', 'lvert', 'rvert', 'lVert', 'rVert', 'langle', 'rangle', 'lbrace',
  'rbrace', 'lbrack', 'rbrack', 'lfloor', 'rfloor', 'lceil', 'rceil', 'in', 'notin', 'ni',
  'subset', 'subseteq', 'supset', 'supseteq', 'nsubseteq', 'cup', 'cap', 'bigcup', 'bigcap',
  'setminus', 'emptyset', 'varnothing', 'forall', 'exists', 'nexists', 'neg', 'lnot', 'land',
  'lor', 'wedge', 'vee', 'not', 'to', 'gets', 'mapsto', 'rightarrow', 'leftarrow',
  'leftrightarrow', 'Rightarrow', 'Leftarrow', 'Leftrightarrow', 'longrightarrow',
  'longleftarrow', 'Longrightarrow', 'Longleftrightarrow', 'iff', 'implies', 'impliedby',
  'uparrow', 'downarrow', 'rightleftharpoons', 'nearrow', 'searrow', 'nleq', 'ngeq',
  'infty', 'partial', 'nabla', 'prime', 'angle', 'measuredangle', 'triangle', 'square',
  'therefore', 'because', 'ell', 'hbar', 'Re', 'Im', 'aleph', 'top', 'bot',
  // Hàm toán học
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh',
  'ln', 'log', 'lg', 'exp', 'lim', 'liminf', 'limsup', 'max', 'min', 'sup', 'inf', 'det', 'dim',
  'gcd', 'deg', 'arg', 'ker', 'Pr', 'mod', 'bmod', 'pmod',
  'sum', 'prod', 'coprod', 'int', 'iint', 'iiint', 'oint',
  // Khoảng trắng
  'quad', 'qquad', 'enspace', 'thinspace', 'medspace', 'thickspace', 'space', 'hspace', 'vspace',
]);

/** Kiểm tra một tên lệnh (không kèm `\`) có phải lệnh LaTeX/KaTeX hợp lệ hay không. */
export function isKnownLatexCommand(name: string): boolean {
  return KNOWN_LATEX_COMMANDS.has(name);
}

// Ký tự điều khiển sinh ra khi JSON.parse nuốt `\b`, `\t`, `\v`, `\f`, `\r` đứng trước tên lệnh LaTeX
const CONTROL_CHAR_LETTER: Record<string, string> = {
  '\u0008': 'b',
  '\u0009': 't',
  '\u000B': 'v',
  '\u000C': 'f',
  '\u000D': 'r',
};

// Các lệnh bắt đầu bằng t/r an toàn để khôi phục ngay cả ngoài dấu $ (tránh đụng chữ thường sau tab/CR)
const SAFE_GLOBAL_TAB_COMMANDS = new Set([
  'text', 'textbf', 'textit', 'textrm', 'times', 'theta', 'tfrac', 'triangle', 'tilde', 'tau',
]);
const SAFE_GLOBAL_CR_COMMANDS = new Set([
  'right', 'rightarrow', 'rightleftharpoons', 'root', 'rho', 'rangle', 'rceil', 'rfloor', 'rbrack', 'rbrace', 'rvert', 'rVert',
]);

// Đuôi các lệnh bắt đầu bằng chữ `n` mà khi `\n` bị hiểu nhầm thành xuống dòng sẽ bị tách đôi (`\neq` → xuống dòng + `eq`)
const BROKEN_N_COMMAND_TAILS = [
  'eq', 'eqq', 'abla', 'otin', 'leq', 'geq', 'mid', 'parallel', 'subseteq', 'supseteq', 'exists',
  'cong', 'sim', 'earrow', 'warrow',
];

// Các lệnh bắt đầu bằng `n` hợp lệ: `\n` + đuôi này KHÔNG được đổi thành xuống dòng
const N_COMMAND_TAILS = [
  'eq', 'e', 'abla', 'u', 'ot', 'otin', 'i', 'ewline', 'leq', 'geq', 'mid', 'parallel', 'subseteq',
  'supseteq', 'exists', 'eg', 'cong', 'sim', 'earrow', 'warrow', 'atural', 'olimits', 'onumber',
  'otag', 'Rightarrow', 'Leftrightarrow', 'rightarrow', 'leftarrow', 'less', 'gtr',
];

// Môi trường nhiều dòng của KaTeX dùng `\\` để xuống dòng
const MULTILINE_ENVS =
  'cases|dcases|rcases|pmatrix|bmatrix|Bmatrix|vmatrix|Vmatrix|matrix|smallmatrix|aligned|alignedat|gathered|array|split';

// Escape một ký tự (không phải chữ) hợp lệ trong LaTeX — giữ nguyên trong môi trường nhiều dòng
const VALID_SYMBOL_ESCAPES = new Set([',', ';', ':', '!', '{', '}', '|', '%', '&', '#', '$', '_', '[', ']', '>', '<']);

const sortedByLengthDesc = (list: string[]) => [...list].sort((a, b) => b.length - a.length);

const N_COMMAND_LOOKAHEAD = `(?:${sortedByLengthDesc(N_COMMAND_TAILS).join('|')})(?![a-zA-Z\\u00C0-\\u1EF9])`;
// Literal `\n` (hoặc `\\n`) trong văn bản thường không phải lệnh LaTeX bắt đầu bằng `n`
const LITERAL_NEWLINE_TEXT_RE = new RegExp(`\\\\{1,2}n(?!${N_COMMAND_LOOKAHEAD})`, 'g');
// Literal `\n` đơn lẻ trong công thức toán (không đụng `\\n` là xuống dòng + biến n)
const LITERAL_NEWLINE_MATH_RE = new RegExp(`(?<!\\\\)\\\\n(?!${N_COMMAND_LOOKAHEAD})`, 'g');
// Xuống dòng thật bị tách khỏi đuôi lệnh (`\neq` → "\n" + "eq"), không áp dụng sau `\\`
const BROKEN_N_RE = new RegExp(
  `(?<!\\\\\\\\[ \\t]*)\\n(?=(?:${sortedByLengthDesc(BROKEN_N_COMMAND_TAILS).join('|')})(?![a-zA-Z]))`,
  'g'
);
const HAS_BROKEN_N_RE = new RegExp(
  `\\n(?:${sortedByLengthDesc(BROKEN_N_COMMAND_TAILS).join('|')})(?![a-zA-Z])`
);

type MathToken = { kind: 'text' | 'inline' | 'block'; value: string };

/**
 * Tách tuyến tính O(n) văn bản thường vs công thức ($...$ / $$...$$).
 * Cho phép cặp `$` đơn chứa xuống dòng CHỈ KHI bên trong chứa `\begin{...}` hoặc `\n`+`eq` bị gãy
 * (tránh bắt nhầm hai ký hiệu tiền tệ USD ở hai dòng khác nhau).
 */
function splitMathTokens(input: string): MathToken[] {
  const tokens: MathToken[] = [];
  const len = input.length;
  let textStart = 0;
  let i = 0;

  const flushText = (end: number) => {
    if (end > textStart) {
      tokens.push({ kind: 'text', value: input.slice(textStart, end) });
    }
  };

  while (i < len) {
    if (input[i] === '\\' && input[i + 1] === '$') {
      i += 2;
      continue;
    }

    if (input[i] === '$') {
      // Block math $$...$$
      if (input[i + 1] === '$') {
        const closeIdx = input.indexOf('$$', i + 2);
        if (closeIdx !== -1) {
          flushText(i);
          tokens.push({ kind: 'block', value: input.slice(i + 2, closeIdx) });
          i = closeIdx + 2;
          textStart = i;
          continue;
        }
        i += 2;
        continue;
      }

      // Inline math $...$
      let closeIdx = -1;
      for (let j = i + 1; j < len; j++) {
        if (input[j] === '\\' && input[j + 1] === '$') {
          j++;
          continue;
        }
        if (input[j] === '$') {
          // Không khớp nếu gặp $$ (đóng sai kiểu)
          if (input[j + 1] === '$') break;
          closeIdx = j;
          break;
        }
      }

      if (closeIdx !== -1) {
        const inner = input.slice(i + 1, closeIdx);
        const hasNewline = inner.includes('\n');
        const allowMultiline =
          !hasNewline ||
          /\\begin\{/.test(inner) ||
          HAS_BROKEN_N_RE.test(inner);

        if (allowMultiline && inner.length > 0) {
          flushText(i);
          tokens.push({ kind: 'inline', value: inner });
          i = closeIdx + 1;
          textStart = i;
          continue;
        }
      }
    }

    i++;
  }

  flushText(len);
  return tokens;
}

/** Áp dụng biến đổi riêng cho phần văn bản thường và phần công thức ($...$ / $$...$$). */
function mapMathAndText(
  input: string,
  onText: (segment: string) => string,
  onMath: (segment: string, isBlock: boolean) => string
): string {
  return splitMathTokens(input)
    .map((tok) => {
      if (tok.kind === 'text') return onText(tok.value);
      const fixed = onMath(tok.value, tok.kind === 'block');
      return tok.kind === 'block' ? `$$${fixed}$$` : `$${fixed}$`;
    })
    .join('');
}

/** Phục hồi các ký tự điều khiển ASCII sinh ra do JSON nuốt mất dấu `\` của lệnh LaTeX. */
function recoverControlCharCommands(str: string, inMath: boolean): string {
  return str.replace(/([\u0008\u0009\u000B\u000C\u000D])([a-zA-Z]+)/g, (match, ctrl: string, rest: string) => {
    const cmd = `${CONTROL_CHAR_LETTER[ctrl] ?? ''}${rest}`;
    if (cmd === 'boldsymbol') return '\\overrightarrow';
    if (cmd === 'root') return '\\sqrt';

    if (ctrl === '\u0009') {
      if (inMath ? isKnownLatexCommand(cmd) : SAFE_GLOBAL_TAB_COMMANDS.has(cmd)) {
        return `\\${cmd}`;
      }
      return match;
    }

    if (ctrl === '\u000D') {
      if (inMath ? isKnownLatexCommand(cmd) : SAFE_GLOBAL_CR_COMMANDS.has(cmd)) {
        return `\\${cmd}`;
      }
      return match;
    }

    // \u0008 (\b), \u000B (\v), \u000C (\f) không bao giờ là ký tự hợp lệ trong văn bản học thuật
    if (isKnownLatexCommand(cmd)) return `\\${cmd}`;
    return `\\${cmd}`;
  });
}

/** Sửa các lệnh LaTeX bị mất dấu `\` hoặc viết sai (áp dụng toàn chuỗi). */
function fixBareCommandsGlobal(str: string): string {
  let s = str;
  // Phục hồi nếu có ký tự tofu/box thay thế bị copy từ dữ liệu cũ
  s = s.replace(/[\uFFFD\u2612\u25A1]oldsymbol\s*\{/g, '\\overrightarrow{');
  s = s.replace(/[\uFFFD\u25B2\u2612\u25A1]rac\s*\{/g, '\\frac{');

  // \root{n}\of{x} → \sqrt[n]{x}; \root{x} / \root{x}\root / \root17\root → \sqrt{x}
  s = s.replace(/\\root\s*\{([^{}]+)\}\s*\\of\s*\{([^{}]+)\}/g, '\\sqrt[$1]{$2}');
  s = s.replace(/\\root\s*\{([^{}]+)\}(?:\s*\\?r?oot(?![a-zA-Z]))?/g, '\\sqrt{$1}');
  s = s.replace(/\\(?:root|sqrt)\s*(\d+)\s*\\(?:root|sqrt)(?![a-zA-Z{[])/g, '\\sqrt{$1}');
  // `\sqrt{17}\sqrt` (đuôi `\root` thừa do recoverControlCharCommands đổi `\u000Doot` -> `\sqrt`)
  s = s.replace(/\\sqrt\s*\{([^{}]+)\}\s*\\sqrt(?![a-zA-Z{[])/g, '\\sqrt{$1}');

  // "oot{17}oot" / "oot{17}" / "oot17oot" (mất `\r`) → \sqrt{17}
  s = s.replace(/(^|[^\\a-zA-Z])r?oot\s*\{([^{}]+)\}(?:\s*r?oot(?![a-zA-Z]))?/g, '$1\\sqrt{$2}');
  s = s.replace(/(^|[^\\a-zA-Z])r?oot\s*(\d+)\s*r?oot(?![a-zA-Z])/g, '$1\\sqrt{$2}');

  // "oldsymbol{u}" / "boldsymbol{u}" thiếu `\` → \overrightarrow{u}
  s = s.replace(/(^|[^\\a-zA-Z])b?oldsymbol\s*\{/g, '$1\\overrightarrow{');
  // "frac{a}{b}" / "rac{a}{b}" thiếu `\` → \frac{a}{b}
  s = s.replace(/(^|[^\\a-zA-Z])f?rac\s*\{([^{}]*)\}\s*\{/g, '$1\\frac{$2}{');
  // "sqrt{..}" / "overrightarrow{..}" thiếu `\`
  s = s.replace(/(^|[^\\a-zA-Z])sqrt\s*([{[])/g, '$1\\sqrt$2');
  s = s.replace(/(^|[^\\a-zA-Z])overrightarrow\s*\{/g, '$1\\overrightarrow{');
  return s;
}

/** Sửa lệnh thiếu `\` và chuẩn hóa macro không tương thích KaTeX (chỉ trong công thức toán). */
function fixBareCommandsInMath(math: string): string {
  let s = math;
  s = s.replace(/(^|[^\\a-zA-Z])r?oot\s*(\d+)(?![a-zA-Z\d])/g, '$1\\sqrt{$2}');
  s = s.replace(/(^|[^\\a-zA-Z])t?ext\s*\{/g, '$1\\text{');
  s = s.replace(new RegExp(`(^|[^\\\\a-zA-Z])b?egin\\s*\\{(${MULTILINE_ENVS})\\}`, 'g'), '$1\\begin{$2}');
  s = s.replace(new RegExp(`(^|[^\\\\a-zA-Z])end\\s*\\{(${MULTILINE_ENVS})\\}`, 'g'), '$1\\end{$2}');
  s = s.replace(/(^|[^\\a-zA-Z])imes(?![a-zA-Z])/g, '$1\\times');
  s = s.replace(/(^|[^\\a-zA-Z])heta(?![a-zA-Z])/g, '$1\\theta');
  s = s.replace(/(^|[^\\a-zA-Z])ight(?=\s*[)\]|.}])/g, '$1\\right');
  // Chuẩn hóa macro không chuẩn KaTeX mà LLM hay sinh
  s = s.replace(/\\degree(?![a-zA-Z])/g, '^\\circ');
  s = s.replace(/\\tg(?![a-zA-Z])/g, '\\tan');
  s = s.replace(/\\cotg(?![a-zA-Z])/g, '\\cot');
  s = s.replace(/\\cosec(?![a-zA-Z])/g, '\\csc');
  s = s.replace(/\\arctg(?![a-zA-Z])/g, '\\arctan');
  s = s.replace(/\\arccotg(?![a-zA-Z])/g, '\\operatorname{arccot}');
  return s;
}

/**
 * Sửa dấu `\` đơn trong môi trường nhiều dòng (cases, pmatrix, bmatrix, aligned...):
 * `\y`, `\z`, `\x`, `\ 2x`... (vốn là `\\` bị mất một dấu) → `\\ ` (xuống dòng chuẩn KaTeX).
 * Giữ nguyên lệnh hợp lệ (`\text`, `\times`, `\to`, `\alpha`...) và escape ký hiệu (`\,`, `\{`...).
 */
function fixSingleBackslashInEnvironments(str: string): string {
  const envRe = new RegExp(`\\\\begin\\{(${MULTILINE_ENVS})\\}([\\s\\S]*?)\\\\end\\{\\1\\}`, 'g');
  return str.replace(envRe, (_whole, env: string, body: string) => {
    const fixedBody = body.replace(
      /\\\\|\\([a-zA-Z]+|[\s\S])/g,
      (m: string, tok: string | undefined, offset: number, full: string) => {
        if (tok === undefined) return m; // `\\` hợp lệ
        if (/^[a-zA-Z]/.test(tok)) {
          if (isKnownLatexCommand(tok)) return m;
          // Trường hợp đặc biệt: literal `\n` xuất hiện như ký tự xuống dòng trong hệ phương trình
          // (ví dụ `x = 1 \\ \n y = 2` vs biến n `x = 1 \n = 2`)
          if (tok === 'n') {
            const after = full.slice(offset + m.length);
            if (!/^\s*[=<>+\-^_,;)]/.test(after)) {
              const before = full.slice(0, offset);
              return /\\\\\s*$/.test(before) ? '\n' : '\\\\ ';
            }
          }
          return `\\\\ ${tok}`;
        }
        if (VALID_SYMBOL_ESCAPES.has(tok)) return m;
        // `\ `, `\` + xuống dòng, `\2`, `\-`... → xuống dòng hệ phương trình
        return /\s/.test(tok) ? '\\\\ ' : `\\\\ ${tok}`;
      }
    );
    return `\\begin{${env}}${fixedBody}\\end{${env}}`;
  });
}

/**
 * Nâng cấp `$ ... \begin{cases}...\end{cases} ... $` (dấu $ đơn, kể cả chứa xuống dòng)
 * thành Display Math `$$...$$` để KaTeX render đúng hệ phương trình / ma trận.
 */
function upgradeInlineEnvironmentsToDisplay(str: string): string {
  const envCheckRe = new RegExp(`\\\\begin\\{(${MULTILINE_ENVS})\\}[\\s\\S]*?\\\\end\\{\\1\\}`);
  return splitMathTokens(str)
    .map((tok) => {
      if (tok.kind === 'text') return tok.value;
      if (tok.kind === 'block') return `$$${tok.value}$$`;
      if (envCheckRe.test(tok.value)) {
        return `$$${tok.value.trim()}$$`;
      }
      return `$${tok.value}$`;
    })
    .join('');
}

/**
 * Chuẩn hóa & phục hồi chuỗi LaTeX + văn bản (chạy đầu vào của `<MathText />` và bộ kiểm duyệt AI):
 * 1. Phục hồi ký tự điều khiển bị JSON nuốt (`\u0008oldsymbol` → `\overrightarrow`, `\u000Crac` → `\frac`,
 *    `\u0009ext` → `\text`, `\u000Doot` → `\sqrt`...), xóa ký tự điều khiển rác còn sót.
 * 2. Gộp `\neq` bị tách dòng trong công thức; sửa lệnh thiếu `\` (`boldsymbol{`, `frac{`, `oot{..}oot`, `\root`).
 * 3. Sửa `\` đơn trong `cases/pmatrix/bmatrix/aligned` → `\\`.
 * 4. Đổi literal `\n` / `\\n` ngoài công thức thành xuống dòng thật (giữ nguyên `\neq`, `\nabla`, `\nu`...).
 * 5. Nâng `$...\begin{cases}...$` → `$$...$$`.
 */
export function repairLatexAndText(raw: string | null | undefined): string {
  if (raw === null || raw === undefined) return '';
  let str = String(raw);
  if (!str) return '';

  // 1. Phục hồi ký tự điều khiển → lệnh LaTeX (phân biệt trong/ngoài toán cho \t và \r), sau đó xóa rác
  str = mapMathAndText(
    str,
    (text) => recoverControlCharCommands(text, false),
    (math) => recoverControlCharCommands(math, true)
  );
  str = str.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  str = str.replace(/\r\n?/g, '\n');

  // 2. Gộp `\neq` bị tách dòng trong công thức + sửa lệnh thiếu `\`
  str = fixBareCommandsGlobal(str);
  str = mapMathAndText(
    str,
    (text) => text,
    (math) => fixBareCommandsInMath(math.replace(BROKEN_N_RE, '\\n'))
  );

  // 3. Dấu `\` đơn trong môi trường nhiều dòng (cases, pmatrix, bmatrix, aligned...)
  str = fixSingleBackslashInEnvironments(str);

  // 4. Literal `\r\n`, `\n`, `\t` → xuống dòng thật (trong text) hoặc khoảng trắng (trong toán, không đụng `\\n`)
  str = mapMathAndText(
    str,
    (text) =>
      text
        .replace(/\\{1,2}r(?=\\{1,2}n)/g, '')
        .replace(LITERAL_NEWLINE_TEXT_RE, '\n')
        .replace(/(?<!\\)\\t(?![a-zA-Z])/g, ' '),
    (math) =>
      math
        .replace(/(?<!\\)\\r(?=\\n)/g, '')
        .replace(LITERAL_NEWLINE_MATH_RE, ' ')
  );

  // 5. Nâng `$...\begin{cases}...$` (kể cả có xuống dòng) → `$$...$$`
  str = upgradeInlineEnvironmentsToDisplay(str);

  return str;
}

/**
 * Bảo vệ dấu `\` của lệnh LaTeX trong chuỗi JSON TRƯỚC khi gọi `JSON.parse()`:
 * `\frac`, `\neq`, `\text`, `\beta`, `\right`, `\boldsymbol`, `\root`... (vốn trùng escape JSON
 * `\f`, `\n`, `\t`, `\b`, `\r`) được nhân đôi thành `\\frac`... để không bị nuốt thành ký tự điều khiển.
 * `\n` thật (xuống dòng) giữ nguyên.
 */
export function protectLatexBackslashesInJson(jsonStr: string): string {
  if (!jsonStr) return '';
  return jsonStr.replace(
    /(?<!\\)((?:\\\\)*)\\([bfnrtv])([a-zA-Z]*)/g,
    (match, evenSlashes: string, letter: string, rest: string) => {
      const cmd = `${letter}${rest}`;
      if (cmd === 'boldsymbol' || cmd === 'root' || isKnownLatexCommand(cmd)) {
        return `${evenSlashes}\\\\${cmd}`;
      }
      return match;
    }
  );
}
