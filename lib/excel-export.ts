import Papa from 'papaparse';

export type GradeReportRow = {
  stt: number;
  studentCode: string;
  studentName: string;
  studentEmail: string;
  className: string;
  mcScore: number | string;
  essayScore: number | string;
  totalScore: number | string;
  submittedAt: string;
  violationCount: number;
  gradingStatus: string;
};

export type ExcelExportOptions = {
  fileName: string;
  sheetTitle?: string;
  metadata?: {
    examTitle?: string;
    subjectName?: string;
    generatedAt?: string;
    teacherName?: string;
  };
  rows: GradeReportRow[];
};

function escapeXml(unsafe: string | number | null | undefined): string {
  if (unsafe === null || unsafe === undefined) return '';
  const str = String(unsafe);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Xuất dữ liệu bảng điểm ra định dạng SpreadsheetML (.xls/.xlsx compatible)
 * Hỗ trợ định dạng đầy đủ cho Microsoft Excel với tiếng Việt UTF-8 100%,
 * tiêu đề bảng màu xanh Đại học Lạc Hồng, viền bảng và định dạng số thập phân.
 */
export function exportGradeReportToExcel(options: ExcelExportOptions) {
  const { fileName, sheetTitle = 'Bảng Điểm', metadata, rows } = options;

  const headerTitles = [
    'STT',
    'Mã SV (MSSV)',
    'Họ và tên',
    'Email',
    'Lớp',
    'Điểm Trắc nghiệm',
    'Điểm Tự luận',
    'Tổng điểm',
    'Thời gian nộp bài',
    'Số lần vi phạm',
    'Trạng thái chấm',
  ];

  const colWidths = [45, 95, 160, 180, 85, 105, 95, 85, 130, 95, 115];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>${escapeXml(metadata?.teacherName || 'Mầm Học E-Learning')}</Author>
  <Created>${new Date().toISOString()}</Created>
  <Title>${escapeXml(metadata?.examTitle || 'Bảng điểm')}</Title>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="TitleStyle">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="16" ss:Bold="1" ss:Color="#154C99"/>
  </Style>
  <Style ss:ID="MetaLabel">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="10" ss:Bold="1" ss:Color="#4B5563"/>
  </Style>
  <Style ss:ID="MetaValue">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="10" ss:Color="#1F2937"/>
  </Style>
  <Style ss:ID="TableHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0D356A"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0D356A"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0D356A"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0D356A"/>
   </Borders>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#154C99" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="CellLeft">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
   </Borders>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="10" ss:Color="#111827"/>
  </Style>
  <Style ss:ID="CellCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
   </Borders>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="10" ss:Color="#111827"/>
  </Style>
  <Style ss:ID="CellScore">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
   </Borders>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="10" ss:Bold="1" ss:Color="#154C99"/>
   <NumberFormat ss:Format="0.00"/>
  </Style>
  <Style ss:ID="CellTotalScore">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
   </Borders>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Bold="1" ss:Color="#047857"/>
   <Interior ss:Color="#ECFDF5" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="0.00"/>
  </Style>
  <Style ss:ID="CellViolation">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
   </Borders>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="10" ss:Color="#B91C1C"/>
   <Interior ss:Color="#FEF2F2" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${escapeXml(sheetTitle.slice(0, 31))}">
  <Table ss:DefaultRowHeight="20">
`;

  // Thiết lập độ rộng từng cột
  for (const width of colWidths) {
    xml += `   <Column ss:Width="${width}"/>\n`;
  }

  // Khối thông tin mở đầu (Metadata Header)
  if (metadata) {
    xml += `   <Row ss:Height="28">
    <Cell ss:MergeAcross="${headerTitles.length - 1}" ss:StyleID="TitleStyle">
     <Data ss:Type="String">BẢNG ĐIỂM CHI TIẾT - ${escapeXml(metadata.examTitle || 'ĐỀ THI')}</Data>
    </Cell>
   </Row>\n`;

    if (metadata.subjectName) {
      xml += `   <Row>
    <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Môn học:</Data></Cell>
    <Cell ss:MergeAcross="3" ss:StyleID="MetaValue"><Data ss:Type="String">${escapeXml(metadata.subjectName)}</Data></Cell>
    <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Giảng viên:</Data></Cell>
    <Cell ss:MergeAcross="3" ss:StyleID="MetaValue"><Data ss:Type="String">${escapeXml(metadata.teacherName || '')}</Data></Cell>
   </Row>\n`;
    }

    xml += `   <Row>
    <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Ngày xuất:</Data></Cell>
    <Cell ss:MergeAcross="3" ss:StyleID="MetaValue"><Data ss:Type="String">${escapeXml(metadata.generatedAt || new Date().toLocaleString('vi-VN'))}</Data></Cell>
    <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Tổng số bài:</Data></Cell>
    <Cell ss:MergeAcross="3" ss:StyleID="MetaValue"><Data ss:Type="String">${rows.length} bài thi</Data></Cell>
   </Row>\n`;

    xml += `   <Row ss:Height="8"/>\n`; // Dòng trống ngăn cách
  }

  // Dòng Tiêu đề Bảng
  xml += `   <Row ss:Height="24">\n`;
  for (const title of headerTitles) {
    xml += `    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(title)}</Data></Cell>\n`;
  }
  xml += `   </Row>\n`;

  // Các dòng dữ liệu sinh viên
  for (const row of rows) {
    const mcNum = typeof row.mcScore === 'number' ? row.mcScore : parseFloat(String(row.mcScore));
    const essayNum = typeof row.essayScore === 'number' ? row.essayScore : parseFloat(String(row.essayScore));
    const totalNum = typeof row.totalScore === 'number' ? row.totalScore : parseFloat(String(row.totalScore));

    xml += `   <Row ss:Height="20">
    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${row.stt}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(row.studentCode || '—')}</Data></Cell>
    <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${escapeXml(row.studentName)}</Data></Cell>
    <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${escapeXml(row.studentEmail)}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(row.className || '—')}</Data></Cell>
    <Cell ss:StyleID="CellScore">${!isNaN(mcNum) ? `<Data ss:Type="Number">${mcNum.toFixed(2)}</Data>` : `<Data ss:Type="String">—</Data>`}</Cell>
    <Cell ss:StyleID="CellScore">${!isNaN(essayNum) ? `<Data ss:Type="Number">${essayNum.toFixed(2)}</Data>` : `<Data ss:Type="String">—</Data>`}</Cell>
    <Cell ss:StyleID="CellTotalScore">${!isNaN(totalNum) ? `<Data ss:Type="Number">${totalNum.toFixed(2)}</Data>` : `<Data ss:Type="String">—</Data>`}</Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(row.submittedAt)}</Data></Cell>
    <Cell ss:StyleID="${row.violationCount > 0 ? 'CellViolation' : 'CellCenter'}"><Data ss:Type="Number">${row.violationCount}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(row.gradingStatus)}</Data></Cell>
   </Row>\n`;
  }

  xml += `  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  triggerBrowserDownload(blob, `${sanitizeFileName(fileName)}.xls`);
}

/**
 * Xuất dữ liệu bảng điểm ra file CSV kèm UTF-8 BOM (\uFEFF)
 * Tương thích hoàn toàn khi mở bằng Microsoft Excel tại Việt Nam mà không bị lỗi dấu font.
 */
export function exportGradeReportToCsv(options: ExcelExportOptions) {
  const { fileName, rows } = options;

  const csvData = rows.map((r) => ({
    'STT': r.stt,
    'Mã SV (MSSV)': r.studentCode || '—',
    'Họ và tên': r.studentName,
    'Email': r.studentEmail,
    'Lớp': r.className || '—',
    'Điểm Trắc nghiệm': typeof r.mcScore === 'number' ? r.mcScore.toFixed(2) : r.mcScore,
    'Điểm Tự luận': typeof r.essayScore === 'number' ? r.essayScore.toFixed(2) : r.essayScore,
    'Tổng điểm': typeof r.totalScore === 'number' ? r.totalScore.toFixed(2) : r.totalScore,
    'Thời gian nộp bài': r.submittedAt,
    'Số lần vi phạm': r.violationCount,
    'Trạng thái chấm': r.gradingStatus,
  }));

  const csvString = Papa.unparse(csvData);
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvString], { type: 'text/csv;charset=utf-8;' });
  triggerBrowserDownload(blob, `${sanitizeFileName(fileName)}.csv`);
}

function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 50);
}

function triggerBrowserDownload(blob: Blob, fullFileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fullFileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

