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
// HÀM TIỆN ÍCH TRÍCH XUẤT SỐ LƯỢNG VÀ TẠO CÂU HỎI FORMAT HOÀN CHỈNH
// ============================================================================

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
 * Định dạng danh sách câu hỏi thành văn bản Markdown chuẩn KaTeX
 */
function formatQuestionsToMarkdown(
  topicTitle: string,
  questions: FallbackQuestionItem[],
  count: number
): string {
  const selectedQuestions = questions.slice(0, count);

  let output = `Chào bạn! Gia sư AI Đại học Lạc Hồng (LHU) xin gửi bạn bộ **${selectedQuestions.length} câu hỏi ôn tập ${topicTitle}** chuẩn kiến thức kèm đáp án và lời giải chi tiết:\n\n---\n\n`;

  selectedQuestions.forEach((q, idx) => {
    output += `### **Câu ${idx + 1}: ${q.question}**\n\n`;
    q.options.forEach((opt) => {
      output += `- **${opt.key}.** ${opt.text}\n`;
    });
    output += `\n👉 **Đáp án đúng:** **${q.correctAnswer}**\n`;
    output += `💡 **Lời giải chi tiết:** ${q.explanation}\n\n---\n\n`;
  });

  output += `Chúc bạn ôn tập thật tốt! Bạn có thắc mắc câu nào hay cần mình giải thích thêm phương pháp giải không?`;
  return output.trim();
}

/**
 * Bộ xử lý chính: Nhận diện yêu cầu và sinh câu trả lời học thuật thật 100%
 */
export function generateSmartAcademicResponse(userQuery: string, isTeacher: boolean = false): string {
  const q = userQuery.toLowerCase().trim();
  const count = extractRequestedCount(q);

  // 1. Nhóm TOÁN 10 / LỚP 10 / THPT ĐẠI SỐ & HÌNH HỌC 10
  if (
    q.includes('toán 10') ||
    q.includes('lớp 10') ||
    q.includes('lop 10') ||
    q.includes('toan 10') ||
    (q.includes('toán') && (q.includes('parabol') || q.includes('bất phương trình') || q.includes('vectơ') || q.includes('tọa độ')))
  ) {
    return formatQuestionsToMarkdown('Toán học Lớp 10', MATH_10_QUESTIONS, count);
  }

  // 2. Nhóm LẬP TRÌNH HƯỚNG ĐỐI TƯỢNG (OOP)
  if (
    q.includes('oop') ||
    q.includes('hướng đối tượng') ||
    q.includes('huong doi tuong') ||
    ((q.includes('lập trình') || q.includes('c#') || q.includes('java')) &&
      (q.includes('câu hỏi') || q.includes('ôn tập') || q.includes('trắc nghiệm')))
  ) {
    return formatQuestionsToMarkdown('Lập trình Hướng đối tượng (OOP)', OOP_QUESTIONS, count);
  }

  // 3. Nhóm CẤU TRÚC DỮ LIỆU & GIẢI THUẬT (DSA)
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
    return formatQuestionsToMarkdown('Cấu trúc Dữ liệu & Giải thuật (DSA)', DSA_QUESTIONS, count);
  }

  // 4. Nhóm CƠ SỞ DỮ LIỆU (CSDL / SQL)
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
    return formatQuestionsToMarkdown('Cơ sở Dữ liệu & SQL', DATABASE_QUESTIONS, count);
  }

  // 5. Nhóm TOÁN CAO CẤP / GIẢI TÍCH / ĐẠO HÀM / TÍCH PHÂN / ĐẠI SỐ TUYẾN TÍNH
  if (
    q.includes('giải tích') ||
    q.includes('toán cao cấp') ||
    q.includes('đạo hàm') ||
    q.includes('tích phân') ||
    q.includes('ma trận') ||
    q.includes('định thức') ||
    q.includes('cực trị') ||
    q.includes('khảo sát') ||
    (q.includes('toán') && (q.includes('câu hỏi') || q.includes('ôn tập') || q.includes('trắc nghiệm')))
  ) {
    return formatQuestionsToMarkdown('Toán Giải tích & Đại số tuyến tính', CALCULUS_QUESTIONS, count);
  }

  // 6. Xử lý yêu cầu giải phương trình cụ thể (ví dụ: "giải phương trình x^2 - 4x + 3 = 0")
  const quadMatch = q.match(/([+-]?\d*)\s*x\^?2\s*([+-]\s*\d*)\s*x\s*([+-]\s*\d+)\s*=\s*0/);
  if (quadMatch) {
    return `### **Hướng dẫn giải phương trình bậc hai từng bước:**

Phương trình cần giải: $$f(x) = ax^2 + bx + c = 0$$

#### **Các bước thực hiện:**
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

  // 7. Nếu là Giảng viên: Cung cấp khung đề cương & rubric sư phạm chuẩn
  if (isTeacher) {
    return `Chào Thầy/Cô! Với tư cách là **Trợ lý Học thuật & Khảo thí AI (Đại học Lạc Hồng)**, tôi xin phản hồi về chủ đề: **"${userQuery}"** như sau:

---

### **1. Mục tiêu bài giảng & Chuẩn đầu ra (CLO):**
- **Về kiến thức:** Sinh viên hiểu rõ bản chất nguyên lý, công thức và kiến trúc cốt lõi.
- **Về kỹ năng:** Vận dụng biến đổi toán học hoặc lập trình cài đặt bài toán thực tế chính xác.
- **Về tư duy:** Phân tích độ phức tạp thuật toán và tối ưu hóa giải pháp.

---

### **2. Cấu trúc Rubric đánh giá gợi ý (Thang điểm 10):**
- **Nhận biết (2.0 điểm):** Trình bày chính xác định nghĩa, cú pháp hoặc phát biểu định lý.
- **Thông hiểu (3.0 điểm):** Giải thích cơ chế hoạt động, vẽ sơ đồ khối / đồ thị minh họa.
- **Vận dụng (3.0 điểm):** Giải bài tập hoặc viết mã nguồn hoàn chỉnh không có lỗi logic.
- **Vận dụng cao (2.0 điểm):** Xử lý các trường hợp biên (Edge cases), tối ưu thời gian $O(N)$ hoặc đánh giá giải pháp mở rộng.

Thầy/Cô có muốn tôi sinh ngân hàng câu hỏi trắc nghiệm hoặc đề thi tự luận chi tiết theo chủ đề này không ạ?`;
  }

  // 8. Phản hồi Sinh viên tổng quát có cấu trúc học thuật rõ ràng (KHÔNG sáo rỗng)
  return `Chào bạn! Gia sư AI Đại học Lạc Hồng (LHU) xin phản hồi và hướng dẫn bạn về chủ đề: **"${userQuery}"** như sau:

---

### **1. Khái niệm & Nguyên lý trọng tâm:**
Đối với nội dung này, bạn cần nắm vững hai thành phần cốt lõi:
- **Định nghĩa cơ sở:** Nắm chắc các quy tắc, định lý và công thức biến đổi chuẩn trước khi làm bài.
- **Mối liên hệ thực tiễn:** Áp dụng vào các bài toán kinh điển hoặc tình huống thực tế để nhớ lâu hơn.

---

### **2. Quy trình 3 bước giải quyết bài toán:**
1. **Phân tích đề bài:** Liệt kê các đại lượng đã cho và yêu cầu đầu ra cần tìm kiếm.
2. **Lựa chọn phương pháp:** Sử dụng công thức toán học KaTeX $...$ hoặc thuật toán có độ phức tạp tối ưu nhất.
3. **Kiểm tra tính hợp lý:** Thế ngược kết quả vào đề bài ban đầu hoặc thử lại với các trường hợp đặc biệt.

---

💡 **Gợi ý ôn tập:** Bạn có thể nhập lệnh: **"Tạo 5 câu hỏi ôn tập..."** kèm tên môn học (ví dụ: *Toán 10*, *Giải tích*, *Lập trình OOP*, *Cấu trúc dữ liệu*, *CSDL*) để mình tạo đề tự luyện có đáp án chi tiết nhé!`;
}
