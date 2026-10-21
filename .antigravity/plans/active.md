# KẾ HOẠCH TRIỂN KHAI: AI AUTO-BANK (SINH CÂU HỎI TỰ ĐỘNG BẰNG AI)

> **Trạng thái:** Completed  
> **Người thực hiện:** Antigravity AI  
> **Hoàn thành:** 2026-10-20  

---

## 1. MỤC TIÊU & PHẠM VI

Xây dựng tính năng **AI Auto-Bank** cho phép Giảng viên tạo nhanh các bộ câu hỏi trắc nghiệm và tự luận bằng Groq LLM:
1. **Form cấu hình sinh đề AI**: Chọn môn, chủ đề, loại câu hỏi, mức độ nhận thức (Nhận biết đến Vận dụng cao), số lượng (1-10 câu).
2. **Bộ tạo sinh AI (Groq API Service)**: Prompt khảo thí chuẩn mực, trả về JSON Schema nghiêm ngặt, tự động sinh công thức LaTeX `$..$` và `$$..$$`.
3. **Màn hình Duyệt & Chọn lọc (Staging & Review)**: Xem trước câu hỏi render bằng KaTeX, chọn/bỏ chọn, lưu hàng loạt vào database.
4. **Tích hợp KaTeX Math Renderer**: Render công thức toán học ma trận, phân số, ký hiệu đẹp mắt trên toàn bộ hệ thống.

---

## 2. KẾT QUẢ THỰC HIỆN

### Phase 1: KaTeX Renderer Component (`components/ui/math-text.tsx`)
- [x] Đã cài đặt `katex` và `@types/katex`.
- [x] Đã hoàn thành component [`MathText`](file:///c:/Users/lamho/Desktop/doantn/autobank-app/components/ui/math-text.tsx): Phân tách và render an toàn cả `$...$` (inline math) và `$$...$$` (block math/ma trận).
- [x] Áp dụng `MathText` vào [`components/teacher/question-manager.tsx`](file:///c:/Users/lamho/Desktop/doantn/autobank-app/components/teacher/question-manager.tsx) cho câu hỏi, 4 phương án A-B-C-D, đáp án mẫu tự luận và lời giải chi tiết.

### Phase 2: AI Generation Service & Server Actions
- [x] [`lib/ai-question-generator.ts`](file:///c:/Users/lamho/Desktop/doantn/autobank-app/lib/ai-question-generator.ts): Service kết nối Groq SDK với model `llama-3.3-70b-versatile` / JSON mode, tự động áp dụng ma trận độ khó khảo thí.
- [x] [`app/teacher/questions/ai-actions.ts`](file:///c:/Users/lamho/Desktop/doantn/autobank-app/app/teacher/questions/ai-actions.ts):
  - `generateAIQuestionsAction`: Kiểm tra quyền giảng viên, gọi Groq sinh bản nháp câu hỏi, ghi nhận audit log vào `public.ai_generation_jobs`.
  - `saveAIQuestionsBatchAction`: Lưu theo lô toàn bộ các câu hỏi được duyệt vào 3 bảng database (`question_bank`, `question_options`, `question_answer_keys`).

### Phase 3: Giao diện Modal AI Generator
- [x] [`components/teacher/ai-generator-modal.tsx`](file:///c:/Users/lamho/Desktop/doantn/autobank-app/components/teacher/ai-generator-modal.tsx):
  - Bước 1 (Thiết lập): Chọn môn, gõ chủ đề, chọn mức độ nhận thức, số lượng, có hiệu ứng loading khi AI đang tư duy.
  - Bước 2 (Duyệt kết quả): Hiển thị công thức toán KaTeX sống động, checkbox chọn/bỏ chọn câu hỏi, nút lưu batch 1-click.
- [x] Tích hợp nút **"✨ AI Sinh câu hỏi"** nổi bật trên thanh công cụ của trang Ngân hàng câu hỏi.

### Phase 4: Kiểm thử & Nghiệm thu
- [x] TypeScript compiler (`npx tsc --noEmit`): **Pass** (0 lỗi).
- [x] Production build (`next build`): **Pass** (Exit code 0).

---

## 3. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)
- [x] **AC-1**: Công thức LaTeX trong câu hỏi và lời giải được render KaTeX đẹp mắt (hết lỗi hiển thị chuỗi thô).
- [x] **AC-2**: Form AI Generator cho phép chọn môn học, nhập chủ đề, độ khó, số lượng câu.
- [x] **AC-3**: Groq API sinh ra đúng định dạng JSON câu hỏi trắc nghiệm và tự luận kèm đáp án chuẩn xác.
- [x] **AC-4**: Giảng viên có thể xem trước, tích chọn và lưu thành công các câu hỏi vào ngân hàng database.
- [x] **AC-5**: TypeScript và `next build` đạt 100% không lỗi.
