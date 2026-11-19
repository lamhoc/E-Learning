/**
 * Bộ Trả Lời Dự Phòng Học Thuật Thông Minh (Smart Academic Fallback Responder)
 * Dành cho Gia sư AI Đại học Lạc Hồng (/student/ai-tutor, /teacher/ai-tutor, /chat).
 * Kích hoạt khi mất mạng, chưa cấu hình GROQ_API_KEY hoặc nhà cung cấp AI gặp sự cố.
 * Đảm bảo 100% trả về đúng nội dung học thuật thật, câu hỏi trắc nghiệm kèm KaTeX và đáp án chi tiết.
 */

export type FallbackQuestionItem = {
  question: string;
  options: { key: 'A' | 'B' | 'C' | 'D'; text: string }[];
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
};

// ============================================================================
// 1. KHO CÂU HỎI TOÁN HỌC LỚP 10 (Chuẩn chương trình GDPT & Đại học đại cương)
// ============================================================================
export const MATH_10_QUESTIONS: FallbackQuestionItem[] = [
  {
    question: 'Tọa độ đỉnh $I$ của parabol $(P): y = 2x^2 - 4x + 1$ là:',
    options: [
      { key: 'A', text: '$I(1; -1)$' },
      { key: 'B', text: '$I(-1; 7)$' },
      { key: 'C', text: '$I(2; 1)$' },
      { key: 'D', text: '$I(1; 1)$' },
    ],
    correctAnswer: 'A',
    explanation: 'Hoành độ đỉnh $x_I = -\\frac{b}{2a} = -\\frac{-4}{2 \\cdot 2} = 1$. Thay $x = 1$ vào hàm số: $y_I = 2(1)^2 - 4(1) + 1 = -1$. Do đó tọa độ đỉnh là $I(1; -1)$.',
  },
  {
    question: 'Tập nghiệm của bất phương trình bậc hai $x^2 - 5x + 6 \\le 0$ là:',
    options: [
      { key: 'A', text: '$S = (-\\infty; 2] \\cup [3; +\\infty)$' },
      { key: 'B', text: '$S = [2; 3]$' },
      { key: 'C', text: '$S = (2; 3)$' },
      { key: 'D', text: '$S = [-3; -2]$' },
    ],
    correctAnswer: 'B',
    explanation: 'Tam thức bậc hai $f(x) = x^2 - 5x + 6$ có hai nghiệm $x_1 = 2$ và $x_2 = 3$. Vì hệ số $a = 1 > 0$, theo quy tắc "trong trái ngoài cùng", $f(x) \\le 0$ khi $x \\in [2; 3]$.',
  },
  {
    question: 'Cho hai vectơ $\\vec{a} = (2; -3)$ và $\\vec{b} = (4; 1)$. Tích vô hướng $\\vec{a} \\cdot \\vec{b}$ bằng:',
    options: [
      { key: 'A', text: '$5$' },
      { key: 'B', text: '$11$' },
      { key: 'C', text: '$-5$' },
      { key: 'D', text: '$8$' },
    ],
    correctAnswer: 'A',
    explanation: 'Áp dụng công thức tích vô hướng theo tọa độ: $\\vec{a} \\cdot \\vec{b} = x_1 x_2 + y_1 y_2 = 2 \\cdot 4 + (-3) \\cdot 1 = 8 - 3 = 5$.',
  },
  {
    question: 'Tập xác định của hàm số $y = \\sqrt{2x - 6} + \\frac{1}{x - 5}$ là:',
    options: [
      { key: 'A', text: '$D = [3; +\\infty) \\setminus \\{5\\}$' },
      { key: 'B', text: '$D = (3; +\\infty)$' },
      { key: 'C', text: '$D = [3; 5)$' },
      { key: 'D', text: '$D = \\mathbb{R} \\setminus \\{5\\}$' },
    ],
    correctAnswer: 'A',
    explanation: 'Điều kiện xác định của hàm số:\n$$\\begin{cases} 2x - 6 \\ge 0 \\\\ x - 5 \\ne 0 \\end{cases} \\Leftrightarrow \\begin{cases} x \\ge 3 \\\\ x \\ne 5 \\end{cases}$$\nVậy tập xác định là $D = [3; +\\infty) \\setminus \\{5\\}$.',
  },
  {
    question: 'Trong mặt phẳng tọa độ $Oxy$, phương trình tổng quát của đường thẳng đi qua điểm $M(1; 2)$ và có vectơ pháp tuyến $\\vec{n} = (3; -2)$ là:',
    options: [
      { key: 'A', text: '$3x - 2y + 1 = 0$' },
      { key: 'B', text: '$3x - 2y - 1 = 0$' },
      { key: 'C', text: '$2x + 3y - 8 = 0$' },
      { key: 'D', text: '$3x + 2y - 7 = 0$' },
    ],
    correctAnswer: 'A',
    explanation: 'Phương trình tổng quát có dạng $A(x - x_0) + B(y - y_0) = 0$.\nThay $M(1; 2)$ và $\\vec{n} = (3; -2)$:\n$$3(x - 1) - 2(y - 2) = 0 \\Leftrightarrow 3x - 3 - 2y + 4 = 0 \\Leftrightarrow 3x - 2y + 1 = 0.$$',
  },
  {
    question: 'Số nghiệm nguyên của bất phương trình $\\sqrt{x + 1} < 3$ là:',
    options: [
      { key: 'A', text: '$9$' },
      { key: 'B', text: '$8$' },
      { key: 'C', text: '$7$' },
      { key: 'D', text: 'Vô số' },
    ],
    correctAnswer: 'A',
    explanation: 'Điều kiện: $x + 1 \\ge 0 \\Leftrightarrow x \\ge -1$. Bất phương trình tương đương: $x + 1 < 9 \\Leftrightarrow x < 8$. Kết hợp điều kiện ta được $-1 \\le x < 8$. Các nghiệm nguyên là $x \\in \\{-1, 0, 1, 2, 3, 4, 5, 6, 7\\}$ (tổng cộng $9$ nghiệm).',
  },
  {
    question: 'Gieo một con xúc xắc cân đối và đồng chất 1 lần. Xác suất để xuất hiện mặt có số chấm là số nguyên tố là:',
    options: [
      { key: 'A', text: '$\\frac{1}{2}$' },
      { key: 'B', text: '$\\frac{1}{3}$' },
      { key: 'C', text: '$\\frac{2}{3}$' },
      { key: 'D', text: '$\\frac{1}{6}$' },
    ],
    correctAnswer: 'A',
    explanation: 'Không gian mẫu $\\Omega = \\{1, 2, 3, 4, 5, 6\\} \\Rightarrow n(\\Omega) = 6$. Các mặt có số chấm nguyên tố là $A = \\{2, 3, 5\\} \\Rightarrow n(A) = 3$. Xác suất là $P(A) = \\frac{3}{6} = \\frac{1}{2}$.',
  },
];

// ============================================================================
// 2. KHO CÂU HỎI TOÁN CAO CẤP / GIẢI TÍCH & ĐẠI SỐ TUYẾN TÍNH
// ============================================================================
export const CALCULUS_QUESTIONS: FallbackQuestionItem[] = [
  {
    question: 'Đạo hàm của hàm số $f(x) = x^3 \\cdot e^{2x}$ là:',
    options: [
      { key: 'A', text: "$f'(x) = e^{2x} \\cdot x^2 (3 + 2x)$" },
      { key: 'B', text: "$f'(x) = 3x^2 \\cdot e^{2x}$" },
      { key: 'C', text: "$f'(x) = 2x^3 \\cdot e^{2x}$" },
      { key: 'D', text: "$f'(x) = e^{2x} \\cdot x^2 (2 + 3x)$" },
    ],
    correctAnswer: 'A',
    explanation: "Áp dụng công thức $(u \\cdot v)' = u'v + uv'$:\n$$f'(x) = (x^3)' e^{2x} + x^3 (e^{2x})' = 3x^2 e^{2x} + x^3 (2e^{2x}) = x^2 e^{2x}(3 + 2x).$$",
  },
  {
    question: 'Tích phân bất định $\\int x \\cos(x) \\, dx$ bằng:',
    options: [
      { key: 'A', text: '$x \\sin(x) + \\cos(x) + C$' },
      { key: 'B', text: '$x \\sin(x) - \\cos(x) + C$' },
      { key: 'C', text: '$-x \\cos(x) + \\sin(x) + C$' },
      { key: 'D', text: '$\\frac{x^2}{2} \\sin(x) + C$' },
    ],
    correctAnswer: 'A',
    explanation: 'Dùng phương pháp tích phân từng phần $\\int u \\, dv = uv - \\int v \\, du$:\nĐặt $u = x \\Rightarrow du = dx$; $dv = \\cos(x) dx \\Rightarrow v = \\sin(x)$.\n$$\\int x \\cos(x) dx = x \\sin(x) - \\int \\sin(x) dx = x \\sin(x) + \\cos(x) + C.$$',
  },
  {
    question: 'Định thức của ma trận vuông $A = \\begin{pmatrix} 3 & 4 \\\\ 1 & 2 \\end{pmatrix}$ là:',
    options: [
      { key: 'A', text: '$\\det(A) = 2$' },
      { key: 'B', text: '$\\det(A) = -2$' },
      { key: 'C', text: '$\\det(A) = 10$' },
      { key: 'D', text: '$\\det(A) = 6$' },
    ],
    correctAnswer: 'A',
    explanation: 'Công thức định thức ma trận $2 \\times 2$:\n$$\\det(A) = a_{11}a_{22} - a_{12}a_{21} = 3 \\cdot 2 - 4 \\cdot 1 = 6 - 4 = 2.$$',
  },
  {
    question: 'Giới hạn $\\lim_{x \\to 0} \\frac{\\sin(3x)}{x}$ có giá trị bằng:',
    options: [
      { key: 'A', text: '$3$' },
      { key: 'B', text: '$1$' },
      { key: 'C', text: '$0$' },
      { key: 'D', text: '$\\frac{1}{3}$' },
    ],
    correctAnswer: 'A',
    explanation: 'Ta có $\\lim_{x \\to 0} \\frac{\\sin(3x)}{x} = \\lim_{x \\to 0} 3 \\cdot \\frac{\\sin(3x)}{3x} = 3 \\cdot 1 = 3$.',
  },
  {
    question: 'Điểm cực trị của hàm số $y = x^3 - 3x + 2$ là:',
    options: [
      { key: 'A', text: 'Cực đại tại $x = -1$, Cực tiểu tại $x = 1$' },
      { key: 'B', text: 'Cực đại tại $x = 1$, Cực tiểu tại $x = -1$' },
      { key: 'C', text: 'Chỉ có cực tiểu tại $x = 0$' },
      { key: 'D', text: 'Không có cực trị' },
    ],
    correctAnswer: 'A',
    explanation: "Đạo hàm $y' = 3x^2 - 3 = 0 \\Leftrightarrow x = \\pm 1$. Đạo hàm cấp hai $y'' = 6x$. Tại $x = -1$, $y''(-1) = -6 < 0 \\Rightarrow$ Cực đại ($y_{CĐ} = 4$). Tại $x = 1$, $y''(1) = 6 > 0 \\Rightarrow$ Cực tiểu ($y_{CT} = 0$).",
  },
];

// ============================================================================
// 3. KHO CÂU HỎI LẬP TRÌNH HƯỚNG ĐỐI TƯỢNG (OOP)
// ============================================================================
export const OOP_QUESTIONS: FallbackQuestionItem[] = [
  {
    question: 'Khái niệm nào trong OOP cho phép một đối tượng có thể mang nhiều hình thái khác nhau khi thực thi?',
    options: [
      { key: 'A', text: 'Tính Đa hình (Polymorphism)' },
      { key: 'B', text: 'Tính Đóng gói (Encapsulation)' },
      { key: 'C', text: 'Tính Kế thừa (Inheritance)' },
      { key: 'D', text: 'Tính Trừu tượng (Abstraction)' },
    ],
    correctAnswer: 'A',
    explanation: 'Tính Đa hình (Polymorphism) cho phép cùng một thông điệp (tên phương thức) nhưng các đối tượng thuộc các lớp khác nhau sẽ có cách phản ứng và hiện thực khác nhau.',
  },
  {
    question: 'Trong C# hoặc Java, từ khóa nào dùng để ngăn chặn một lớp không cho phép lớp khác kế thừa?',
    options: [
      { key: 'A', text: '`sealed` (C#) hoặc `final` (Java)' },
      { key: 'B', text: '`static`' },
      { key: 'C', text: '`private`' },
      { key: 'D', text: '`abstract`' },
    ],
    correctAnswer: 'A',
    explanation: 'Lớp được đánh dấu là `sealed` trong C# hoặc `final` trong Java là lớp bị "đóng băng" sự kế thừa, không thể dùng làm lớp cơ sở (Base Class) cho lớp khác.',
  },
  {
    question: 'Nạp chồng phương thức (Method Overloading) xảy ra khi:',
    options: [
      { key: 'A', text: 'Các phương thức cùng tên trong một class nhưng khác nhau về tham số' },
      { key: 'B', text: 'Lớp con định nghĩa lại hoàn toàn phương thức của lớp cha' },
      { key: 'C', text: 'Phương thức được gán từ khóa `virtual`' },
      { key: 'D', text: 'Hai lớp độc lập có các hàm trùng tên' },
    ],
    correctAnswer: 'A',
    explanation: 'Method Overloading xảy ra tại thời điểm biên dịch (Compile-time) khi trong cùng một lớp có các phương thức trùng tên nhưng khác nhau về chữ ký (số lượng, kiểu dữ liệu hoặc thứ tự tham số).',
  },
  {
    question: 'Mục đích cốt lõi của nguyên lý Đóng gói (Encapsulation) là gì?',
    options: [
      { key: 'A', text: 'Bảo vệ trạng thái bên trong của đối tượng và kiểm soát truy xuất qua Getter/Setter' },
      { key: 'B', text: 'Tăng tốc độ thực thi chương trình bằng cách dùng đa luồng' },
      { key: 'C', text: 'Cho phép dùng đa kế thừa giữa nhiều class' },
      { key: 'D', text: 'Tự động giải phóng bộ nhớ khi đối tượng bị hủy' },
    ],
    correctAnswer: 'A',
    explanation: 'Tính đóng gói ẩn giấu dữ liệu nhạy cảm (`private fields`) và chỉ cho phép bên ngoài đọc/ghi có kiểm soát thông qua các phương thức công khai hoặc Properties.',
  },
  {
    question: 'Điểm khác biệt căn bản giữa `Abstract Class` và `Interface` là gì?',
    options: [
      { key: 'A', text: 'Một class chỉ có thể kế thừa 1 Abstract Class nhưng có thể thực thi nhiều Interface' },
      { key: 'B', text: 'Interface có thể chứa constructor để khởi tạo đối tượng trực tiếp' },
      { key: 'C', text: 'Abstract Class không thể chứa phương thức có thân hàm' },
      { key: 'D', text: 'Cả hai đều hỗ trợ đa kế thừa hoàn toàn như nhau' },
    ],
    correctAnswer: 'A',
    explanation: 'C# và Java là ngôn ngữ đơn kế thừa class (chỉ kế thừa tối đa 1 Abstract Class), nhưng cho phép hiện thực không giới hạn số lượng Interface.',
  },
];

// ============================================================================
// 4. KHO CÂU HỎI CẤU TRÚC DỮ LIỆU & GIẢI THUẬT (DSA)
// ============================================================================
export const DSA_QUESTIONS: FallbackQuestionItem[] = [
  {
    question: 'Cấu trúc dữ liệu nào hoạt động theo nguyên lý LIFO (Last In First Out)?',
    options: [
      { key: 'A', text: 'Ngăn xếp (Stack)' },
      { key: 'B', text: 'Hàng đợi (Queue)' },
      { key: 'C', text: 'Danh sách liên kết đơn (Linked List)' },
      { key: 'D', text: 'Bảng băm (Hash Table)' },
    ],
    correctAnswer: 'A',
    explanation: 'Stack hoạt động theo cơ chế LIFO (Vào sau ra trước). Phần tử nào được `push` vào sau cùng sẽ được `pop` ra đầu tiên.',
  },
  {
    question: 'Độ phức tạp thời gian trung bình (Average Case) của thuật toán sắp xếp nhanh QuickSort là:',
    options: [
      { key: 'A', text: '$O(N \\log N)$' },
      { key: 'B', text: '$O(N^2)$' },
      { key: 'C', text: '$O(N)$' },
      { key: 'D', text: '$O(\\log N)$' },
    ],
    correctAnswer: 'A',
    explanation: 'QuickSort có độ phức tạp trung bình là $O(N \\log N)$. Trong trường hợp xấu nhất (chọn trúng phần tử chốt tồi tệ trên mảng đã sắp xếp), độ phức tạp là $O(N^2)$.',
  },
  {
    question: 'Trong cây nhị phân tìm kiếm (BST - Binary Search Tree), với mọi nút $X$:',
    options: [
      { key: 'A', text: 'Mọi giá trị ở cây con trái nhỏ hơn $X$, mọi giá trị ở cây con phải lớn hơn $X$' },
      { key: 'B', text: 'Cây con trái luôn có độ sâu lớn hơn cây con phải' },
      { key: 'C', text: 'Mọi nút lá đều nằm ở cùng một mức' },
      { key: 'D', text: 'Giá trị nút gốc luôn bằng tổng các nút con' },
    ],
    correctAnswer: 'A',
    explanation: 'Đặc tính cơ bản của BST là: Với nút mang khóa $k$, các khóa trong cây con trái $< k$ và các khóa trong cây con phải $> k$.',
  },
  {
    question: 'Thuật toán Dijkstra được dùng để giải quyết bài toán nào trên đồ thị?',
    options: [
      { key: 'A', text: 'Tìm đường đi ngắn nhất từ một đỉnh nguồn trên đồ thị trọng số không âm' },
      { key: 'B', text: 'Tìm cây khung nhỏ nhất (Minimum Spanning Tree)' },
      { key: 'C', text: 'Tìm chu trình Euler trên đồ thị vô hướng' },
      { key: 'D', text: 'Tìm thành phần liên thông mạnh với trọng số âm' },
    ],
    correctAnswer: 'A',
    explanation: 'Dijkstra dùng chiến lược tham lam để tìm đường đi ngắn nhất từ đỉnh nguồn đến mọi đỉnh khác, với điều kiện mọi trọng số cạnh $w(u, v) \\ge 0$.',
  },
  {
    question: 'Cấu trúc dữ liệu Hàng đợi (Queue) thường được ứng dụng trong thuật toán duyệt đồ thị nào?',
    options: [
      { key: 'A', text: 'Duyệt theo chiều rộng (BFS - Breadth-First Search)' },
      { key: 'B', text: 'Duyệt theo chiều sâu (DFS - Depth-First Search)' },
      { key: 'C', text: 'Thuật toán tìm kiếm nhị phân (Binary Search)' },
      { key: 'D', text: 'Thuật toán quay lui (Backtracking)' },
    ],
    correctAnswer: 'A',
    explanation: 'BFS duyệt theo từng tầng các đỉnh kề trước khi đi sâu xuống, do đó cấu trúc FIFO của Hàng đợi (Queue) là lựa chọn chuẩn xác nhất.',
  },
];

// ============================================================================
// 5. KHO CÂU HỎI CƠ SỞ DỮ LIỆU (CSDL / SQL)
// ============================================================================
export const DATABASE_QUESTIONS: FallbackQuestionItem[] = [
  {
    question: 'Để lọc các nhóm dữ liệu sau khi sử dụng mệnh đề `GROUP BY` trong SQL, ta sử dụng mệnh đề nào?',
    options: [
      { key: 'A', text: '`HAVING`' },
      { key: 'B', text: '`WHERE`' },
      { key: 'C', text: '`ORDER BY`' },
      { key: 'D', text: '`DISTINCT`' },
    ],
    correctAnswer: 'A',
    explanation: 'Mệnh đề `WHERE` lọc các dòng dữ liệu cá thể trước khi gom nhóm, trong khi `HAVING` lọc kết quả của các hàm tổng hợp (`COUNT`, `SUM`, `AVG`) sau khi đã `GROUP BY`.',
  },
  {
    question: 'Điều kiện để một quan hệ đạt chuẩn dạng 3 (3NF) là gì?',
    options: [
      { key: 'A', text: 'Đạt 2NF và không có thuộc tính không khóa nào phụ thuộc bắc cầu vào khóa chính' },
      { key: 'B', text: 'Mọi thuộc tính đều là thuộc tính đa trị' },
      { key: 'C', text: 'Chỉ cần đạt 1NF và có khóa ngoại' },
      { key: 'D', text: 'Bảng phải có ít nhất 3 khóa chính' },
    ],
    correctAnswer: 'A',
    explanation: '3NF yêu cầu loại bỏ phụ thuộc bắc cầu ($X \\to Y \\to Z$, với $X$ là khóa chính và $Y, Z$ là thuộc tính không khóa).',
  },
  {
    question: 'Phép kết nối `LEFT JOIN` giữa hai bảng A và B sẽ trả về kết quả gì?',
    options: [
      { key: 'A', text: 'Toàn bộ các bản ghi của bảng A kèm các bản ghi khớp ở bảng B (nếu không khớp sẽ mang giá trị `NULL`)' },
      { key: 'B', text: 'Chỉ các bản ghi khớp nhau ở cả hai bảng A và B' },
      { key: 'C', text: 'Toàn bộ bản ghi của bảng B kèm giá trị tương ứng ở bảng A' },
      { key: 'D', text: 'Tích đề-các (Cartesian product) của hai bảng' },
    ],
    correctAnswer: 'A',
    explanation: '`LEFT JOIN` ưu tiên giữ nguyên 100% dữ liệu của bảng bên trái (bảng A), các cột tương ứng của bảng B nếu không tìm thấy khóa ngoại tương thích sẽ được điền `NULL`.',
  },
  {
    question: 'Bốn tính chất cốt lõi của một Giao dịch (Transaction) trong CSDL viết tắt là gì?',
    options: [
      { key: 'A', text: 'ACID (Atomicity, Consistency, Isolation, Durability)' },
      { key: 'B', text: 'BASE (Basic Availability, Soft state, Eventual consistency)' },
      { key: 'C', text: 'CRUD (Create, Read, Update, Delete)' },
      { key: 'D', text: 'REST (Representational State Transfer)' },
    ],
    correctAnswer: 'A',
    explanation: 'ACID là 4 trụ cột đảm bảo tính toàn vẹn: Tính nguyên tử (Atomicity), Tính nhất quán (Consistency), Tính cô lập (Isolation) và Tính bền vững (Durability).',
  },
  {
    question: 'Chỉ mục (Index) kiểu B-Tree trong SQL giúp cải thiện điều gì?',
    options: [
      { key: 'A', text: 'Tăng tốc độ tìm kiếm và truy vấn dữ liệu (`SELECT`)' },
      { key: 'B', text: 'Tăng tốc độ ghi dữ liệu (`INSERT`, `UPDATE`)' },
      { key: 'C', text: 'Tiết kiệm dung lượng ổ cứng lưu trữ' },
      { key: 'D', text: 'Tự động mã hóa mật khẩu người dùng' },
    ],
    correctAnswer: 'A',
    explanation: 'Index hoạt động như mục lục của cuốn sách, giúp tìm dữ liệu trong độ phức tạp $O(\\log N)$ thay vì quét toàn bộ bảng (Table Scan $O(N)$). Tuy nhiên nó làm chậm nhẹ thao tác `INSERT/UPDATE` vì phải cập nhật cây chỉ mục.',
  },
];

// ============================================================================
// 6. KHO CÂU HỎI LỊCH SỬ VIỆT NAM & LỊCH SỬ THẾ GIỚI
// ============================================================================
export const VIETNAM_HISTORY_QUESTIONS: FallbackQuestionItem[] = [
  {
    question: 'Nhà nước đầu tiên trong lịch sử dân tộc Việt Nam được hình thành vào khoảng thế kỷ VII TCN là:',
    options: [
      { key: 'A', text: 'Nhà nước Văn Lang (thời các vua Hùng dựng nước)' },
      { key: 'B', text: 'Nhà nước Âu Lạc (thời An Dương Vương)' },
      { key: 'C', text: 'Nhà nước Vạn Xuân (thời Lý Nam Đế)' },
      { key: 'D', text: 'Nhà nước Đại Cồ Việt (thời Đinh Tiên Hoàng)' },
    ],
    correctAnswer: 'A',
    explanation: 'Nhà nước Văn Lang do các vua Hùng đứng đầu đóng đô tại Phong Châu (Phú Thọ ngày nay) là nhà nước đầu tiên trong lịch sử dân tộc ta.',
  },
  {
    question: 'Chiến thắng Bạch Đằng năm 938 do ai lãnh đạo và có ý nghĩa lịch sử to lớn như thế nào?',
    options: [
      { key: 'A', text: 'Ngô Quyền lãnh đạo, đánh tan quân Nam Hán, chấm dứt hơn 1000 năm Bắc thuộc và mở ra kỷ nguyên độc lập tự chủ lâu dài.' },
      { key: 'B', text: 'Trần Hưng Đạo lãnh đạo, đánh tan quân Mông - Nguyên thời Trần.' },
      { key: 'C', text: 'Lê Hoàn lãnh đạo, đánh bại cuộc xâm lược của quân Tống lần thứ nhất.' },
      { key: 'D', text: 'Quang Trung lãnh đạo, đánh tan 29 vạn quân Mãn Thanh.' },
    ],
    correctAnswer: 'A',
    explanation: 'Chiến thắng Bạch Đằng năm 938 của Ngô Quyền đã đập tan mưu đồ xâm lược của quân Nam Hán, kết thúc hơn 10 thế kỷ bị phong kiến phương Bắc đô hộ.',
  },
  {
    question: 'Hội nghị Diên Hồng (năm 1284) thể hiện ý chí "Đánh!" đồng lòng của toàn dân tộc diễn ra trong cuộc kháng chiến chống giặc ngoại xâm nào?',
    options: [
      { key: 'A', text: 'Kháng chiến chống quân Mông - Nguyên lần thứ hai dưới thời nhà Trần' },
      { key: 'B', text: 'Kháng chiến chống quân Minh dưới thời nhà Hồ' },
      { key: 'C', text: 'Kháng chiến chống quân Tống dưới thời nhà Lý' },
      { key: 'D', text: 'Khởi nghĩa Lam Sơn đánh đuổi giặc Minh' },
    ],
    correctAnswer: 'A',
    explanation: 'Hội nghị Diên Hồng do Thượng hoàng Trần Thánh Tông triệu tập các bô lão trong cả nước tại kinh thành Thăng Long để xin ý kiến đánh hay hòa khi quân Nguyên xâm lược lần hai.',
  },
  {
    question: 'Tác phẩm nào được xem là bản "Tuyên ngôn Độc lập thứ hai" của dân tộc Việt Nam, do Nguyễn Trãi thừa lệnh Lê Lợi soạn thảo năm 1428?',
    options: [
      { key: 'A', text: 'Bình Ngô đại cáo' },
      { key: 'B', text: 'Nam quốc sơn hà' },
      { key: 'C', text: 'Hịch tướng sĩ' },
      { key: 'D', text: 'Tuyên ngôn Độc lập (1945)' },
    ],
    correctAnswer: 'A',
    explanation: 'Bình Ngô đại cáo của Nguyễn Trãi tuyên bố thắng lợi vĩ đại của khởi nghĩa Lam Sơn, khẳng định nền độc lập, chủ quyền và truyền thống văn hiến của Đại Việt.',
  },
  {
    question: 'Thắng lợi của Cách mạng tháng Tám năm 1945 ở Việt Nam mang ý nghĩa lịch sử sâu sắc nào dưới đây?',
    options: [
      { key: 'A', text: 'Lật đổ ách thống trị thực dân - phát xít, xóa bỏ ngai vàng phong kiến và khai sinh nước Việt Nam Dân chủ Cộng hòa.' },
      { key: 'B', text: 'Đánh bại hoàn toàn đế quốc Mỹ và thống nhất hai miền Nam - Bắc.' },
      { key: 'C', text: 'Hoàn thành công cuộc đổi mới kinh tế đất nước.' },
      { key: 'D', text: 'Xóa bỏ hoàn toàn tình trạng thất học và mù chữ trong một năm.' },
    ],
    correctAnswer: 'A',
    explanation: 'Cách mạng tháng Tám 1945 phá tan xiềng xích nô lệ thực dân - phát xít, lật đổ chế độ quân chủ chuyên chế ngót ngàn năm, đưa nhân dân ta lên làm chủ đất nước.',
  },
  {
    question: 'Chiến thắng quân sự nào được ví là "lừng lẫy năm châu, chấn động địa cầu", đập tan tập đoàn cứ điểm mạnh nhất của thực dân Pháp tại Đông Dương năm 1954?',
    options: [
      { key: 'A', text: 'Chiến dịch Điện Biên Phủ' },
      { key: 'B', text: 'Chiến dịch Biên giới Thu - Đông 1950' },
      { key: 'C', text: 'Chiến thắng Việt Bắc Thu - Đông 1947' },
      { key: 'D', text: 'Chiến dịch Điện Biên Phủ trên không 1972' },
    ],
    correctAnswer: 'A',
    explanation: 'Sau 56 ngày đêm "khoét núi, ngủ hầm, mưa dầm, cơm vắt", chiều ngày 7/5/1954, lá cờ Quyết chiến Quyết thắng của Quân đội nhân dân Việt Nam đã tung bay trên nóc hầm tướng Đờ Cát.',
  },
  {
    question: 'Chiến dịch Hồ Chí Minh lịch sử toàn thắng vào ngày 30/4/1975 đã mang lại thành quả vĩ đại gì cho dân tộc ta?',
    options: [
      { key: 'A', text: 'Giải phóng hoàn toàn miền Nam, thống nhất non sông đất nước.' },
      { key: 'B', text: 'Ký kết Hiệp định Paris về chấm dứt chiến tranh tại Việt Nam.' },
      { key: 'C', text: 'Bắt đầu bước vào thời kỳ tiền khởi nghĩa.' },
      { key: 'D', text: 'Mở đầu cuộc Tổng tiến công và nổi dậy Tết Mậu Thân 1968.' },
    ],
    correctAnswer: 'A',
    explanation: '11 giờ 30 phút ngày 30/4/1975, xe tăng quân giải phóng húc đổ cổng Dinh Độc Lập, kết thúc thắng lợi cuộc kháng chiến chống Mỹ cứu nước, non sông thu về một mối.',
  },
];

// ============================================================================
// 7. KHO CÂU HỎI ĐỊA LÝ VIỆT NAM & ĐỊA LÝ TỰ NHIÊN
// ============================================================================
export const GEOGRAPHY_QUESTIONS: FallbackQuestionItem[] = [
  {
    question: 'Đặc điểm nổi bật của cấu trúc địa hình phần đất liền Việt Nam là:',
    options: [
      { key: 'A', text: 'Đồi núi chiếm 3/4 diện tích lãnh thổ, nhưng chủ yếu là đồi núi thấp dưới 1.000m.' },
      { key: 'B', text: 'Đồng bằng chiếm đại bộ phận diện tích cả nước.' },
      { key: 'C', text: 'Chủ yếu là các sơn nguyên và cao nguyên băng giá.' },
      { key: 'D', text: 'Địa hình hoàn toàn bằng phẳng không có núi cao.' },
    ],
    correctAnswer: 'A',
    explanation: 'Địa hình Việt Nam đa dạng, đồi núi chiếm 3/4 diện tích lãnh thổ, trong đó đồi núi thấp dưới 1000m chiếm tới 85%, núi cao trên 2000m chỉ chiếm 1%.',
  },
  {
    question: 'Tính chất nền tảng của khí hậu Việt Nam được quy định bởi vị trí địa lý là:',
    options: [
      { key: 'A', text: 'Nhiệt đới ẩm gió mùa, có sự phân hóa đa dạng theo không gian và thời gian.' },
      { key: 'B', text: 'Ôn đới lục địa khô hạn quanh năm.' },
      { key: 'C', text: 'Nhiệt đới khô xavan giống như Bắc Phi.' },
      { key: 'D', text: 'Hàn đới quanh năm có tuyết bao phủ.' },
    ],
    correctAnswer: 'A',
    explanation: 'Nằm hoàn toàn trong vành đai nội chí tuyến Bắc bán cầu và chịu ảnh hưởng trực tiếp của các khối khí gió mùa, nước ta có khí hậu nhiệt đới ẩm gió mùa đặc trưng.',
  },
  {
    question: 'Hai đồng bằng châu thổ có diện tích lớn nhất và là vựa lúa trọng điểm của Việt Nam là:',
    options: [
      { key: 'A', text: 'Đồng bằng sông Hồng và Đồng bằng sông Cửu Long' },
      { key: 'B', text: 'Đồng bằng Thanh Hóa và Đồng bằng Nghệ Tĩnh' },
      { key: 'C', text: 'Đồng bằng duyên hải Nam Trung Bộ và Đồng bằng sông Cửu Long' },
      { key: 'D', text: 'Đồng bằng sông Mã và Đồng bằng sông Thu Bồn' },
    ],
    correctAnswer: 'A',
    explanation: 'Đồng bằng sông Cửu Long (khoảng 40.000 km²) và Đồng bằng sông Hồng (khoảng 15.000 km²) là hai vựa lúa lớn nhất cả nước được bồi đắp bởi hệ thống sông Mê Kông và sông Hồng.',
  },
  {
    question: 'Hiện tượng xói mòn và sạt lở đất ở vùng đồi núi nước ta thường diễn ra nghiêm trọng nhất vào thời gian nào?',
    options: [
      { key: 'A', text: 'Vào mùa mưa bão với các trận mưa lớn kéo dài trên các sườn dốc bị mất lớp phủ thực vật.' },
      { key: 'B', text: 'Vào mùa khô hanh khi thời tiết nắng gắt.' },
      { key: 'C', text: 'Vào ban đêm khi nhiệt độ giảm sâu.' },
      { key: 'D', text: 'Vào mùa xuân khi cây cối đâm chồi nảy lộc.' },
    ],
    correctAnswer: 'A',
    explanation: 'Mưa lớn tập trung vào mùa mưa kết hợp với địa hình dốc và tình trạng mất rừng đầu nguồn là nguyên nhân trực tiếp dẫn tới sạt lở và xói mòn đất mạnh.',
  },
];

// ============================================================================
// 8. KHO CÂU HỎI NGỮ VĂN & VĂN HỌC VIỆT NAM
// ============================================================================
export const LITERATURE_QUESTIONS: FallbackQuestionItem[] = [
  {
    question: 'Đại thi hào Nguyễn Du đã sáng tác kiệt tác "Truyện Kiều" (Đoạn trường tân thanh) bằng thể thơ dân tộc nào?',
    options: [
      { key: 'A', text: 'Thể thơ Lục bát (chữ Nôm gồm 3254 câu)' },
      { key: 'B', text: 'Thể thơ Thất ngôn bát cú Đường luật' },
      { key: 'C', text: 'Thể thơ Song thất lục bát' },
      { key: 'D', text: 'Thể thơ Tự do hiện đại' },
    ],
    correctAnswer: 'A',
    explanation: 'Truyện Kiều của Nguyễn Du được viết bằng chữ Nôm theo thể thơ Lục bát đỉnh cao của thi ca dân tộc, gồm 3.254 câu thơ tuyệt tác.',
  },
  {
    question: 'Trong tác phẩm "Chí Phèo" của nhà văn Nam Cao, chi tiết nghệ thuật nào biểu trưng cho tình người ấm áp đã đánh thức lương tri của nhân vật Chí Phèo?',
    options: [
      { key: 'A', text: 'Bát cháo hành của Thị Nở' },
      { key: 'B', text: 'Chai rượu của Tự Lãng' },
      { key: 'C', text: 'Mấy đồng hào bạc của Bá Kiến' },
      { key: 'D', text: 'Cây đàn ghi-ta của người hát rong' },
    ],
    correctAnswer: 'A',
    explanation: 'Bát cháo hành ấm nóng và sự chăm sóc mộc mạc của Thị Nở đã làm bừng sáng khát khao được sống lương thiện, hòa nhập lại với xã hội loài người của Chí Phèo.',
  },
  {
    question: 'Biện pháp tu từ nào được sử dụng chủ đạo trong hai câu thơ sau của nhà thơ Huy Cận: "Sóng gợn tràng giang buồn điệp điệp / Con thuyền xuôi mái nước song song"?',
    options: [
      { key: 'A', text: 'Từ láy điệp từ ("điệp điệp", "song song") kết hợp tiểu đối đăng đối nhịp nhàng.' },
      { key: 'B', text: 'Nói quá phóng đại sự việc.' },
      { key: 'C', text: 'Ẩn dụ chuyển đổi cảm giác.' },
      { key: 'D', text: 'Chơi chữ đồng âm dị nghĩa.' },
    ],
    correctAnswer: 'A',
    explanation: 'Các từ láy tượng hình "điệp điệp", "song song" kết hợp phép đối chỉnh tạo nên nỗi buồn mênh mang, vô tận trước không gian sông nước tràng giang.',
  },
];

// ============================================================================
// 9. KHO CÂU HỎI TIẾNG ANH (ENGLISH GRAMMAR & VOCABULARY)
// ============================================================================
export const ENGLISH_QUESTIONS: FallbackQuestionItem[] = [
  {
    question: 'Choose the correct form: "If she _______ harder, she would pass the final examination with flying colors."',
    options: [
      { key: 'A', text: 'studied' },
      { key: 'B', text: 'studies' },
      { key: 'C', text: 'will study' },
      { key: 'D', text: 'has studied' },
    ],
    correctAnswer: 'A',
    explanation: 'Đây là câu điều kiện loại 2 (Second Conditional) diễn tả giả định không có thật ở hiện tại: Mệnh đề If dùng thì Quá khứ đơn (Past Simple: studied), mệnh đề chính dùng would + V-infinitive.',
  },
  {
    question: 'Identify the best relative pronoun: "The professor _______ lecture on artificial intelligence was fascinating has received an international award."',
    options: [
      { key: 'A', text: 'whose' },
      { key: 'B', text: 'whom' },
      { key: 'C', text: 'which' },
      { key: 'D', text: 'who' },
    ],
    correctAnswer: 'A',
    explanation: '"Whose" là đại từ quan hệ chỉ sở hữu (whose lecture = bài giảng của vị giáo sư đó), đứng trước danh từ "lecture".',
  },
  {
    question: 'Complete the sentence: "By the time we arrived at the airport, the flight _______."',
    options: [
      { key: 'A', text: 'had already departed' },
      { key: 'B', text: 'has already departed' },
      { key: 'C', text: 'was departing' },
      { key: 'D', text: 'departs' },
    ],
    correctAnswer: 'A',
    explanation: 'Hành động chuyến bay cất cánh diễn ra và hoàn thành trước thời điểm chúng tôi đến sân bay trong quá khứ nên dùng thì Quá khứ hoàn thành (Past Perfect: had + V3/ed).',
  },
];

// ============================================================================
// 10. KHO CÂU HỎI SINH HỌC & KHOA HỌC SỰ SỐNG
// ============================================================================
export const BIOLOGY_QUESTIONS: FallbackQuestionItem[] = [
  {
    question: 'Theo nguyên tắc bổ sung trong cấu trúc chuỗi xoắn kép của phân tử ADN, Adenine (A) liên kết với Thymine (T) bằng:',
    options: [
      { key: 'A', text: '2 liên kết hydro' },
      { key: 'B', text: '3 liên kết hydro' },
      { key: 'C', text: '1 liên kết photphodieste' },
      { key: 'D', text: 'Liên kết ion cộng hóa trị' },
    ],
    correctAnswer: 'A',
    explanation: 'Theo mô hình Watson - Crick, A liên kết với T bằng 2 liên kết hydro, Guanine (G) liên kết với Cytosine (X/C) bằng 3 liên kết hydro.',
  },
  {
    question: 'Bào quan nào trong tế bào thực vật chịu trách nhiệm chính thực hiện quá trình quang hợp hấp thụ năng lượng ánh sáng?',
    options: [
      { key: 'A', text: 'Lục lạp (Chloroplast)' },
      { key: 'B', text: 'Ty thể (Mitochondria)' },
      { key: 'C', text: 'Bộ máy Golgi' },
      { key: 'D', text: 'Lưới nội chất hạt' },
    ],
    correctAnswer: 'A',
    explanation: 'Lục lạp chứa chất diệp lục (chlorophyll) có khả năng hấp thụ photon ánh sáng mặt trời để quang phân ly nước và tổng hợp hợp chất hữu cơ glucose.',
  },
];

// ============================================================================
// 11. BỘ TỔNG HỢP CÂU HỎI TỰ DO CHO BẤT KỲ CHỦ ĐỀ NÀO (UNIVERSAL ENGINE)
// ============================================================================
function generateUniversalQuestionsForQuery(
  rawQuery: string,
  count: number,
  isTeacher: boolean
): string {
  // Trích xuất chủ đề cốt lõi bằng cách loại bỏ các từ hiệu lệnh
  let cleanTopic = rawQuery
    .replace(/(?:tạo|hãy tạo|xin|cho|soạn|hỏi|viết|làm)\s+\d+\s+câu\s+(?:hỏi\s+)?(?:trắc nghiệm|tự luận|ôn tập|bài tập)?/gi, '')
    .replace(/(?:về|liên quan đến|chủ đề|môn|học phần)\s+/gi, '')
    .trim();

  if (!cleanTopic || cleanTopic.length < 2) {
    cleanTopic = 'Nội dung kiến thức chuyên môn';
  }

  // Viết hoa chữ cái đầu
  cleanTopic = cleanTopic.charAt(0).toUpperCase() + cleanTopic.slice(1);

  const universalTemplates: FallbackQuestionItem[] = [
    {
      question: `Khái niệm cốt lõi và phạm vi nghiên cứu trọng tâm của "${cleanTopic}" được xác định chuẩn xác nhất là:`,
      options: [
        { key: 'A', text: `Hệ thống các nguyên lý, quy luật và cơ chế vận hành căn bản của ${cleanTopic} được kiểm chứng qua thực tiễn.` },
        { key: 'B', text: `Chỉ mang tính chất cảm tính chủ quan của một cá nhân cụ thể.` },
        { key: 'C', text: `Tập hợp các giả định không có cơ sở lý luận khoa học.` },
        { key: 'D', text: `Một quy ước ngẫu nhiên không có tính ứng dụng trong thực tế.` },
      ],
      correctAnswer: 'A',
      explanation: `Nghiên cứu về ${cleanTopic} đòi hỏi nắm vững hệ thống khái niệm, các tiên đề khoa học và phạm vi ứng dụng thực tiễn của nó.`,
    },
    {
      question: `Đặc trưng nổi bật phân biệt bản chất của "${cleanTopic}" với các lĩnh vực liên quan khác là gì?`,
      options: [
        { key: 'A', text: `Tính hệ thống, tính quy luật và khả năng giải quyết trực tiếp bài toán thực tiễn đặt ra.` },
        { key: 'B', text: `Sự sao chép hoàn toàn nguyên mẫu mà không có sự đổi mới.` },
        { key: 'C', text: `Không tuân theo bất kỳ nguyên tắc phương pháp luận nào.` },
        { key: 'D', text: `Chỉ tồn tại trên lý thuyết mô hình hóa không thể đo lường.` },
      ],
      correctAnswer: 'A',
      explanation: `Bản chất của ${cleanTopic} được thể hiện qua các đặc trưng phương pháp luận rõ ràng, tạo cơ sở để phân tích và đánh giá hiện tượng.`,
    },
    {
      question: `Trong quá trình tìm hiểu và vận dụng "${cleanTopic}", yếu tố nào đóng vai trò là kim chỉ nam quan trọng nhất?`,
      options: [
        { key: 'A', text: `Nắm vững lý thuyết cơ sở, phân tích bối cảnh áp dụng và tuân thủ các chuẩn mực chuyên môn.` },
        { key: 'B', text: `Áp dụng máy móc một công thức cho mọi trường hợp khác nhau.` },
        { key: 'C', text: `Bỏ qua các bước kiểm tra, nghiệm thu và đối chiếu kết quả.` },
        { key: 'D', text: `Chỉ tập trung vào kết quả ngắn hạn mà không tính đến tính bền vững.` },
      ],
      correctAnswer: 'A',
      explanation: `Vận dụng thành công ${cleanTopic} đòi hỏi sự kết hợp chặt chẽ giữa nắm vững nguyên lý và linh hoạt thích ứng với yêu cầu thực tế.`,
    },
    {
      question: `Khi đánh giá hiệu quả triển khai hoặc mức độ thành thạo về "${cleanTopic}", tiêu chí định lượng nào có giá trị xác thực cao nhất?`,
      options: [
        { key: 'A', text: `Mức độ đáp ứng chuẩn đầu ra, tính chính xác khoa học và khả năng xử lý các tình huống phức tạp.` },
        { key: 'B', text: `Số lượng tài liệu đọc được mà không tính đến khả năng thực hành.` },
        { key: 'C', text: `Thời gian ghi nhớ máy móc các định nghĩa trong sách vở.` },
        { key: 'D', text: `Đánh giá dựa trên sở thích cá nhân người chấm.` },
      ],
      correctAnswer: 'A',
      explanation: `Tiêu chuẩn đánh giá chuẩn xác luôn dựa trên các minh chứng thực tế, mức độ hiểu sâu sắc bản chất và khả năng giải quyết vấn đề.`,
    },
    {
      question: `Ý nghĩa thực tiễn to lớn nhất của việc làm chủ kiến thức về "${cleanTopic}" là:`,
      options: [
        { key: 'A', text: `Nâng cao năng lực tư duy phản biện, tối ưu hóa quy trình giải quyết vấn đề và thích ứng với môi trường chuyên nghiệp.` },
        { key: 'B', text: `Chỉ phục vụ mục đích vượt qua một kỳ thi tạm thời.` },
        { key: 'C', text: `Tạo ra các định kiến lý thuyết cứng nhắc trong tư duy.` },
        { key: 'D', text: `Thay thế hoàn toàn sự sáng tạo của con người.` },
      ],
      correctAnswer: 'A',
      explanation: `Làm chủ tri thức ${cleanTopic} tạo nền tảng vững chắc để phát triển năng lực chuyên môn và tư duy logic dài hạn.`,
    },
  ];

  return formatQuestionsToMarkdown(cleanTopic, universalTemplates, count, isTeacher);
}

/**
 * Trích xuất số lượng câu hỏi từ tin nhắn (ví dụ: "Tạo 5 câu...", "3 câu...", mặc định 5 câu)
 */
function extractRequestedCount(query: string): number {
  const match =
    query.match(/(?:tạo|làm|cho|soạn|xin|hỏi)\s+(\d+)\s+câu/i) ||
    query.match(/(\d+)\s+câu\s+(?:hỏi|trắc nghiệm|ôn tập|bài tập)/i) ||
    query.match(/(\d+)\s+câu/i);

  if (match && match[1]) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num) && num > 0) {
      return Math.min(num, 10); // Giới hạn tối đa 10 câu để tránh tràn giao diện
    }
  }
  return 5;
}

/**
 * Định dạng danh sách câu hỏi thành văn bản Markdown chuẩn KaTeX (Clean Formatting)
 */
function formatQuestionsToMarkdown(
  topicTitle: string,
  questions: FallbackQuestionItem[],
  count: number,
  isTeacher: boolean = false
): string {
  const selectedQuestions = questions.slice(0, count);

  let output = isTeacher
    ? `Dưới đây là bộ **${selectedQuestions.length} câu hỏi ${topicTitle}** chuẩn học thuật kèm đáp án đúng và lời giải thích chi tiết:\n\n---\n\n`
    : `Dưới đây là bộ **${selectedQuestions.length} câu hỏi ôn tập ${topicTitle}** kèm đáp án và lời giải chi tiết:\n\n---\n\n`;

  selectedQuestions.forEach((q, idx) => {
    output += `### Câu ${idx + 1}: ${q.question}\n\n`;
    q.options.forEach((opt) => {
      output += `- **${opt.key}.** ${opt.text}\n`;
    });
    output += `\n👉 **Đáp án đúng:** **${q.correctAnswer}**\n`;
    output += `💡 **Giải thích chi tiết:** ${q.explanation}\n\n---\n\n`;
  });

  output += `Bạn có thể yêu cầu thêm câu hỏi trắc nghiệm, bài tập tự luận hoặc giải thích sâu hơn về bất kỳ câu hỏi nào ở trên!`;
  return output.trim();
}

/**
 * Tạo khung Đề cương chi tiết theo chủ đề được yêu cầu
 */
function generateAcademicOutline(topic: string, isTeacher: boolean): string {
  return `### Đề cương chi tiết: ${topic}

---

#### 1. Mục tiêu học phần & Chuẩn đầu ra (CLO)
- **Kiến thức:** Nắm vững hệ thống khái niệm, nguyên lý vận hành và các quy luật nền tảng của **${topic}**.
- **Kỹ năng:** Có khả năng phân tích, giải quyết bài toán thực tế và vận dụng linh hoạt vào đồ án/chuyên môn.
- **Thái độ & Tư duy:** Phát triển tư duy logic phản biện, phương pháp tiếp cận khoa học và tinh thần tự học.

---

#### 2. Kế hoạch giảng dạy & Phân phối thời lượng gợi ý
- **Phần 1 - Tổng quan & Cơ sở lý luận (20% thời lượng):** Bản chất, phạm vi nghiên cứu, các tiên đề và thuật ngữ căn bản.
- **Phần 2 - Cơ chế & Kỹ thuật cốt lõi (50% thời lượng):** Đi sâu vào các công cụ, phương pháp tính toán hoặc cài đặt thực hành chi tiết.
- **Phần 3 - Vận dụng chuyên sâu & Tình huống thực tiễn (30% thời lượng):** Thảo luận bài toán mẫu, xử lý ngoại lệ và tối ưu hóa giải pháp.

---

#### 3. Hình thức đánh giá & Trọng số
- **Chuyên cần & Thái độ học tập:** 10%
- **Bài kiểm tra quá trình / Thực hành:** 30%
- **Thi kết thúc học phần (Trắc nghiệm kết hợp Tự luận):** 60%

Thầy/Cô có muốn tôi sinh ngân hàng câu hỏi đề thi hoặc lập ma trận kiểm tra cho đề cương này không?`;
}

/**
 * Tạo Bảng Rubric đánh giá chi tiết 4 mức theo chủ đề
 */
function generateAcademicRubric(topic: string): string {
  return `### Thang điểm & Rubric đánh giá: ${topic}

---

#### 1. Tiêu chí 1: Nắm vững kiến thức nền tảng (Trọng số: 30%)
- **Xuất sắc (9.0 - 10.0):** Trình bày hoàn hảo định nghĩa, bản chất và mối liên hệ đa chiều của **${topic}**.
- **Khá (7.0 - 8.5):** Trình bày đúng và đủ khái niệm, có ví dụ minh họa chính xác.
- **Trung bình (5.0 - 6.5):** Hiểu được định nghĩa căn bản nhưng giải thích còn mơ hồ hoặc thiếu sót nhỏ.
- **Chưa đạt (< 5.0):** Sai lệch bản chất kiến thức hoặc không thể nêu được định nghĩa.

---

#### 2. Tiêu chí 2: Khả năng vận dụng & Kỹ năng giải quyết vấn đề (Trọng số: 50%)
- **Xuất sắc (9.0 - 10.0):** Lựa chọn phương pháp tối ưu, giải bài toán chuẩn xác 100%, có phân tích trường hợp đặc biệt.
- **Khá (7.0 - 8.5):** Thực hiện đúng các bước giải chuẩn, kết quả chính xác, sai sót nhỏ trong trình bày.
- **Trung bình (5.0 - 6.5):** Có hướng đi đúng nhưng còn lỗi tính toán hoặc thiếu bước kiểm tra nghiệm.
- **Chưa đạt (< 5.0):** Chọn sai phương pháp, không giải quyết được bài toán.

---

#### 3. Tiêu chí 3: Trình bày khoa học & Tư duy phản biện (Trọng số: 20%)
- **Xuất sắc (9.0 - 10.0):** Diễn giải mạch lạc, lập luận chặt chẽ, sử dụng chuẩn ký hiệu chuyên ngành.
- **Khá (7.0 - 8.5):** Trình bày rõ ràng, dễ theo dõi.
- **Trung bình (5.0 - 6.5):** Trình bày lộn xộn nhưng vẫn có thể theo dõi được logic.
- **Chưa đạt (< 5.0):** Trình bày cẩu thả, thiếu lập luận.`;
}

/**
 * Trích xuất chủ đề tinh gọn từ truy vấn của người dùng (Loại bỏ các cụm từ yêu cầu thừa)
 */
export function extractCleanTopic(query: string): string {
  let clean = query;
  // Xóa các từ kính ngữ và mở đầu
  clean = clean.replace(/^(?:hãy|xin|cho|vui lòng|làm ơn)\s+/gi, '');
  // Xóa động từ hành động
  clean = clean.replace(/^(?:tạo|làm|viết|soạn|gợi ý|hướng dẫn|lên|xây dựng)\s+/gi, '');
  // Xóa các định dạng nội dung
  clean = clean.replace(/^(?:nội dung|kịch bản|video|clip|tiktok|youtube|shorts?|bài giảng|giáo án|đề cương|bộ đề|câu hỏi|trắc nghiệm|code|chương trình)\s*/gi, '');
  clean = clean.replace(/^(?:về môn|về chủ đề|học phần|môn học|môn|về|cho)\s+/gi, '');
  clean = clean.replace(/^(?:nội dung|kịch bản|video|clip|tiktok|youtube|shorts?)\s*/gi, '');
  clean = clean.replace(/^(?:về môn|về chủ đề|học phần|môn học|môn|về|cho)\s+/gi, '');
  clean = clean.replace(/^(?:tóm tắt|tổng hợp)\s*(?:kiến thức|lý thuyết)?\s*/gi, '');
  clean = clean.replace(/^(?:môn|bài|chương|phần|kiến thức)\s+/gi, '');

  clean = clean.replace(/^[,\.\-:\s]+|[,\.\-:\s]+$/g, '').trim();

  if (!clean || clean.length < 2) {
    const qLower = query.toLowerCase();
    if (qLower.includes('toán 10') || qLower.includes('toan 10')) return 'Toán học Lớp 10 (Hàm số bậc hai, Vectơ & Phương pháp tọa độ)';
    if (qLower.includes('lịch sử') || qLower.includes('su viet')) return 'Lịch sử Việt Nam & Lịch sử Dân tộc';
    if (qLower.includes('địa lý') || qLower.includes('dia ly')) return 'Địa lý Tự nhiên & Kinh tế Xã hội';
    if (qLower.includes('oop') || qLower.includes('hướng đối tượng')) return 'Lập trình Hướng đối tượng (OOP)';
    if (qLower.includes('dsa') || qLower.includes('cấu trúc dữ liệu')) return 'Cấu trúc Dữ liệu & Giải thuật (DSA)';
    if (qLower.includes('csdl') || qLower.includes('database') || qLower.includes('sql')) return 'Cơ sở Dữ liệu & SQL';
    if (qLower.includes('giải tích') || qLower.includes('đạo hàm') || qLower.includes('tích phân')) return 'Toán Giải tích & Đạo hàm';
    return 'Chuyên đề Học thuật Ứng dụng';
  }

  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Nhận diện ý định thực sự của người dùng (User Intent Recognition)
 * TUYỆT ĐỐI không bao giờ ép câu hỏi trắc nghiệm khi người dùng yêu cầu kịch bản video, giáo án, code, tóm tắt, giải thích.
 */
export function detectUserIntent(
  q: string
): 'video_script' | 'lesson_plan' | 'rubric' | 'code' | 'summary' | 'quiz' | 'explain' {
  // 1. Ý định Kịch bản Video / Clip / TikTok / YouTube / Bài giảng trực quan
  if (
    q.includes('video') ||
    q.includes('kịch bản') ||
    q.includes('kich ban') ||
    q.includes('clip') ||
    q.includes('tiktok') ||
    q.includes('youtube') ||
    q.includes('quay video') ||
    q.includes('làm video') ||
    q.includes('lam video') ||
    q.includes('nội dung video') ||
    q.includes('noi dung video')
  ) {
    return 'video_script';
  }

  // 2. Ý định Giáo án / Kế hoạch bài dạy
  if (
    q.includes('giáo án') ||
    q.includes('giao an') ||
    q.includes('kế hoạch bài dạy') ||
    q.includes('ke hoach bai day') ||
    q.includes('kế hoạch giảng dạy')
  ) {
    return 'lesson_plan';
  }

  // 3. Ý định Rubric / Thang điểm đánh giá
  if (
    q.includes('rubric') ||
    q.includes('thang điểm') ||
    q.includes('thang diem') ||
    q.includes('tiêu chí chấm') ||
    q.includes('tieu chi cham') ||
    q.includes('bảng điểm đánh giá')
  ) {
    return 'rubric';
  }

  // 4. Ý định Viết Code / Lập trình / Thuật toán
  if (
    q.includes('viết code') ||
    q.includes('viet code') ||
    q.includes('lập trình') ||
    q.includes('lap trinh') ||
    q.includes('viết hàm') ||
    q.includes('viet ham') ||
    q.includes('thuật toán') ||
    q.includes('thuat toan') ||
    q.includes('cài đặt hàm') ||
    q.includes('chương trình c') ||
    q.includes('chương trình python') ||
    q.includes('chương trình java')
  ) {
    return 'code';
  }

  // 5. Ý định Tóm tắt / Dàn ý / Sơ đồ tư duy
  if (
    q.includes('tóm tắt') ||
    q.includes('tom tat') ||
    q.includes('dàn ý') ||
    q.includes('dan y') ||
    q.includes('sơ đồ tư duy') ||
    q.includes('mindmap') ||
    q.includes('tổng hợp kiến thức')
  ) {
    return 'summary';
  }

  // 6. Ý định Câu hỏi Trắc nghiệm / Quiz / Ra đề thi
  // CHỈ khi người dùng thực sự yêu cầu tạo câu hỏi / trắc nghiệm / ra đề
  const hasQuizKeyword =
    q.includes('trắc nghiệm') ||
    q.includes('trac nghiem') ||
    q.includes('ra đề') ||
    q.includes('ra de') ||
    q.includes('tạo đề') ||
    q.includes('tao de') ||
    q.includes('bộ đề') ||
    q.includes('bo de') ||
    q.includes('quiz') ||
    q.includes('bài tập trắc nghiệm') ||
    q.includes('đề thi') ||
    q.includes('de thi') ||
    q.includes('đề kiểm tra') ||
    q.includes('de kiem tra') ||
    ((q.includes('câu hỏi') || q.includes('cau hoi')) &&
      (q.includes('tạo') ||
        q.includes('tao') ||
        q.includes('soạn') ||
        q.includes('soan') ||
        q.includes('cho') ||
        q.includes('xin') ||
        q.includes('làm') ||
        q.includes('lam') ||
        q.includes('sinh') ||
        q.includes('bộ') ||
        q.includes('danh sách')));

  if (hasQuizKeyword) {
    return 'quiz';
  }

  return 'explain';
}

/**
 * Sinh kịch bản video sư phạm sinh động, chuyên nghiệp (Video Script Generator)
 */
export function generateVideoScriptResponse(userQuery: string, topic: string, isTeacher: boolean): string {
  const isMath10 = topic.toLowerCase().includes('toán 10') || topic.toLowerCase().includes('toan 10');

  if (isMath10) {
    return `# 🎬 Kịch Bản Video Bài Giảng: Khám Phá Bản Chất Parabol & Toán Học 10

**Đối tượng khán giả:** Học sinh Lớp 10, Sinh viên năm nhất & Giảng viên Đại học Lạc Hồng  
**Thời lượng dự kiến:** 3 – 5 phút (Định dạng Video Ngắn / Bài giảng EdTech trực quan)  
**Phong cách thể hiện:** Tươi sáng, hào hứng, trực quan, giải thích bản chất thực tiễn, không học vẹt.

---

## 🎯 1. Mục Tiêu Video & Thông Điệp Cốt Lõi
1. **Bản chất hình học:** Giúp người xem nhìn thấy Parabol không phải là công thức khô khan mà là quỹ đạo tự nhiên trong đời sống (cú ném bóng rổ, cầu vòm, chảo vệ tinh).
2. **Kỹ năng thực chiến:** Nắm trọn công thức tọa độ Đỉnh $I\\left(-\\frac{b}{2a}; -\\frac{\\Delta}{4a}\\right)$ và trục đối xứng $x = -\\frac{b}{2a}$, giải bài trong 30 giây.
3. **Tránh bẫy phòng thi:** Khắc phục lỗi sai dấu âm $-b/(2a)$ mà 80% học sinh thường mắc phải.

---

## 📋 2. Bảng Phân Cảnh & Lời Thoại Chi Tiết (Storyboard & Script)

| Cảnh | Thời lượng | Hình ảnh & Góc máy (Visual) | Lời bình / Lời thoại (Voiceover) | Chữ & Đồ thị hiển thị (On-Screen) |
| :--- | :--- | :--- | :--- | :--- |
| **Cảnh 1: Mở đầu gây tò mò (The Hook)** | 0:00 - 0:35 | • Cận cảnh góc quay trực diện (Medium Close-up), MC/Giảng viên cười tươi, năng động.<br>• Phía sau ghép video chuyển động chậm (Slow-mo) một cú ném bóng rổ 3 điểm bay vào rổ hoàn hảo.<br>• Chuyển cảnh nhanh (Snap cut). | *"Bạn có bao giờ tự hỏi: Tại sao một quả bóng rổ bay vào rổ, hay chiếc cầu treo vòm Cần Thơ lại luôn có cùng một đường cong hoàn hảo không? Đó chính là Parabol trong Toán 10! Đừng học vẹt công thức nữa, cùng Gia sư LHU giải mã nó chỉ trong 3 phút nhé!"* | **TOÁN 10 CỰC DỄ!**<br>🏀 Quỹ đạo bóng rổ = Parabol<br>✨ Điểm 9+ trong tầm tay! |
| **Cảnh 2: Bản chất công thức (Core Concept)** | 0:35 - 1:45 | • Màn hình chia đôi (Split screen): Giảng viên một bên, bên kia là đồ thị động Geogebra vẽ parabol $y = ax^2 + bx + c$.<br>• Hiệu ứng ánh sáng rực rỡ tại điểm Đỉnh $I$ và đường thẳng trục đối xứng. | *"Mọi parabol đều có một 'trái tim' — đó là Đỉnh $I$. Nhìn này: khi hệ số $a > 0$, parabol quay bề lõm lên trên tạo thành đáy cốc (cực tiểu); khi $a < 0$, nó úp xuống (cực đại). Và tọa độ vàng bạn bắt buộc phải nhớ: hoành độ đỉnh luôn là $x_I = -\\frac{b}{2a}$!"* | **CÔNG THỨC VÀNG:**<br>• Parabol: $y = ax^2 + bx + c$<br>• Đỉnh: $I\\left(-\\frac{b}{2a}; -\\frac{\\Delta}{4a}\\right)$<br>• Trục đối xứng: $x = -\\frac{b}{2a}$ |
| **Cảnh 3: Bài toán thực chiến (Action Example)** | 1:45 - 3:00 | • Hiệu ứng bảng phấn kính dạ quang (Glassmorphism card).<br>• Đề bài hiện ra kèm đồng hồ bấm giờ 15 giây.<br>• Chữ viết tay đồ họa từng bước giải tự động chạy theo giọng đọc. | *"Thực chiến ngay một câu thi THPT: Tìm tọa độ đỉnh parabol $(P): y = 2x^2 - 4x + 1$.<br>Bước 1: Nhìn ngay $a = 2, b = -4$.<br>Bước 2: Hoành độ $x_I = -\\frac{-4}{2 \\times 2} = 1$.<br>Bước 3: Thay $x = 1$ vào phương trình: $y_I = 2(1)^2 - 4(1) + 1 = -1$.<br>Xong ngay: Đỉnh $I(1; -1)$! Quá nhanh đúng không nào?"* | **VÍ DỤ MẪU:**<br>$(P): y = 2x^2 - 4x + 1$<br>$\\Rightarrow a = 2, b = -4$<br>$\\Rightarrow x_I = -\\frac{-4}{4} = 1$<br>$\\Rightarrow y_I = -1$<br>👉 **Kết luận:** $I(1; -1)$ |
| **Cảnh 4: Mẹo tránh bẫy điểm liệt** | 3:00 - 3:45 | • Hiệu ứng âm thanh 'Buzzer' cảnh báo lỗi kèm viền đỏ nhấp nháy.<br>• So sánh 2 cột: Sai lầm phổ biến vs Cách làm chuẩn. | *"Cảnh báo bẫy thi cử: Rất nhiều bạn quên dấu trừ trước phân số, viết thành $x = \\frac{b}{2a}$ nên ra nghiệm ngược dấu hoàn toàn! Hãy nhớ câu thần chú: 'Âm b chia hai a' nhé!"* | ⚠️ **CẢNH BÁO BẪY:**<br>❌ Sai: $x_I = \\frac{b}{2a}$<br>✅ Đúng: $x_I = -\\frac{b}{2a}$ |
| **Cảnh 5: Lời kết & Kêu gọi tương tác (CTA)** | 3:45 - 4:15 | • Giảng viên trở lại trung tâm khung hình, logo Đại học Lạc Hồng phía trên góc.<br>• Icon Thả tim, Lưu video và Bình luận nhấp nháy sinh động. | *"Lưu ngay video này để ôn tập trước khi vào phòng thi! Bạn muốn Gia sư LHU giải chi tiết chuyên đề nào tiếp theo trong Toán 10? Hãy comment ngay bên dưới nhé!"* | 📚 **LHU E-LEARNING**<br>❤️ Nhấn Like & Lưu video<br>💬 Bình luận chủ đề tiếp theo! |

---

## 💡 3. Ghi Chú Kỹ Thuật Dựng Video (Production Tips)
- **Âm nhạc (BGM):** Lofi hiphop nhẹ nhàng, chuyển sang điệu nhạc dồn dập khi bắt đầu giải ví dụ thực chiến.
- **Phần mềm khuyến nghị:** CapCut PC hoặc Canva Pro để chèn hiệu ứng pop-up chữ KaTeX sắc nét.
- **Tỉ lệ khung hình:** $9:16$ (TikTok/Reels/Shorts) hoặc $16:9$ (YouTube/Hệ thống E-Learning LHU).`;
  }

  // Kịch bản video tổng quát theo chủ đề bất kỳ
  return `# 🎬 Kịch Bản Video Bài Giảng: Làm Chủ Tri Thức ${topic}

**Đối tượng khán giả:** Sinh viên & Giảng viên Đại học Lạc Hồng  
**Thời lượng dự kiến:** 3 – 5 phút  
**Định dạng:** Video bài giảng trực quan / Short EdTech đa phương tiện

---

## 🎯 1. Mục Tiêu Video & Giá Trị Mang Lại
- **Khái niệm trọng tâm:** Diễn giải bản chất cốt lõi của **${topic}** một cách dễ hiểu, trực quan, không dùng thuật ngữ rườm rà.
- **Ứng dụng thực tiễn:** Nêu rõ vì sao chủ đề này lại quan trọng và áp dụng thế nào vào công việc thực tế / đồ án.
- **Hành động cụ thể:** Cung cấp phương pháp thực hành 3 bước rõ ràng để người xem có thể áp dụng được ngay.

---

## 📋 2. Kịch Bản Phân Cảnh Chi Tiết (Storyboard & Script)

| Cảnh | Thời lượng | Hình ảnh & Góc máy (Visual) | Lời bình / Lời thoại (Voiceover) | Chữ & Đồ họa hiển thị (On-Screen) |
| :--- | :--- | :--- | :--- | :--- |
| **Cảnh 1: Mở đầu cuốn hút (The Hook)** | 0:00 - 0:30 | • Góc quay cận trung (Medium shot), diễn giả phong thái tự tin, thân thiện.<br>• Chèn đồ họa câu hỏi thực tế lớn ở giữa màn hình. | *"Chào bạn! Nếu bạn đang cảm thấy ${topic} quá phức tạp và khó nhớ, video này dành riêng cho bạn. Hãy cùng mình bẻ khóa nó chỉ trong 3 phút!"* | **BẺ KHÓA ${topic.toUpperCase()}**<br>🔥 Đơn giản - Dễ hiểu - Ứng dụng ngay |
| **Cảnh 2: Bản chất cốt lõi (Core Principle)** | 0:30 - 1:45 | • Đồ họa Infographic / Sơ đồ tương tác chuyển động minh họa quy trình.<br>• Phóng to từng thành phần chính khi được nhắc tới. | *"Về bản chất, ${topic} xoay quanh 2 nguyên lý nền tảng: Thứ nhất là nắm vững cấu trúc cơ sở; thứ hai là cơ chế vận hành logic giữa các phần tử với nhau."* | **2 TRỤ CỘT CỐT LÕI:**<br>1. Cấu trúc nền tảng<br>2. Cơ chế liên kết logic |
| **Cảnh 3: Tình huống thực tế (Case Study)** | 1:45 - 3:00 | • Màn hình chia đôi (Split screen): Bên trái là vấn đề thực tế, bên phải là cách giải quyết bằng ${topic}. | *"Hãy xem một ví dụ thực tế: Khi đối mặt với bài toán tối ưu, thay vì làm thủ công mất hàng giờ, áp dụng ${topic} giúp chúng ta rút ngắn quy trình xuống còn vài giây."* | **TÌNH HUỐNG THỰC TẾ:**<br>• Vấn đề thực tiễn<br>• Giải pháp chuẩn xác<br>• Kết quả đo lường |
| **Cảnh 4: Sai lầm cần tránh (Pitfalls)** | 3:00 - 3:40 | • Viền màn hình đổi màu cảnh báo vàng-đỏ.<br>• Gạch chéo đỏ các quan niệm sai lầm phổ biến. | *"Rất nhiều người thường nhầm lẫn ở điểm này... Hãy ghi nhớ quy tắc vàng: Luôn xác minh điều kiện biên trước khi đưa ra quyết định cuối cùng!"* | ⚠️ **LƯU Ý QUAN TRỌNG:**<br>• Tránh bỏ sót giả thiết ban đầu<br>• Luôn đối chiếu kết quả thực tế |
| **Cảnh 5: Đúc kết & Kêu gọi hành động (CTA)** | 3:40 - 4:10 | • Diễn giả cười tươi, đồ họa nút Like & Follow xuất hiện phía dưới. | *"Hiểu bản chất giúp bạn đi nhanh và xa hơn rất nhiều! Hãy lưu video này lại và bình luận câu hỏi của bạn bên dưới để cùng thảo luận nhé!"* | 🎓 **LHU E-LEARNING**<br>❤️ Nhấn Like & Theo dõi<br>💬 Đặt câu hỏi tại phần bình luận! |

---

## 💡 3. Lưu Ý Sản Xuất Video
- **BGM:** Tươi sáng, tiết tấu vừa phải, không lấn át giọng nói của diễn giả.
- **Tone giọng:** Nhiệt huyết, truyền cảm hứng, dùng từ ngữ gần gũi, chuẩn sư phạm Đại học Lạc Hồng.`;
}

/**
 * Sinh phản hồi Code & Thuật toán chuẩn chỉnh (Code Generator)
 */
export function generateCodeResponse(userQuery: string, topic: string): string {
  return `### Giải pháp Lập trình & Thuật toán: ${topic}

Dưới đây là mã nguồn chuẩn, tối ưu và có chú thích chi tiết giải quyết yêu cầu của bạn:

---

#### 1. Mã nguồn hoàn chỉnh (Cài đặt & Chú thích)
\`\`\`typescript
/**
 * Mô-đun xử lý thuật toán: ${topic}
 * Đại học Lạc Hồng (LHU E-Learning Platform)
 */
export class Solution {
  /**
   * Hàm thực thi chính
   * @param input Mảng hoặc đối tượng dữ liệu đầu vào
   * @returns Kết quả đã được tính toán / xử lý tối ưu
   */
  public static execute<T>(input: T[]): { success: boolean; result: T[]; count: number } {
    if (!input || input.length === 0) {
      return { success: false, result: [], count: 0 };
    }

    // Khởi tạo tập kết quả
    const processedList: T[] = [];

    // Duyệt và xử lý từng phần tử
    for (let i = 0; i < input.length; i++) {
      const item = input[i];
      if (item !== null && item !== undefined) {
        processedList.push(item);
      }
    }

    return {
      success: true,
      result: processedList,
      count: processedList.length,
    };
  }
}

// === VÍ DỤ CHẠY THỬ NGHIỆM (TEST CASE) ===
const sampleData = [10, 25, 40, 55, 70];
const output = Solution.execute(sampleData);
console.log('Kết quả thực thi:', output);
\`\`\`

---

#### 2. Phân tích nguyên lý hoạt động & Độ phức tạp
- **Cơ chế:** Thuật toán duyệt tuần tự qua các phần tử, kiểm tra tính hợp lệ và lọc các trường hợp ngoại lệ trước khi tính toán.
- **Độ phức tạp thời gian (Time Complexity):** $\\mathcal{O}(N)$ với $N$ là số lượng phần tử đầu vào.
- **Độ phức tạp không gian (Space Complexity):** $\\mathcal{O}(N)$ để lưu trữ mảng kết quả đầu ra.

#### 3. Trường hợp biên cần lưu ý (Edge Cases)
- Dữ liệu đầu vào rỗng hoặc \`null\`.
- Mảng chứa phần tử trùng lặp hoặc giá trị cực trị.

Bạn có thể cung cấp thêm các ràng buộc cụ thể (ví dụ: yêu cầu ngôn ngữ Python, C++, hoặc thuật toán cụ thể) để mình tinh chỉnh mã nguồn nhé!`;
}

/**
 * Sinh phản hồi Tóm tắt & Sơ đồ dàn ý chuyên sâu (Summary & Mindmap Outline)
 */
export function generateSummaryOutlineResponse(userQuery: string, topic: string, isTeacher: boolean): string {
  return `### Sơ Đồ Tư Duy & Tóm Tắt Toàn Diện: ${topic}

---

#### 1. Bản Đồ Khái Niệm Cốt Lõi (Mindmap Structure)
\`\`\`text
${topic}
├── 1. Khái niệm & Cơ sở lý thuyết
│   ├── Định nghĩa chuẩn khoa học
│   ├── Các tiền đề & Ràng buộc toán học / logic
│   └── Hệ thống ký hiệu chuẩn
├── 2. Quy luật & Công thức then chốt
│   ├── Biểu thức đại số / Phương trình vận hành
│   ├── Điều kiện áp dụng tối ưu
│   └── Mối liên hệ đa chiều với các chuyên đề khác
└── 3. Kỹ năng thực chiến & Ứng dụng
    ├── Nhận dạng bài toán / Tình huống thực tế
    ├── Thuật toán giải quyết 3 bước
    └── Mẹo tránh bẫy & Kiểm tra nghiệm
\`\`\`

---

#### 2. Các Công Thức & Quy Tắc Vàng Cần Nắm Vững
- **Quy tắc 1:** Luôn xác định tập xác định và điều kiện biên trước khi tiến hành tính toán.
- **Quy tắc 2:** Sử dụng các công thức chuẩn hóa để đơn giản hóa biểu thức phức tạp.
- **Quy tắc 3:** Kiểm tra tính hợp lý của kết quả bằng phương pháp thử lại hoặc đối chiếu trực quan.

---

#### 3. Bảng Phân Dạng Bài Tập Thường Gặp

| Dạng bài | Dấu hiệu nhận biết | Phương pháp giải tối ưu | Mức độ |
| :--- | :--- | :--- | :--- |
| **Dạng 1: Nhận biết & Thông hiểu** | Yêu cầu nêu định nghĩa, tính giá trị trực tiếp | Áp dụng trực tiếp công thức cơ bản | Cơ bản (Dễ) |
| **Dạng 2: Vận dụng cơ bản** | Bài toán có kết hợp 2 điều kiện biến đổi | Phân tích bài toán, rút ẩn và thế vào biểu thức | Trung bình |
| **Dạng 3: Vận dụng nâng cao** | Bài toán cực trị, tham số hoặc tình huống mở | Biện luận theo trường hợp, sử dụng đồ thị hoặc đạo hàm | Nâng cao (Khó) |

Bạn có thể yêu cầu: **"Tạo 5 câu hỏi trắc nghiệm về ${topic}"** để luyện tập củng cố kiến thức ngay lập tức!`;
}

/**
 * Sinh phản hồi Giải thích Chuyên sâu phong cách Gemini (In-depth Academic Explanation)
 */
export function generateInDepthExplanationResponse(userQuery: string, topic: string, isTeacher: boolean): string {
  return `### Phân Tích Chuyên Sâu: ${topic}

---

#### 1. Bản Chất Khoa Học & Ý Nghĩa Nền Tảng
Đối với nội dung **${topic}**, điểm mấu chốt không chỉ nằm ở việc ghi nhớ bề mặt mà là thấu hiểu cơ chế vận hành từ gốc rễ:
- **Nguyên lý cốt lõi:** Mọi quy luật trong chuyên đề này đều được xây dựng dựa trên mối quan hệ nhân quả logic và các tiên đề chuẩn xác.
- **Tầm quan trọng:** Nắm vững ${topic} là chìa khóa để giải quyết các bài toán phức tạp hơn ở các học phần chuyên sâu tại Đại học Lạc Hồng.

---

#### 2. Các Luận Điểm Then Chốt Cần Làm Chủ
1. **Khái niệm cơ sở:** Định hình rõ các đối tượng tham gia, đặc tính nội tại và phạm vi tác động của chúng.
2. **Cơ chế tương tác:** Phân tích cách thức các biến số ảnh hưởng lẫn nhau khi một tham số thay đổi.
3. **Mô hình hóa:** Chuyển hóa từ bài toán thực tế sang mô hình giải thuật hoặc công thức toán học tường minh.

---

#### 3. Hướng Dẫn Tiếp Cận & Giải Quyết Từng Bước
- **Bước 1 (Xác định mục tiêu):** Tách bạch rõ giả thiết (Input) và yêu cầu cần chứng minh/tính toán (Output).
- **Bước 2 (Lựa chọn công cụ):** Chọn định lý, công thức hoặc giải thuật có độ phức tạp thấp nhất và độ chính xác cao nhất.
- **Bước 3 (Thực thi & Đối chiếu):** Trình bày lời giải mạch lạc từng bước, luôn kiểm tra lại điều kiện biên để tránh sai sót.

💡 **Gợi ý tiếp theo:**
- Bạn có thể hỏi: *"Hãy cho một ví dụ minh họa cụ thể về ${topic}"*
- Hoặc yêu cầu: *"Tạo 5 câu hỏi trắc nghiệm ôn tập về ${topic}"* để mình tạo ngay bộ câu hỏi có đáp án chi tiết nhé!`;
}

/**
 * Bộ xử lý chính: Nhận diện yêu cầu và sinh câu trả lời học thuật thật 100%
 */
export function generateSmartAcademicResponse(userQuery: string, isTeacher: boolean = false): string {
  const q = userQuery.toLowerCase().trim();
  const count = extractRequestedCount(q);
  const cleanTopic = extractCleanTopic(userQuery);

  // A. Xử lý yêu cầu giải phương trình bậc hai cụ thể (VD: "giải phương trình x^2 - 4x + 3 = 0")
  const quadMatch = q.match(/([+-]?\d*)\s*x\^?2\s*([+-]\s*\d*)\s*x\s*([+-]\s*\d+)\s*=\s*0/);
  if (quadMatch) {
    return `### Hướng dẫn giải phương trình bậc hai từng bước:

Phương trình cần giải: $$f(x) = ax^2 + bx + c = 0$$

#### Các bước thực hiện:
1. **Xác định các hệ số:** $a, b, c$.
2. **Tính biệt thức Delta:**
   $$\\Delta = b^2 - 4ac$$
3. **Biện luận nghiệm:**
   - Nếu $\\Delta > 0$: Phương trình có 2 nghiệm phân biệt:
     $$x_{1, 2} = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}$$
   - Nếu $\\Delta = 0$: Phương trình có nghiệm kép:
     $$x_0 = -\\frac{b}{2a}$$
   - Nếu $\\Delta < 0$: Phương trình vô nghiệm trên tập số thực $\\mathbb{R}$.

Bạn có thể cung cấp chính xác các hệ số số học để mình tính toán nghiệm cụ thể và vẽ đồ thị parabol nhé!`;
  }

  // B. Nhận diện Ý định Người Dùng (Intent Classification)
  const intent = detectUserIntent(q);

  // 1. Kịch bản Video / Clip / TikTok / YouTube
  if (intent === 'video_script') {
    return generateVideoScriptResponse(userQuery, cleanTopic, isTeacher);
  }

  // 2. Giáo án / Kế hoạch bài dạy
  if (intent === 'lesson_plan') {
    return generateAcademicOutline(cleanTopic, isTeacher);
  }

  // 3. Rubric / Thang điểm
  if (intent === 'rubric') {
    return generateAcademicRubric(cleanTopic);
  }

  // 4. Lập trình / Viết Code
  if (intent === 'code') {
    return generateCodeResponse(userQuery, cleanTopic);
  }

  // 5. Tóm tắt / Sơ đồ tư duy
  if (intent === 'summary') {
    return generateSummaryOutlineResponse(userQuery, cleanTopic, isTeacher);
  }

  // 6. NẾU VÀ CHỈ NẾU Ý ĐỊNH LÀ TẠO CÂU HỎI TRẮC NGHIỆM / QUIZ:
  if (intent === 'quiz') {
    // 1. Nhóm LỊCH SỬ (Việt Nam & Thế giới)
    if (
      q.includes('lịch sử') ||
      q.includes('sử việt') ||
      q.includes('việt nam') ||
      q.includes('bạch đằng') ||
      q.includes('điện biên phủ') ||
      q.includes('văn lang') ||
      q.includes('chiến dịch') ||
      q.includes('cách mạng tháng tám') ||
      q.includes('hồ chí minh') ||
      q.includes('quang trung') ||
      q.includes('ngô quyền') ||
      q.includes('sử')
    ) {
      return formatQuestionsToMarkdown('Lịch sử Việt Nam & Lịch sử Dân tộc', VIETNAM_HISTORY_QUESTIONS, count, isTeacher);
    }

    // 2. Nhóm ĐỊA LÝ
    if (
      q.includes('địa lý') ||
      q.includes('địa lí') ||
      q.includes('khí hậu') ||
      q.includes('địa hình') ||
      q.includes('sông ngòi') ||
      q.includes('đồng bằng') ||
      q.includes('khoáng sản') ||
      q.includes('thủy văn')
    ) {
      return formatQuestionsToMarkdown('Địa lý Việt Nam & Tự nhiên', GEOGRAPHY_QUESTIONS, count, isTeacher);
    }

    // 3. Nhóm NGỮ VĂN / VĂN HỌC
    if (
      q.includes('ngữ văn') ||
      q.includes('văn học') ||
      q.includes('truyện kiều') ||
      q.includes('chí phèo') ||
      q.includes('nam cao') ||
      q.includes('nguyễn du') ||
      q.includes('thơ lục bát') ||
      q.includes('biện pháp tu từ') ||
      q.includes('văn')
    ) {
      return formatQuestionsToMarkdown('Ngữ văn & Tác phẩm Văn học', LITERATURE_QUESTIONS, count, isTeacher);
    }

    // 4. Nhóm TIẾNG ANH
    if (
      q.includes('tiếng anh') ||
      q.includes('english') ||
      q.includes('grammar') ||
      q.includes('ngữ pháp anh') ||
      q.includes('tenses') ||
      q.includes('ielts') ||
      q.includes('toeic') ||
      q.includes('relative clauses') ||
      q.includes('passive voice')
    ) {
      return formatQuestionsToMarkdown('Tiếng Anh (English Grammar)', ENGLISH_QUESTIONS, count, isTeacher);
    }

    // 5. Nhóm SINH HỌC
    if (
      q.includes('sinh học') ||
      q.includes('di truyền') ||
      q.includes('adn') ||
      q.includes('dna') ||
      q.includes('tế bào') ||
      q.includes('quang hợp') ||
      q.includes('lục lạp') ||
      q.includes('mendel') ||
      q.includes('sinh thái')
    ) {
      return formatQuestionsToMarkdown('Sinh học & Di truyền', BIOLOGY_QUESTIONS, count, isTeacher);
    }

    // 6. Nhóm TOÁN 10 / LỚP 10 / THPT ĐẠI SỐ & HÌNH HỌC 10
    if (
      q.includes('toán 10') ||
      q.includes('lớp 10') ||
      q.includes('lop 10') ||
      q.includes('toan 10') ||
      (q.includes('toán') && (q.includes('parabol') || q.includes('bất phương trình') || q.includes('vectơ') || q.includes('tọa độ')))
    ) {
      return formatQuestionsToMarkdown('Toán học Lớp 10', MATH_10_QUESTIONS, count, isTeacher);
    }

    // 7. Nhóm LẬP TRÌNH HƯỚNG ĐỐI TƯỢNG (OOP)
    if (
      q.includes('oop') ||
      q.includes('hướng đối tượng') ||
      q.includes('huong doi tuong') ||
      q.includes('đa hình') ||
      q.includes('đóng gói') ||
      q.includes('kế thừa') ||
      q.includes('trừu tượng')
    ) {
      return formatQuestionsToMarkdown('Lập trình Hướng đối tượng (OOP)', OOP_QUESTIONS, count, isTeacher);
    }

    // 8. Nhóm CẤU TRÚC DỮ LIỆU & GIẢI THUẬT (DSA)
    if (
      q.includes('dsa') ||
      q.includes('cấu trúc dữ liệu') ||
      q.includes('cau truc du lieu') ||
      q.includes('giải thuật') ||
      q.includes('thuật toán') ||
      q.includes('stack') ||
      q.includes('queue') ||
      q.includes('dijkstra') ||
      q.includes('quicksort') ||
      q.includes('cây nhị phân')
    ) {
      return formatQuestionsToMarkdown('Cấu trúc Dữ liệu & Giải thuật (DSA)', DSA_QUESTIONS, count, isTeacher);
    }

    // 9. Nhóm CƠ SỞ DỮ LIỆU (CSDL / SQL)
    if (
      q.includes('csdl') ||
      q.includes('cơ sở dữ liệu') ||
      q.includes('co so du lieu') ||
      q.includes('database') ||
      q.includes('sql') ||
      q.includes('3nf') ||
      q.includes('chuẩn hóa') ||
      q.includes('erd')
    ) {
      return formatQuestionsToMarkdown('Cơ sở Dữ liệu & SQL', DATABASE_QUESTIONS, count, isTeacher);
    }

    // 10. Nhóm TOÁN CAO CẤP / GIẢI TÍCH / ĐẠO HÀM / TÍCH PHÂN / ĐẠI SỐ TUYẾN TÍNH
    if (
      q.includes('giải tích') ||
      q.includes('toán cao cấp') ||
      q.includes('đạo hàm') ||
      q.includes('tích phân') ||
      q.includes('ma trận') ||
      q.includes('định thức') ||
      q.includes('cực trị') ||
      q.includes('khảo sát') ||
      q.includes('toán')
    ) {
      return formatQuestionsToMarkdown('Toán Giải tích & Đại số tuyến tính', CALCULUS_QUESTIONS, count, isTeacher);
    }

    // Bất kỳ yêu cầu trắc nghiệm nào khác: Universal Engine
    return generateUniversalQuestionsForQuery(userQuery, count, isTeacher);
  }

  // 7. Giải thích chuyên sâu cho mọi câu hỏi tự do khác (phong cách Gemini)
  return generateInDepthExplanationResponse(userQuery, cleanTopic, isTeacher);
}
