/**
 * Tiện ích tạo gợi ý chủ đề nhanh (Topic Suggestions) đồng bộ theo Môn học
 * Dành cho trang Sinh câu hỏi AI (/teacher/ai-generator), Modal AI (/teacher/questions)
 * và Gia sư AI (/teacher/ai-tutor, /student/ai-tutor).
 */

export type SubjectInput = {
  id?: string;
  code?: string | null;
  name?: string | null;
  description?: string | null;
};

// Loại bỏ dấu tiếng Việt để so khớp không phân biệt dấu và chữ hoa thường
function normalizeSearchText(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

// 1. Nhóm Toán học
export const MATH_TOPIC_SUGGESTIONS: string[] = [
  'Đạo hàm và khảo sát sự biến thiên của hàm số',
  'Nguyên hàm, tích phân và ứng dụng hình học',
  'Ma trận, định thức và hệ phương trình tuyến tính',
  'Hàm số bậc hai, phương trình và bất phương trình',
  'Quy tắc đếm, hoán vị, chỉnh hợp, tổ hợp và xác suất',
  'Phương pháp tọa độ trong mặt phẳng và không gian',
];

// 2. Nhóm Lập trình / Kỹ thuật phần mềm
export const PROGRAMMING_TOPIC_SUGGESTIONS: string[] = [
  'Lập trình Hướng đối tượng (OOP): Đóng gói, Kế thừa, Đa hình',
  'Xử lý Ngoại lệ (Exception Handling) và Quản lý Bộ nhớ',
  'Lập trình Bất đồng bộ (Async/Await) và Xử lý Luồng (Thread)',
  'Mẫu thiết kế phần mềm (Design Patterns: Singleton, Factory)',
  'Xây dựng Web API RESTful và Xác thực JWT Authentication',
  'Kiểm thử phần mềm Unit Testing và Tối ưu hóa Clean Code',
];

// 3. Nhóm Cấu trúc dữ liệu & Giải thuật
export const DSA_TOPIC_SUGGESTIONS: string[] = [
  'Cấu trúc dữ liệu Ngăn xếp (Stack) và Hàng đợi (Queue)',
  'Cây nhị phân tìm kiếm (BST) và Cây cân bằng AVL',
  'Các thuật toán sắp xếp: QuickSort, MergeSort, HeapSort',
  'Thuật toán đồ thị: Duyệt BFS, DFS và Tìm đường đi ngắn nhất Dijkstra',
  'Kỹ thuật đệ quy, Quy hoạch động (Dynamic Programming) và Tham lam',
  'Bảng băm (Hash Table) và Phương pháp xử lý đụng độ',
];

// 4. Nhóm Cơ sở dữ liệu
export const DATABASE_TOPIC_SUGGESTIONS: string[] = [
  'Mô hình thực thể kết hợp (ERD) và Chuyển đổi sang Mô hình quan hệ',
  'Ngôn ngữ SQL: Truy vấn dữ liệu đa bảng với JOIN, GROUP BY và HAVING',
  'Chuẩn hóa cơ sở dữ liệu: Dạng chuẩn 1NF, 2NF, 3NF và BCNF',
  'Chỉ mục (Index) và Tối ưu hóa hiệu năng câu lệnh truy vấn SQL',
  'Quản lý Giao dịch (Transaction), Khóa (Lock) và Tính chất ACID',
  'Thủ tục lưu trữ (Stored Procedure), Hàm (Function) và Trigger',
];

// 5. Nhóm Mạng máy tính / Hệ điều hành
export const NETWORK_OS_TOPIC_SUGGESTIONS: string[] = [
  'Mô hình 7 tầng OSI và Bộ giao thức TCP/IP',
  'Chia mạng con IPv4 (Subnetting, VLSM) và Định tuyến Router',
  'Các giao thức ứng dụng: DNS, DHCP, HTTP/HTTPS, FTP',
  'Quản lý Tiến trình (Process), Luồng (Thread) và Điều độ CPU',
  'Quản lý Bộ nhớ ảo (Virtual Memory) và Phân trang (Paging)',
  'Đồng bộ tiến trình, Vấn đề Miền găng và Bế tắc (Deadlock)',
];

// 6. Nhóm Khoa học tự nhiên & Ngoại ngữ / Đại cương
export const PHYSICS_TOPIC_SUGGESTIONS: string[] = [
  'Chuyển động cơ học và các Định luật Newton',
  'Động lực học chất điểm và Định luật bảo toàn năng lượng',
  'Dao động điều hòa và Sóng cơ học',
  'Dòng điện xoay chiều và Mạch dao động LC',
  'Quang hình học và Hiện tượng giao thoa ánh sáng',
  'Vật lý hạt nhân và Phản ứng phân hạch, nhiệt hạch',
];

export const CHEMISTRY_TOPIC_SUGGESTIONS: string[] = [
  'Cấu tạo nguyên tử và Bảng tuần hoàn các nguyên tố hóa học',
  'Liên kết hóa học và Phản ứng oxi hóa - khử',
  'Tốc độ phản ứng và Cân bằng hóa học',
  'Hóa học hữu cơ: Hydrocarbon và Dẫn xuất Halogen - Alcohol',
  'Dung dịch điện ly và Độ pH của môi trường',
  'Hợp chất chứa Nitơ: Amine, Amino Acid và Peptide',
];

export const ENGLISH_TOPIC_SUGGESTIONS: string[] = [
  'Grammar: Tenses, Passive Voice and Conditional Sentences',
  'Reading Comprehension: Skimming, Scanning and Inferences',
  'Vocabulary in Academic Context and Collocations',
  'Error Identification and Sentence Transformation',
  'IELTS / TOEIC Essential Topic-based Discussions',
  'Academic Writing: Cohesion, Coherence and Task Achievement',
];

export const ECONOMICS_TOPIC_SUGGESTIONS: string[] = [
  'Quy luật Cung - Cầu và Cân bằng thị trường',
  'Hành vi người tiêu dùng và Lý thuyết lợi ích',
  'Thị trường cạnh tranh hoàn hảo và Độc quyền',
  'Tổng sản phẩm quốc nội (GDP) và Lạm phát kinh tế',
  'Chính sách tài khóa và Chính sách tiền tệ',
  'Thương mại quốc tế và Tỷ giá hối đoái',
];

export const LAW_PHILOSOPHY_TOPIC_SUGGESTIONS: string[] = [
  'Chủ nghĩa duy vật biện chứng và Phép biện chứng duy vật',
  'Quy luật giá trị và Học thuyết giá trị thặng dư',
  'Hệ thống cơ quan quyền lực nhà nước và Bộ máy pháp quyền',
  'Quy phạm pháp luật và Quan hệ pháp luật',
  'Trách nhiệm pháp lý và Ý thức chấp hành pháp luật',
  'Pháp luật về Hợp đồng và Giải quyết tranh chấp thương mại',
];

// 7. Nhóm Lịch sử
export const HISTORY_TOPIC_SUGGESTIONS: string[] = [
  'Vai trò, chức năng và nhiệm vụ của Sử học',
  'Các cuộc cách mạng công nghiệp trong lịch sử thế giới',
  'Văn minh Đại Việt và truyền thống đấu tranh giữ nước',
  'Cách mạng tháng Tám năm 1945 và sự ra đời nước Việt Nam Dân chủ Cộng hòa',
  'Trật tự thế giới sau Chiến tranh thế giới thứ hai và xu thế toàn cầu hóa',
  'Chiến thắng Điện Biên Phủ 1954 và Hiệp định Giơ-ne-vơ',
];

// 8. Nhóm Địa lý
export const GEOGRAPHY_TOPIC_SUGGESTIONS: string[] = [
  'Vị trí địa lý, phạm vi lãnh thổ và ý nghĩa chiến lược của Việt Nam',
  'Đặc điểm địa hình, khí hậu và tài nguyên thiên nhiên Việt Nam',
  'Địa lý dân cư: Đô thị hóa, phân bố dân cư và nguồn lao động',
  'Chuyển dịch cơ cấu kinh tế theo ngành và theo vùng lãnh thổ',
  'Vấn đề phát triển kinh tế biển và bảo vệ chủ quyền biển đảo',
  'Địa lý các vùng kinh tế trọng điểm và liên kết vùng',
];

// 9. Nhóm Ngữ văn
export const LITERATURE_TOPIC_SUGGESTIONS: string[] = [
  'Đặc trưng thể loại: Thơ trữ tình, Truyện ngắn và Tiểu thuyết',
  'Văn học dân gian: Sử thi, Truyền thuyết và Cổ tích',
  'Chủ nghĩa nhân đạo và cảm hứng yêu nước trong Văn học trung đại',
  'Phong trào Thơ mới và Văn học hiện thực phê phán 1930 - 1945',
  'Kỹ năng viết bài văn nghị luận xã hội và nghị luận văn học',
  'Phân tích nghệ thuật xây dựng nhân vật và ngôn ngữ trần thuật',
];

// 10. Nhóm Sinh học
export const BIOLOGY_TOPIC_SUGGESTIONS: string[] = [
  'Cấu trúc và chức năng của Tế bào: ADN, ARN và Protein',
  'Cơ chế di truyền và biến dị: Nguyên phân, Giảm phân và Thụ tinh',
  'Các quy luật di truyền của Men-đen và di truyền liên kết giới tính',
  'Tiến hóa sinh học: Thuyết tiến hóa Đác-uyn và Tổng hợp hiện đại',
  'Sinh thái học: Quần thể, Quần xã và Hệ sinh thái sinh quyển',
  'Ứng dụng Công nghệ gen và Công nghệ tế bào trong đời sống',
];

// Tập hợp tất cả các gợi ý có sẵn để phát hiện nếu người dùng đang dùng gợi ý mặc định
const ALL_PRESET_SUGGESTIONS = new Set<string>([
  ...MATH_TOPIC_SUGGESTIONS,
  ...PROGRAMMING_TOPIC_SUGGESTIONS,
  ...DSA_TOPIC_SUGGESTIONS,
  ...DATABASE_TOPIC_SUGGESTIONS,
  ...NETWORK_OS_TOPIC_SUGGESTIONS,
  ...PHYSICS_TOPIC_SUGGESTIONS,
  ...CHEMISTRY_TOPIC_SUGGESTIONS,
  ...ENGLISH_TOPIC_SUGGESTIONS,
  ...ECONOMICS_TOPIC_SUGGESTIONS,
  ...LAW_PHILOSOPHY_TOPIC_SUGGESTIONS,
  ...HISTORY_TOPIC_SUGGESTIONS,
  ...GEOGRAPHY_TOPIC_SUGGESTIONS,
  ...LITERATURE_TOPIC_SUGGESTIONS,
  ...BIOLOGY_TOPIC_SUGGESTIONS,
  // Các gợi ý cũ trong code cũ trước đây
  'Đạo hàm và khảo sát hàm số',
  'Lập trình Hướng đối tượng OOP trong C#',
  'Mô hình mạng OSI và giao thức TCP/IP',
  'Cơ sở dữ liệu quan hệ và chuẩn hóa dữ liệu 3NF',
  'Cấu trúc dữ liệu Cây nhị phân tìm kiếm (BST)',
  'Ma trận vuông cấp 2, định thức và ma trận khả nghịch...',
]);

/**
 * Trả về danh sách 5–6 chủ đề gợi ý nhanh theo môn học.
 * Tự động phân tích theo Mã môn (code), Tên môn (name) và Mô tả (description).
 */
export function getSubjectTopicSuggestions(subject?: SubjectInput | null): string[] {
  if (!subject) {
    return MATH_TOPIC_SUGGESTIONS;
  }

  const rawCode = subject.code || '';
  const rawName = subject.name || '';
  const rawDesc = subject.description || '';

  const combined = `${rawCode} ${rawName} ${rawDesc}`;
  const norm = normalizeSearchText(combined);

  // 1. Nhóm Cấu trúc dữ liệu & Giải thuật (Ưu tiên kiểm tra trước Lập trình chung)
  if (
    norm.includes('ctdl') ||
    norm.includes('dsa') ||
    norm.includes('cau truc du lieu') ||
    norm.includes('giai thuat') ||
    norm.includes('thuat toan') ||
    norm.includes('data structure') ||
    norm.includes('algorithm')
  ) {
    return DSA_TOPIC_SUGGESTIONS;
  }

  // 2. Nhóm Cơ sở dữ liệu
  if (
    norm.includes('csdl') ||
    norm.includes('dbms') ||
    norm.includes('sql') ||
    norm.includes('database') ||
    norm.includes('co so du lieu') ||
    norm.includes('he quan tri co so du lieu') ||
    norm.includes('du lieu quan he')
  ) {
    return DATABASE_TOPIC_SUGGESTIONS;
  }

  // 3. Nhóm Mạng máy tính & Hệ điều hành
  if (
    norm.includes('mang') ||
    norm.includes('network') ||
    norm.includes('ccna') ||
    norm.includes('he dieu hanh') ||
    norm.includes('operating system') ||
    norm.includes('os') ||
    norm.includes('tcp/ip') ||
    norm.includes('truyen thong')
  ) {
    return NETWORK_OS_TOPIC_SUGGESTIONS;
  }

  // 4. Nhóm Lập trình / Kỹ thuật phần mềm
  if (
    norm.includes('lap trinh') ||
    norm.includes('cntt') ||
    norm.includes('cong nghe thong tin') ||
    norm.includes('oop') ||
    norm.includes('huong doi tuong') ||
    norm.includes('software') ||
    norm.includes('phan mem') ||
    norm.includes('web') ||
    norm.includes('frontend') ||
    norm.includes('backend') ||
    norm.includes('python') ||
    norm.includes('java') ||
    norm.includes('c#') ||
    norm.includes('c++') ||
    norm.includes('c/c++') ||
    norm.includes('javascript') ||
    norm.includes('typescript') ||
    norm.includes('react')
  ) {
    return PROGRAMMING_TOPIC_SUGGESTIONS;
  }

  // 5. Nhóm Toán học
  if (
    norm.includes('toan') ||
    norm.includes('math') ||
    norm.includes('giai tich') ||
    norm.includes('dai so') ||
    norm.includes('hinh hoc') ||
    norm.includes('xac suat') ||
    norm.includes('thong ke') ||
    norm.includes('roi rac') ||
    norm.includes('vi tich phan') ||
    norm.includes('calculus') ||
    norm.includes('algebra')
  ) {
    return MATH_TOPIC_SUGGESTIONS;
  }

  // 6. Nhóm Khoa học tự nhiên & Ngoại ngữ / Đại cương
  // 6a. Vật lý
  if (norm.includes('vat ly') || norm.includes('vat li') || norm.includes('phys')) {
    return PHYSICS_TOPIC_SUGGESTIONS;
  }

  // 6b. Hóa học
  if (norm.includes('hoa hoc') || norm.includes('chem')) {
    return CHEMISTRY_TOPIC_SUGGESTIONS;
  }

  // 6c. Tiếng Anh
  if (
    norm.includes('tieng anh') ||
    norm.includes('english') ||
    norm.includes('eng') ||
    norm.includes('ngoai ngu')
  ) {
    return ENGLISH_TOPIC_SUGGESTIONS;
  }

  // 6d. Kinh tế / Quản trị
  if (
    norm.includes('kinh te') ||
    norm.includes('quan tri') ||
    norm.includes('tai chinh') ||
    norm.includes('marketing') ||
    norm.includes('ke toan') ||
    norm.includes('economics') ||
    norm.includes('finance') ||
    norm.includes('business')
  ) {
    return ECONOMICS_TOPIC_SUGGESTIONS;
  }

  // 6e. Pháp luật / Triết học
  if (
    norm.includes('phap luat') ||
    norm.includes('triet hoc') ||
    norm.includes('chinh tri') ||
    norm.includes('tu tuong') ||
    norm.includes('mac - lenin') ||
    norm.includes('law') ||
    norm.includes('philosophy')
  ) {
    return LAW_PHILOSOPHY_TOPIC_SUGGESTIONS;
  }

  // 6f. Lịch sử
  const upperCode = rawCode.trim().toUpperCase();
  if (
    upperCode === 'SU' ||
    upperCode === 'HIST' ||
    upperCode === 'LS' ||
    norm.includes('lich su') ||
    norm.includes('su hoc') ||
    norm.includes('history') ||
    norm === 'su' ||
    /\b(su|lich su|su hoc|history|hist)\b/i.test(combined)
  ) {
    return HISTORY_TOPIC_SUGGESTIONS;
  }

  // 6g. Địa lý
  if (
    upperCode === 'DIA' ||
    upperCode === 'GEO' ||
    upperCode === 'DL' ||
    norm.includes('dia ly') ||
    norm.includes('dia li') ||
    norm.includes('geography') ||
    /\b(dia|dia ly|dia li|geography|geo)\b/i.test(combined)
  ) {
    return GEOGRAPHY_TOPIC_SUGGESTIONS;
  }

  // 6h. Ngữ văn
  if (
    upperCode === 'VAN' ||
    upperCode === 'LIT' ||
    upperCode === 'NV' ||
    norm.includes('ngu van') ||
    norm.includes('van hoc') ||
    norm.includes('literature') ||
    /\b(van|ngu van|van hoc|literature|lit)\b/i.test(combined)
  ) {
    return LITERATURE_TOPIC_SUGGESTIONS;
  }

  // 6i. Sinh học
  if (
    upperCode === 'SINH' ||
    upperCode === 'BIO' ||
    upperCode === 'SH' ||
    norm.includes('sinh hoc') ||
    norm.includes('biology') ||
    /\b(sinh hoc|biology|bio)\b/i.test(combined)
  ) {
    return BIOLOGY_TOPIC_SUGGESTIONS;
  }

  // 7. Fallback thông minh: Dành cho môn học mới do Quản trị viên thêm vào
  const cleanName = (rawName || 'Môn học').trim();
  return [
    `Khái niệm cơ bản và Tổng quan về ${cleanName}`,
    `Các nguyên lý cốt lõi và Cơ sở lý thuyết của ${cleanName}`,
    `Phương pháp phân tích và Kỹ thuật thực hành trong ${cleanName}`,
    `Ứng dụng thực tế và Bài toán tình huống của ${cleanName}`,
    `Đánh giá, tối ưu và Giải pháp nâng cao trong ${cleanName}`,
    `Tổng kết kiến thức trọng tâm và Đề cương ôn tập ${cleanName}`,
  ];
}

/**
 * Kiểm tra xem một chuỗi topic có phải là một gợi ý có sẵn (để tự động đổi khi chuyển môn học)
 */
export function isPresetTopicSuggestion(topicText: string): boolean {
  if (!topicText) return false;
  const trimmed = topicText.trim();
  if (ALL_PRESET_SUGGESTIONS.has(trimmed)) return true;

  // Kiểm tra mẫu Fallback thông minh
  if (
    trimmed.startsWith('Khái niệm cơ bản và Tổng quan về') ||
    trimmed.startsWith('Các nguyên lý cốt lõi và Cơ sở lý thuyết của') ||
    trimmed.startsWith('Phương pháp phân tích và Kỹ thuật thực hành trong') ||
    trimmed.startsWith('Ứng dụng thực tế và Bài toán tình huống của') ||
    trimmed.startsWith('Đánh giá, tối ưu và Giải pháp nâng cao trong') ||
    trimmed.startsWith('Tổng kết kiến thức trọng tâm và Đề cương ôn tập')
  ) {
    return true;
  }

  return false;
}
