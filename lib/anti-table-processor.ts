/**
 * Module Anti-Table Post-Processor:
 * Tự động phát hiện và chuyển đổi các bảng Markdown thành định dạng dòng chi tiết,
 * thoáng mắt, dễ đọc trên cả điện thoại và máy tính.
 */

/**
 * Kiểm tra xem một dòng có phải là dòng phân cách bảng Markdown (|---|---|) hay không
 */
function isTableSeparator(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) return false;
  return /^\|?(\s*:?-{2,}:?\s*\|)+\s*:?-{2,}:?\s*\|?$/.test(trimmed);
}

/**
 * Tách một dòng Markdown table thành các ô dữ liệu
 */
function parseTableCells(line: string): string[] {
  const trimmed = line.trim();
  return trimmed
    .split('|')
    .map((c) => c.trim())
    .filter((c, idx, arr) => (idx === 0 && !c ? false : idx === arr.length - 1 && !c ? false : true));
}

/**
 * Tách cột chứa nhiều phương án trắc nghiệm gộp (ví dụ "A. 2 B. 4 C. 6 D. 8") thành mảng 4 phương án
 */
function splitMergedOptions(text: string): { key: string; val: string }[] {
  const options: { key: string; val: string }[] = [];
  if (!text) return options;

  // Regex bắt A. hoặc A) hoặc [A] hoặc A: hoặc **A.**
  const regex = /(?:^|\s|\b|\*\*|\()([A-D])(?:\.|\)|\:|\-|\*\*|\))\s*([\s\S]*?)(?=(?:\s+(?:(?:\*\*)?[A-D][\.\)\:\-]|\([A-D]\))|$))/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const key = match[1].toUpperCase();
    let val = (match[2] || '').trim();
    // Khử dấu ** thừa ở đầu/cuối nếu có
    val = val.replace(/^\*\*/, '').replace(/\*\*$/, '').trim();
    if (val) {
      options.push({ key, val });
    }
  }

  return options;
}

/**
 * Chuyển đổi toàn bộ bảng Markdown trong văn bản thành các dòng chi tiết
 */
export function convertMarkdownTablesToLines(content?: string | null): string {
  if (!content) return '';
  const lines = content.split('\n');
  const resultLines: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Kiểm tra xem dòng hiện tại và dòng tiếp theo có tạo thành bảng Markdown không
    if (
      trimmed.includes('|') &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1])
    ) {
      const headerLine = trimmed;
      const headers = parseTableCells(headerLine);
      i += 2; // Bỏ qua dòng header và dòng separator

      const rows: string[][] = [];
      while (i < lines.length) {
        const rowLine = lines[i].trim();
        if (!rowLine || !rowLine.includes('|')) break;
        // Bỏ qua dòng separator thừa nếu có
        if (!isTableSeparator(rowLine)) {
          rows.push(parseTableCells(rowLine));
        }
        i++;
      }

      // Phân tích loại bảng dựa trên tiêu đề các cột
      const lowerHeaders = headers.map((h) => h.toLowerCase().replace(/[*_#:]/g, '').trim());
      const isQuestionTable = lowerHeaders.some(
        (h) =>
          h.includes('câu') ||
          h.includes('stt') ||
          h.includes('đề bài') ||
          h.includes('câu hỏi') ||
          h.includes('phương án') ||
          h.includes('tùy chọn') ||
          h.includes('đáp án') ||
          h.includes('question') ||
          h.includes('option')
      );

      if (isQuestionTable) {
        // --- CHUYỂN ĐỔI BẢNG CÂU HỎI / TRẮC NGHIỆM THÀNH CÁC DÒNG DỌC ---
        const colQuestionIdx = lowerHeaders.findIndex(
          (h) => h.includes('câu hỏi') || h.includes('đề bài') || h.includes('nội dung') || h.includes('question')
        );
        const colOptionsIdx = lowerHeaders.findIndex(
          (h) => h.includes('phương án') || h.includes('tùy chọn') || h.includes('lựa chọn') || h.includes('option')
        );
        const colAnswerIdx = lowerHeaders.findIndex(
          (h) => h.includes('đáp án') || h.includes('answer')
        );
        const colExplainIdx = lowerHeaders.findIndex(
          (h) => h.includes('giải thích') || h.includes('hướng dẫn') || h.includes('explanation')
        );

        // Kiểm tra xem có 4 cột riêng A, B, C, D không
        const colA = lowerHeaders.findIndex((h) => /^a[\.\)]?$/.test(h) || h === 'a');
        const colB = lowerHeaders.findIndex((h) => /^b[\.\)]?$/.test(h) || h === 'b');
        const colC = lowerHeaders.findIndex((h) => /^c[\.\)]?$/.test(h) || h === 'c');
        const colD = lowerHeaders.findIndex((h) => /^d[\.\)]?$/.test(h) || h === 'd');
        const hasSeparateCols = colA !== -1 && colB !== -1 && colC !== -1 && colD !== -1;

        rows.forEach((row, rowIdx) => {
          const qNum = rowIdx + 1;
          let questionText = '';

          if (colQuestionIdx !== -1 && row[colQuestionIdx]) {
            questionText = row[colQuestionIdx].trim();
          } else {
            // Lấy cột đầu tiên nếu không tìm thấy cột câu hỏi
            questionText = (row[0] || '').trim();
          }

          // Khử "Câu X:" bị lặp ở đầu nội dung câu hỏi nếu đã có
          questionText = questionText.replace(/^(?:câu|bài|question)\s*\d+[:.]\s*/i, '').trim();

          resultLines.push(`### Câu ${qNum}: ${questionText}`);

          // Xuất 4 phương án
          if (hasSeparateCols) {
            resultLines.push(`- **A.** ${row[colA]?.trim() || ''}`);
            resultLines.push(`- **B.** ${row[colB]?.trim() || ''}`);
            resultLines.push(`- **C.** ${row[colC]?.trim() || ''}`);
            resultLines.push(`- **D.** ${row[colD]?.trim() || ''}`);
          } else if (colOptionsIdx !== -1 && row[colOptionsIdx]) {
            const parsedOpts = splitMergedOptions(row[colOptionsIdx]);
            if (parsedOpts.length >= 2) {
              parsedOpts.forEach((opt) => {
                resultLines.push(`- **${opt.key}.** ${opt.val}`);
              });
            } else {
              // Nếu không tách được bằng regex, in nguyên văn bản
              resultLines.push(`- ${row[colOptionsIdx].trim()}`);
            }
          }

          // Xuất Đáp án đúng
          if (colAnswerIdx !== -1 && row[colAnswerIdx]) {
            let ansVal = row[colAnswerIdx].trim();
            // Chuẩn hóa chỉ giữ lại đáp án (ví dụ "A" hoặc "Đáp án C")
            ansVal = ansVal.replace(/^(?:đáp án|đáp án đúng|answer)[:\s]*/i, '').trim();
            resultLines.push(`\n**Đáp án đúng:** ${ansVal}`);
          }

          // Xuất Giải thích chi tiết
          if (colExplainIdx !== -1 && row[colExplainIdx]) {
            const explainVal = row[colExplainIdx].trim();
            if (explainVal) {
              resultLines.push(`**Giải thích chi tiết:** ${explainVal}`);
            }
          }

          resultLines.push(''); // Dòng trống cách giữa các câu
        });
      } else {
        // --- CHUYỂN ĐỔI BẢNG NỘI DUNG KHÁC THÀNH DANH SÁCH DỌC ---
        rows.forEach((row, rowIdx) => {
          const firstVal = row[0]?.trim() || `Mục ${rowIdx + 1}`;
          resultLines.push(`#### ${firstVal}`);

          for (let c = 1; c < headers.length; c++) {
            const headerName = headers[c]?.trim() || `Thuộc tính ${c}`;
            const cellVal = row[c]?.trim() || '';
            if (cellVal) {
              resultLines.push(`- **${headerName}:** ${cellVal}`);
            }
          }
          resultLines.push('');
        });
      }

      continue;
    }

    resultLines.push(line);
    i++;
  }

  return resultLines.join('\n');
}
