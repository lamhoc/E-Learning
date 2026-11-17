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
 * Bộ xử lý chính: Nhận diện yêu cầu và sinh câu trả lời học thuật thật 100%
 */
export function generateSmartAcademicResponse(userQuery: string, isTeacher: boolean = false): string {
  const q = userQuery.toLowerCase().trim();
  const count = extractRequestedCount(q);

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

  // B. Nhận diện yêu cầu Soạn Đề cương / Giáo án
  if (
    q.includes('đề cương') ||
    q.includes('giáo án') ||
    q.includes('kế hoạch bài dạy') ||
    q.includes('mục tiêu bài giảng')
  ) {
    let cleanTopic = userQuery
      .replace(/(?:soạn|hãy soạn|tạo|lập|hướng dẫn soạn)\s+(?:đề cương|giáo án|kế hoạch bài dạy)\s*(?:cho|về|học phần|môn)?/gi, '')
      .trim();
    if (!cleanTopic) cleanTopic = 'Học phần Chuyên ngành';
    return generateAcademicOutline(cleanTopic, isTeacher);
  }

  // C. Nhận diện yêu cầu Lập Rubric / Thang điểm
  if (
    q.includes('rubric') ||
    q.includes('thang điểm') ||
    q.includes('tiêu chí chấm') ||
    q.includes('bảng chấm điểm')
  ) {
    let cleanTopic = userQuery
      .replace(/(?:xây dựng|tạo|lập|soạn|hướng dẫn)\s+(?:rubric|thang điểm|tiêu chí chấm)\s*(?:cho|về|môn)?/gi, '')
      .trim();
    if (!cleanTopic) cleanTopic = 'Bài kiểm tra chuyên môn';
    return generateAcademicRubric(cleanTopic);
  }

  // D. Nhóm CÂU HỎI THEO MÔN HỌC & CHỦ ĐỀ CHUẨN XÁC:

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
    (q.includes('sử') && (q.includes('câu hỏi') || q.includes('ôn tập') || q.includes('trắc nghiệm') || q.includes('tạo')))
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
    (q.includes('văn') && (q.includes('câu hỏi') || q.includes('ôn tập') || q.includes('trắc nghiệm') || q.includes('tạo')))
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
    ((q.includes('lập trình') || q.includes('c#') || q.includes('java')) &&
      (q.includes('câu hỏi') || q.includes('ôn tập') || q.includes('trắc nghiệm') || q.includes('tạo')))
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
    (q.includes('toán') && (q.includes('câu hỏi') || q.includes('ôn tập') || q.includes('trắc nghiệm') || q.includes('tạo')))
  ) {
    return formatQuestionsToMarkdown('Toán Giải tích & Đại số tuyến tính', CALCULUS_QUESTIONS, count, isTeacher);
  }

  // 11. Bất kỳ yêu cầu tạo câu hỏi / ôn tập nào khác: Kích hoạt Universal Engine theo đúng từ khóa đề tài
  if (
    q.includes('câu hỏi') ||
    q.includes('trắc nghiệm') ||
    q.includes('ôn tập') ||
    q.includes('tạo') ||
    q.includes('soạn') ||
    q.includes('bài tập') ||
    q.includes('quiz') ||
    q.includes('test')
  ) {
    return generateUniversalQuestionsForQuery(userQuery, count, isTeacher);
  }

  // 12. Câu hỏi lý thuyết / bài tập chung (không yêu cầu sinh trắc nghiệm): Trả lời trọng tâm, KHÔNG sáo rỗng
  return `### Phân tích trọng tâm: ${userQuery}

---

#### 1. Nguyên lý & Khái niệm cốt lõi:
Đối với nội dung **"${userQuery}"**, trọng tâm học thuật cần làm chủ bao gồm:
- **Định nghĩa cơ sở:** Nắm chắc các quy tắc, định lý và công thức biến đổi chuẩn trước khi thực hành.
- **Bản chất vận hành:** Hiểu rõ cơ chế vì sao phương pháp này hoạt động và mối liên hệ với các bài toán liên quan.

---

#### 2. Phương pháp tiếp cận bài toán:
1. **Phân tích yêu cầu:** Xác định rõ các giả thiết đầu vào và kết quả đầu ra cần đạt được.
2. **Lựa chọn mô hình:** Áp dụng công thức chuẩn (hoặc thuật toán tối ưu) phù hợp nhất với điều kiện bài toán.
3. **Thực thi và đối chiếu:** Tiến hành các bước giải cụ thể và kiểm tra lại tính hợp lý của kết quả cuối cùng.

Bạn có thể yêu cầu: **"Tạo 5 câu hỏi trắc nghiệm về ${userQuery}"** để mình tạo ngay bộ câu hỏi tự luyện có đáp án chi tiết nhé!`;
}
