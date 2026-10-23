# Kế hoạch triển khai E-Learning ("Mầm Học")

> **Trạng thái:** Nhiệm vụ 3 đã triển khai và build/type-check thành công; runtime smoke test chờ cấu hình Supabase và Groq.
> **Cập nhật:** 2026-10-23

## Trạng thái đã hoàn thành & Đã Push lên Remote (`main`)

- [x] **Phase 1 (Commit `70ef6a7`)**: Chuyển AI Chat sang `/chat`, xây mới Landing Page phong cách EdTech hiện đại.
- [x] **Phase 2 (Commit `e3dc635`)**: Redesign Login page Split Layout (Brand panel + Form panel).
- [x] **Phase 3 (Commit `dad1cad`)**: Redesign Teacher Dashboard Bento Grid + 6 Quick Actions + Metric Cards + Charts.
- [x] **Student Dashboard & Phân quyền (Commit `b1b36a8`)**: 
  - Tạo `lib/student-dashboard.ts` truy vấn dữ liệu học tập.
  - Tạo `components/student/student-sidebar.tsx`.
  - Tạo `app/student/dashboard/page.tsx` hoàn chỉnh.
  - Sửa lỗi TypeScript tại `app/subjects/page.tsx`, build pass.
- [x] **Phase 4 & 5: Question Bank Refinement & AI Generator Inline Editing (Commit `c756b2a`)**:
  - Bộ lọc đa chiều, KaTeX, nút Copy câu hỏi, Exam Preview Modal & In đề.
  - Modal AI Generator có tiến trình trực quan và Inline Editor trước khi lưu.
- [x] **Phase 6: Student Exam Flow (Commit `c756b2a`)**:
  - Giao diện làm bài thi `/student/exams/[examId]`: Timer đếm ngược, tự động nộp bài khi hết giờ, Palette câu hỏi, KaTeX, auto-save, auto-grading trắc nghiệm.
- [x] **Phase 7 - Nhiệm vụ 1 (Commit `e989f76`)**: Màn hình Tạo Đề Thi cho Giáo viên (`/teacher/exams/create`)
  - Form cấu hình đề, gán lớp, chọn câu hỏi ngân hàng, KaTeX, chia đều 10 điểm, Server Action snapshot & `publish_exam`.
- [x] **Phase 7 - Nhiệm vụ 2 (Commit `8613063`)**: Màn hình Chấm thi Tự luận (`/teacher/grading/[attemptId]`)
  - `lib/teacher-grading.ts`: Server Data Fetching chi tiết bài thi, sinh viên, đáp án mẫu, rubric, bài làm học sinh, điểm trắc nghiệm tự động.
  - `components/teacher/essay-grading-client.tsx`: Split View chuẩn EdTech (cột trái: Đề bài + Đáp án mẫu KaTeX + Rubric; cột phải: Bài làm sinh viên + Form chấm điểm + Điểm nhanh 0%, 50%, 75%, 100% + Feedback).
  - `app/teacher/grading/[attemptId]/actions.ts`: Server Action `saveEssayGradesAction` tính tổng điểm, cập nhật `student_answer_grades`, `attempt_results.released_at`, `exam_attempts.status = 'completed'` và gửi `notifications` cho học sinh.
  - `app/teacher/grading/[attemptId]/page.tsx`: Server Component bọc Layout chuẩn `TeacherSidebar`.
- [x] **Phase 7 - Nhiệm vụ 3: Gia sư AI Chữa đề (AI Exam Tutor) với Groq SDK (`openai/gpt-oss-120b`)**:
  - `lib/ai-exam-tutor.ts`: Kiểm tra quyền lượt thi, kết quả đã công bố (`released_at`), tổng hợp RAG context câu sai, đáp án mẫu, rubric và feedback.
  - `app/api/student/exam-tutor/route.ts`: API Route Handler khởi tạo session hội thoại `ai_tutor_conversations`, lưu tin nhắn `ai_tutor_messages`, streaming phản hồi qua Groq SDK.
  - `components/student/exam-tutor-drawer.tsx`: Drawer Chat tương tác, MathText KaTeX chuẩn công thức toán `$..$` / `$$..$$`, hỗ trợ cả nút bảng điểm và Banner nổi bật.
  - `app/student/exams/[examId]/page.tsx`: Banner thông minh Gia sư AI và nút kích hoạt theo từng lượt thi đã công bố.

---

## Phase 7: Hoàn Thiện Chu Trình Khảo Thí & Chữa Đề AI

### Nhiệm vụ 1: Màn hình Tạo Đề Thi cho Giáo viên (`/teacher/exams/create`) ✅ ĐÃ HOÀN THÀNH

### Nhiệm vụ 2: Màn hình Chấm thi Tự luận cho Giảng viên (`/teacher/grading/[attemptId]`) ✅ ĐÃ HOÀN THÀNH

### Nhiệm vụ 3: Tích hợp Gia sư AI Chữa đề (AI Exam Tutor) ✅ ĐÃ TRIỂN KHAI
- Nút "Hỏi gia sư AI về bài thi này" trên trang kết quả thi của sinh viên.
- Nạp ngữ cảnh (câu sai, đáp án đúng) kết nối với Groq SDK.
- Ghi log hội thoại vào bảng `ai_tutor_conversations` và `ai_tutor_messages`.
- [x] Thêm API Route xác thực quyền sở hữu lượt thi/kết quả đã công bố, khởi tạo hội thoại theo `attempt_id`, lưu tin nhắn và stream Groq.
- [x] Tạo drawer chat trên trang lịch sử/kết quả thi, render câu trả lời bằng KaTeX và thêm trạng thái lỗi/loading.
- [x] Chỉ truy vấn đáp án chuẩn phía server bằng service-role client; không gửi answer key thô xuống trình duyệt.
- [x] Xác minh bằng `npx tsc --noEmit`, `npm run build` và lint các file mới; không thay đổi schema.
- [ ] Runtime smoke test: chưa có `.env.local`/biến môi trường Supabase và Groq trong workspace.

---

## Kết quả nghiệm thu tĩnh
- `npx tsc --noEmit`: Exit code 0 (Pass 100%).
- `npm run build`: Exit code 0; route `/api/student/exam-tutor` đã được biên dịch.
- ESLint trên các file triển khai mới: Exit code 0.
