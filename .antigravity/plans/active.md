# KẾ HOẠCH TRIỂN KHAI: NGÂN HÀNG CÂU HỎI (QUESTION BANK)

> **Trạng thái:** Completed
> **Người thực hiện:** Antigravity AI
> **Hoàn thành:** 2026-10-20

---

## 1. MỤC TIÊU & PHẠM VI

Xây dựng phân hệ **Ngân hàng câu hỏi (Question Bank)** hoàn chỉnh cho Giảng viên (và Quản trị viên) tại route `/teacher/questions`, kết nối trực tiếp với 3 bảng cốt lõi trong Supabase:
* `public.question_bank`
* `public.question_options`
* `public.question_answer_keys`

---

## 2. KẾT QUẢ THỰC HIỆN

### Phase 1: Data Access & Server Actions (`lib/question-bank.ts`, `app/teacher/questions/actions.ts`)
- [x] Đã hoàn thành hàm `getTeacherQuestionsData`: Query đầy đủ câu hỏi, options, answer key, môn học được phân công, tính toán số liệu thống kê.
- [x] Đã hoàn thành Server Actions:
  - `createQuestion`: Hỗ trợ trắc nghiệm (options A-B-C-D + key) và tự luận (model answer + grading rubric).
  - `updateQuestion`: Cập nhật nội dung, đáp án và giải thích với kiểm tra quyền sở hữu.
  - `deleteQuestion`: Xóa câu hỏi (tự động cascade options & answer key).

### Phase 2: Giao diện Quản lý Ngân hàng câu hỏi
- [x] [`components/teacher/question-modal.tsx`](file:///c:/Users/lamho/Desktop/doantn/autobank-app/components/teacher/question-modal.tsx): Modal tạo & chỉnh sửa câu hỏi trực quan, chuyển đổi mượt mà giữa Trắc nghiệm và Tự luận.
- [x] [`components/teacher/question-manager.tsx`](file:///c:/Users/lamho/Desktop/doantn/autobank-app/components/teacher/question-manager.tsx): Thẻ chỉ số tổng quan, thanh tìm kiếm từ khóa, bộ lọc theo môn học, bộ lọc loại câu hỏi, danh sách thẻ câu hỏi hiển thị rõ đáp án đúng và giải thích.
- [x] [`app/teacher/questions/page.tsx`](file:///c:/Users/lamho/Desktop/doantn/autobank-app/app/teacher/questions/page.tsx): Trang hiển thị chuẩn SSR với Suspense.

### Phase 3: Điều hướng & Liên kết Hệ thống
- [x] [`components/teacher/teacher-sidebar.tsx`](file:///c:/Users/lamho/Desktop/doantn/autobank-app/components/teacher/teacher-sidebar.tsx): Thanh điều hướng sidebar chuẩn hóa dùng chung cho các màn hình giảng viên.
- [x] [`app/teacher/dashboard/page.tsx`](file:///c:/Users/lamho/Desktop/doantn/autobank-app/app/teacher/dashboard/page.tsx): Cập nhật liên kết nhanh và liên kết từ thẻ chỉ số "Câu hỏi trong kho" tới `/teacher/questions`.

### Phase 4: Kiểm thử & Nghiệm thu
- [x] TypeScript compiler (`npx tsc --noEmit`): **Pass** (0 error).
- [x] Production build (`next build`): **Pass** (Route `ƒ /teacher/questions` được biên dịch thành công).

---

## 3. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)
- [x] **AC-1**: Lập kế hoạch chi tiết trong `active.md` trước khi code.
- [x] **AC-2**: Tạo được câu hỏi trắc nghiệm lưu đủ dữ liệu vào `question_bank`, `question_options`, `question_answer_keys`.
- [x] **AC-3**: Tạo được câu hỏi tự luận lưu vào `question_bank`, `question_answer_keys`.
- [x] **AC-4**: Lọc và hiển thị danh sách câu hỏi chính xác theo môn học của giảng viên.
- [x] **AC-5**: Có thể chỉnh sửa hoặc xóa câu hỏi thành công.
- [x] **AC-6**: Build ứng dụng không phát sinh lỗi.
