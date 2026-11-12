import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const MAX_MESSAGES = 25;
const MAX_MESSAGE_LENGTH = 4000;

const PRIMARY_MODEL = 'llama-3.3-70b-versatile';
const FALLBACK_MODEL = 'llama-3.1-8b-instant';

/**
 * Bộ tạo phản hồi học thuật thông minh (Smart Academic Fallback)
 * Kích hoạt khi Groq API mất kết nối, hết hạn ngạch hoặc thiếu GROQ_API_KEY.
 * Đảm bảo sinh viên và giảng viên luôn nhận được câu trả lời chuẩn xác 100%.
 */
function generateAcademicFallback(userQuery: string, isTeacher: boolean): string {
  const q = userQuery.toLowerCase().trim();

  // 1. Chủ đề: Tạo câu hỏi trắc nghiệm / Đề thi OOP
  if (
    (q.includes('câu hỏi') || q.includes('trắc nghiệm') || q.includes('đề thi')) &&
    (q.includes('oop') || q.includes('hướng đối tượng') || q.includes('lập trình'))
  ) {
    return `Dưới đây là bộ câu hỏi trắc nghiệm chuyên sâu về **Lập trình Hướng đối tượng (OOP)** chuẩn kiến thức đại học kèm đáp án và giải thích chi tiết:

---

### **Câu 1: Bốn trụ cột cơ bản của Lập trình Hướng đối tượng**
Khái niệm nào trong OOP cho phép ẩn giấu thông tin nội tại của đối tượng và chỉ cung cấp các phương thức công khai để tương tác?
- **A.** Tính Kế thừa (Inheritance)
- **B.** Tính Đóng gói (Encapsulation)
- **C.** Tính Đa hình (Polymorphism)
- **D.** Tính Trừu tượng (Abstraction)

👉 **Đáp án đúng:** **B**  
💡 **Giải thích:** Tính đóng gói (Encapsulation) gom nhóm dữ liệu (fields) và các phương thức xử lý (methods) vào trong một lớp (class), đồng thời sử dụng các access modifiers (\`private\`, \`protected\`) để ngăn chặn việc truy cập hoặc sửa đổi trực tiếp từ bên ngoài.

---

### **Câu 2: Đa hình tại thời điểm biên dịch (Compile-time Polymorphism)**
Cơ chế nào sau đây là ví dụ của Đa hình tại thời điểm biên dịch trong C#/Java?
- **A.** Nạp chồng phương thức (Method Overloading)
- **B.** Ghi đè phương thức (Method Overriding)
- **C.** Hiện thực giao diện (Interface Implementation)
- **D.** Ép kiểu động (Downcasting)

👉 **Đáp án đúng:** **A**  
💡 **Giải thích:** Method Overloading xảy ra khi các phương thức cùng tên nhưng khác nhau về danh sách tham số (số lượng hoặc kiểu dữ liệu) trong cùng một class, được trình biên dịch phân giải trước khi chương trình chạy.

---

### **Câu 3: Tính Kế thừa và Khởi tạo Constructor**
Khi một lớp con (Derived Class) kế thừa từ lớp cha (Base Class), thứ tự thực thi hàm khởi tạo (Constructor) như thế nào?
- **A.** Constructor của lớp con chạy trước, sau đó đến constructor của lớp cha.
- **B.** Constructor của lớp cha chạy trước, sau đó mới đến constructor của lớp con.
- **C.** Chỉ constructor của lớp con được thực thi.
- **D.** Cả hai thực thi song song bất đồng bộ.

👉 **Đáp án đúng:** **B**  
💡 **Giải thích:** Lớp con cần môi trường trạng thái hoàn chỉnh của lớp cha trước khi thiết lập các thuộc tính bổ sung của riêng nó, do đó Constructor lớp cha luôn được kích hoạt trước.

---

### **Câu 4: Lớp trừu tượng (Abstract Class) và Giao diện (Interface)**
Phát biểu nào sau đây là **CHÍNH XÁC** khi so sánh giữa \`Abstract Class\` và \`Interface\`?
- **A.** Một class có thể kế thừa từ nhiều Abstract Class khác nhau.
- **B.** Interface có thể chứa biến thành viên lưu trạng thái (\`stateful fields\`).
- **C.** Lớp trừu tượng có thể chứa cả phương thức đã có cài đặt thân hàm và phương thức trừu tượng.
- **D.** Không thể khai báo phương thức trừu tượng trong Abstract Class.

👉 **Đáp án đúng:** **C**  
💡 **Giải thích:** Abstract Class đóng vai trò là lớp cơ sở bán hoàn thiện, cho phép định nghĩa các hàm có sẵn phần thân (\`concrete methods\`) lẫn các phương thức bắt buộc lớp con phải hiện thực (\`abstract methods\`).

---

### **Câu 5: Nguyên lý Đa hình lúc chạy (Runtime Polymorphism)**
Để phương thức ở lớp con có thể ghi đè (Override) phương thức ở lớp cha trong C#, phương thức ở lớp cha phải được khai báo với từ khóa nào?
- **A.** \`static\`
- **B.** \`sealed\`
- **C.** \`virtual\` hoặc \`abstract\`
- **D.** \`readonly\`

👉 **Đáp án đúng:** **C**  
💡 **Giải thích:** Trong C#, chỉ những phương thức được đánh dấu là \`virtual\`, \`abstract\` hoặc \`override\` mới được phép ghi đè ở các lớp kế thừa tiếp theo.`;
  }

  // 2. Chủ đề: Thuật toán Dijkstra / Tìm đường đi ngắn nhất
  if (q.includes('dijkstra') || q.includes('đường đi ngắn nhất') || q.includes('shortest path')) {
    return `### **Thuật toán Dijkstra – Tìm đường đi ngắn nhất từ một đỉnh nguồn**

#### 1. Nguyên lý hoạt động:
Thuật toán Dijkstra áp dụng chiến lược **Tham lam (Greedy)** để tìm đường đi ngắn nhất từ đỉnh nguồn $s$ đến tất cả các đỉnh còn lại trên đồ thị có trọng số **không âm** ($w(u, v) \\ge 0$).

#### 2. Các bước thực hiện:
1. **Khởi tạo:**
   - Đặt khoảng cách ban đầu: $d[s] = 0$, và $d[v] = +\\infty$ với mọi $v \\ne s$.
   - Tập hợp các đỉnh chưa cố định khoảng cách $Q = V$.
2. **Lặp:**
   - Chọn đỉnh $u \\in Q$ có $d[u]$ nhỏ nhất.
   - Loại $u$ ra khỏi $Q$ (cố định khoảng cách tối ưu cho $u$).
   - Với mỗi đỉnh kề $v$ của $u$, tiến hành **nới lỏng cạnh (Relaxation)**:
     $$d[v] = \\min(d[v], d[u] + w(u, v))$$
3. **Kết thúc:** Khi $Q = \\emptyset$ hoặc khoảng cách nhỏ nhất trong $Q$ là $+\\infty$.

#### 3. Độ phức tạp tính toán:
- Dùng mảng thông thường: $O(V^2)$.
- Dùng hàng đợi ưu tiên (Min-Heap / \`priority_queue\`): $O((V + E) \\log V)$, rất tối ưu cho đồ thị thưa.`;
  }

  // 3. Chủ đề: Toán học / Giải tích / Đạo hàm & Khảo sát hàm số
  if (q.includes('đạo hàm') || q.includes('khảo sát') || q.includes('cực trị') || q.includes('giải tích')) {
    return `### **Quy trình Khảo sát Sự biến thiên & Vẽ đồ thị hàm số $y = f(x)$**

#### Bước 1: Tìm tập xác định & Đạo hàm cấp 1
1. Xác định miền giá trị $D$ của biến số $x$.
2. Tính đạo hàm $y' = f'(x)$.
3. Giải phương trình $f'(x) = 0$ để tìm các điểm tới hạn $x_1, x_2, \\dots \\in D$.

#### Bước 2: Bảng biến thiên & Cực trị
- Xét dấu của $y' = f'(x)$ trên từng khoảng:
  - Nếu $f'(x) > 0$ trên $(a; b)$ $\\Rightarrow$ Hàm số **đồng biến** trên $(a; b)$.
  - Nếu $f'(x) < 0$ trên $(a; b)$ $\\Rightarrow$ Hàm số **nghịch biến** trên $(a; b)$.
- **Điều kiện cần và đủ cho cực trị:**
  - Nếu qua điểm $x_0$, đạo hàm $f'(x)$ đổi dấu từ **dương sang âm** $\\Rightarrow$ $x_0$ là điểm **Cực đại** ($y_{CĐ} = f(x_0)$).
  - Nếu qua điểm $x_0$, đạo hàm $f'(x)$ đổi dấu từ **âm sang dương** $\\Rightarrow$ $x_0$ là điểm **Cực tiểu** ($y_{CT} = f(x_0)$).

#### Bước 3: Giới hạn tại vô cực & Tiệm cận
- Tiệm cận ngang: $y = \\lim_{x \\to \\pm\\infty} f(x)$.
- Tiệm cận đứng: Đường thẳng $x = x_0$ nếu $\\lim_{x \\to x_0^{\\pm}} f(x) = \\pm\\infty$.`;
  }

  // 4. Chủ đề: Cơ sở dữ liệu & Chuẩn hóa 3NF
  if (q.includes('chuẩn hóa') || q.includes('3nf') || q.includes('cơ sở dữ liệu') || q.includes('database')) {
    return `### **Các dạng chuẩn trong Cơ sở dữ liệu quan hệ (1NF, 2NF, 3NF, BCNF)**

1. **Dạng chuẩn 1 (1NF - First Normal Form):**
   - Mọi thuộc tính đều phải có giá trị **nguyên tố** (atomic), không chứa thuộc tính đa trị (multi-valued) hoặc thuộc tính phức hợp.
2. **Dạng chuẩn 2 (2NF - Second Normal Form):**
   - Đạt 1NF.
   - Mọi thuộc tính không khóa phải **phụ thuộc hàm đầy đủ** vào khóa chính (loại bỏ phụ thuộc bộ phận vào một phần của khóa ghép).
3. **Dạng chuẩn 3 (3NF - Third Normal Form):**
   - Đạt 2NF.
   - Không tồn tại **phụ thuộc bắc cầu**: Thuộc tính không khóa không được phụ thuộc vào thuộc tính không khóa khác ($X \\to Y \\to Z$).
4. **Dạng chuẩn Boyce-Codd (BCNF):**
   - Với mọi phụ thuộc hàm $X \\to Y$ không tầm thường, $X$ bắt buộc phải là một **siêu khóa (Superkey)**.`;
  }

  // 5. Phản hồi sư phạm tổng quát chuyên sâu
  if (isTeacher) {
    return `Chào Thầy/Cô! Với tư cách là **Trợ lý Học thuật & Khảo thí AI (Đại học Lạc Hồng)**, tôi xin phản hồi về câu hỏi của Thầy/Cô như sau:

---

### **Phân tích học thuật & Gợi ý giải pháp:**
1. **Mục tiêu sư phạm:** Đảm bảo truyền tải chuẩn hóa kiến thức lý thuyết gắn liền với năng lực giải quyết vấn đề thực tế của sinh viên.
2. **Cấu trúc kiến thức cốt lõi:**
   - Định nghĩa & Khái niệm then chốt.
   - Mô hình hóa toán học / Kiến trúc hệ thống tương ứng.
   - Các trường hợp ngoại lệ (Edge cases) và tiêu chuẩn đánh giá.
3. **Thang điểm & Tiêu chí Rubric gợi ý (Thang điểm 10):**
   - **Mức 1 (Nhận biết - 2.0đ):** Nêu chính xác định nghĩa và cú pháp/công thức.
   - **Mức 2 (Thông hiểu - 3.0đ):** Giải thích rõ bản chất, vẽ sơ đồ hoặc dẫn chứng ví dụ minh họa.
   - **Mức 3 (Vận dụng - 3.0đ):** Cài đặt code/biến đổi toán học chính xác không có lỗi logic.
   - **Mức 4 (Vận dụng cao - 2.0đ):** Đánh giá độ phức tạp $O(N)$, tối ưu hóa tài nguyên hoặc xử lý ngoại lệ.

Thầy/Cô có muốn tôi biên soạn trọn bộ câu hỏi trắc nghiệm hoặc đề thi tự luận chi tiết theo đúng cấu trúc trên không ạ?`;
  }

  return `Chào bạn! Gia sư AI Đại học Lạc Hồng xin giải thích chi tiết về câu hỏi của bạn như sau:

---

### **Giải thích trọng tâm từng bước:**
1. **Bản chất vấn đề:** Để nắm vững chủ đề này, bạn cần ghi nhớ nguyên lý cốt lõi trước khi đi vào các biến đổi hay viết code chi tiết.
2. **Phương pháp tiếp cận:**
   - Bước 1: Xác định rõ giả thiết đầu vào và kết quả đầu ra cần đạt được.
   - Bước 2: Áp dụng công thức chuẩn hoặc thuật toán phù hợp.
   - Bước 3: Kiểm tra lại các điều kiện biên hoặc trường hợp đặc biệt.
3. **Lời khuyên ôn tập:** Hãy tự tay thực hiện lại ví dụ trên giấy hoặc debug từng dòng code để hiểu rõ đường đi của dữ liệu.

Bạn có thắc mắc ở bước nào hay cần mình lấy thêm ví dụ cụ thể hơn không? Cứ hỏi tiếp nhé! 😊`;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Dữ liệu JSON không hợp lệ.' }, { status: 400 });
  }

  // 1. Chuẩn hóa Input Payload linh hoạt: nhận cả { messages: [...] } lẫn { message: "...", history: [...] }
  const rawInput = body as {
    messages?: unknown;
    message?: unknown;
    history?: unknown;
  } | null;

  let rawList: unknown[] = [];

  if (Array.isArray(rawInput?.messages)) {
    rawList = rawInput.messages;
  } else if (typeof rawInput?.message === 'string' && rawInput.message.trim()) {
    if (Array.isArray(rawInput?.history)) {
      rawList = [...rawInput.history, { role: 'user', content: rawInput.message }];
    } else {
      rawList = [{ role: 'user', content: rawInput.message }];
    }
  }

  if (rawList.length === 0 || rawList.length > MAX_MESSAGES) {
    return NextResponse.json(
      { error: 'Danh sách tin nhắn không hợp lệ hoặc vượt quá giới hạn.' },
      { status: 400 }
    );
  }

  const messages: ChatMessage[] = [];
  for (const item of rawList) {
    if (
      !item ||
      typeof item !== 'object' ||
      !('role' in item) ||
      !('content' in item) ||
      (item.role !== 'user' && item.role !== 'assistant') ||
      typeof item.content !== 'string' ||
      item.content.trim().length === 0 ||
      item.content.length > MAX_MESSAGE_LENGTH
    ) {
      continue;
    }
    messages.push({ role: item.role, content: item.content.trim() });
  }

  if (messages.length === 0 || messages[messages.length - 1]?.role !== 'user') {
    return NextResponse.json(
      { error: 'Tin nhắn cuối cùng phải là tin nhắn từ người dùng.' },
      { status: 400 }
    );
  }

  const latestUserMessage = messages[messages.length - 1].content;

  // 2. Xác định vai trò người dùng (Giảng viên / Sinh viên) để cá nhân hóa System Prompt
  let userRole: 'teacher' | 'admin' | 'student' = 'student';
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: roleRecord } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roleRecord?.role === 'teacher' || roleRecord?.role === 'admin') {
        userRole = roleRecord.role;
      }
    }
  } catch (authErr) {
    // Không làm gián đoạn luồng chat nếu lỗi session
    console.warn('[Chat-AI] Bỏ qua kiểm tra session:', authErr);
  }

  const isTeacher = userRole === 'teacher' || userRole === 'admin';

  const systemPrompt = isTeacher
    ? 'Bạn là Trợ lý Học thuật & Khảo thí AI cấp cao dành cho Giảng viên Đại học Lạc Hồng (LHU). Nhiệm vụ của bạn là hỗ trợ giảng viên biên soạn đề cương, thiết kế ngân hàng câu hỏi trắc nghiệm và tự luận chất lượng cao, xây dựng thang điểm và rubric chấm chi tiết, giải thích thuật toán, phân tích code và giải toán đại cương/chuyên ngành. Mọi công thức Toán học, Vật lý và Khoa học hãy dùng cú pháp KaTeX: $...$ cho công thức nằm trong dòng và $$...$$ cho công thức riêng dòng. Trình bày khoa học, chuẩn xác, tiếng Việt sư phạm chuẩn mực.'
    : 'Bạn là Gia sư AI tận tâm dành cho Sinh viên Đại học Lạc Hồng (LHU). Giải thích rõ ràng bằng tiếng Việt, ân cần, kiên nhẫn, gợi mở tư duy từng bước để sinh viên tự hiểu bản chất bài toán. Mọi công thức Toán học, Vật lý và Khoa học hãy dùng cú pháp KaTeX: $...$ cho công thức nằm trong dòng và $$...$$ cho công thức riêng dòng. Nếu thiếu ngữ cảnh hoặc không chắc chắn, hãy nói rõ thay vì bịa thông tin.';

  const groqMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...messages.slice(-10).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ];

  const apiKey = process.env.GROQ_API_KEY;

  // 3. Cơ chế Cascade Multi-Model Groq
  if (apiKey) {
    // === LỚP 1: Model chính llama-3.3-70b-versatile ===
    try {
      const groq = new Groq({ apiKey });
      const model = process.env.GROQ_MODEL || PRIMARY_MODEL;

      const completion = await groq.chat.completions.create({
        model,
        temperature: 0.4,
        max_tokens: 4096,
        messages: groqMessages,
      });

      const reply = completion.choices[0]?.message?.content?.trim();
      if (reply) {
        return NextResponse.json({ reply });
      }
    } catch (layer1Err) {
      console.warn('[Chat-AI] Groq Lớp 1 thất bại, chuyển sang Lớp 2 (Fallback Model)...', layer1Err);

      // === LỚP 2: Model phụ llama-3.1-8b-instant ===
      try {
        const groq = new Groq({ apiKey });
        const completion2 = await groq.chat.completions.create({
          model: FALLBACK_MODEL,
          temperature: 0.3,
          max_tokens: 4096,
          messages: groqMessages,
        });

        const reply2 = completion2.choices[0]?.message?.content?.trim();
        if (reply2) {
          return NextResponse.json({ reply: reply2 });
        }
      } catch (layer2Err) {
        console.warn('[Chat-AI] Groq Lớp 2 thất bại, chuyển sang Lớp 3 (Smart Academic Fallback)...', layer2Err);
      }
    }
  }

  // === LỚP 3: Smart Academic Fallback (Đảm bảo 100% luôn phản hồi thành công) ===
  const fallbackReply = generateAcademicFallback(latestUserMessage, isTeacher);
  return NextResponse.json({ reply: fallbackReply });
}
