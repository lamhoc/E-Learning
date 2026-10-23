# Kế hoạch triển khai E-Learning ("Mầm Học")

> **Trạng thái:** Complete — Đã hoàn thành toàn bộ 4 đầu việc trong Roadmap và build production thành công 100%.
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
  - Đã push thành công lên GitHub `origin/main`.

---

## Các Phase Đã Hoàn Thành Trong Phiên Này

### 1. Phase 4: Question Bank Refinement (`/teacher/questions`) ✅
- **Bộ lọc đa chiều nâng cao**:
  - Lọc theo môn học được phân công.
  - Lọc theo loại câu hỏi: Tất cả / Trắc nghiệm / Tự luận.
  - Lọc theo trạng thái lời giải: Tất cả / Đã có lời giải chi tiết / Chưa có lời giải.
  - Tìm kiếm toàn văn theo từ khóa câu hỏi, mã môn, tên môn học.
- **Card câu hỏi & Tiện ích thao tác**:
  - Hỗ trợ công thức Toán/Lý qua `MathText` (KaTeX) cho câu hỏi, đáp án, đáp án mẫu, rubric và giải thích.
  - Thêm nút "Sao chép" (Copy câu hỏi & đáp án vào clipboard nhanh chóng).
- **Tính năng "Xem trước đề thi" (Exam Preview Modal)**:
  - Cho phép giáo viên xem toàn bộ danh sách câu hỏi đã lọc dưới dạng đề thi học phần chuẩn.
  - Có nút chuyển đổi "Ẩn/Hiện đáp án & hướng dẫn chấm".
  - Nút in đề thi (`window.print()`) định dạng trang giấy A4 sạch đẹp.

### 2. Phase 5: Cải tiến Modal Sinh câu hỏi bằng AI (`components/teacher/ai-generator-modal.tsx`) ✅
- **UX Loading trực quan**:
  - Hiển thị tiến trình qua 4 nấc rõ ràng: Kết nối Groq -> Soạn câu hỏi chuẩn KaTeX -> Biên soạn phương án nhiễu & đáp án -> Chuẩn hóa dữ liệu.
  - Thanh tiến trình động mượt mà.
- **Tính năng Chỉnh sửa trực tiếp trước khi lưu (Inline Editor)**:
  - Nút "Sửa" và "Xóa" trên từng thẻ câu hỏi do AI sinh ra.
  - Form chỉnh sửa trực quan: sửa đề bài, sửa từng phương án A, B, C, D, đổi đáp án đúng chỉ bằng 1 click.
  - Sửa đáp án mẫu tự luận, thang điểm chấm và giải thích.
  - Lưu vào ngân hàng câu hỏi chính xác theo nội dung giáo viên đã duyệt.

### 3. Student Exam Flow (`/student/exams/[examId]`) ✅
- **Xác thực và Kiểm soát quy chế thi**:
  - Tạo `lib/student-exam.ts` truy vấn dữ liệu đề thi, câu hỏi và lịch sử làm bài.
  - Tạo `app/student/exams/[examId]/actions.ts` dùng `createAdminClient()` tuân thủ nghiêm ngặt RLS:
    + `startOrResumeExamAttempt`: Khởi tạo hoặc tiếp tục lượt thi chưa hết giờ, giới hạn theo `max_attempts` và khung giờ mở đề.
    + `saveStudentAnswerAction`: Tự động lưu đáp án (`student_answers`).
    + `submitExamAttemptAction`: Nộp bài, chấm điểm trắc nghiệm tự động, tạo bản ghi `attempt_results` hoặc ghi nhận chờ chấm tự luận, gửi thông báo `notifications`.
- **Giao diện làm bài chuyên nghiệp (`components/student/exam-taking-client.tsx`)**:
  - **Đồng hồ đếm ngược (Countdown Timer)**: Báo động đổi màu khi còn < 5 phút, tự động nộp bài khi hết giờ.
  - **Question Palette Navigator**: Mục lục điều hướng câu hỏi trực quan, click scroll mượt tới câu hỏi, nhận biết câu đã làm / chưa làm.
  - Render câu hỏi trắc nghiệm & tự luận sắc nét với `MathText` (KaTeX).
  - Tự động lưu đáp án khi chọn trắc nghiệm hoặc blur bài giải tự luận.
  - Hộp thoại xác nhận trước khi nộp bài.
- **Trang thi & Kết quả (`app/student/exams/[examId]/page.tsx`)**:
  - Màn hình trước thi: Hướng dẫn và quy chế, nút "Bắt đầu làm bài thi".
  - Màn hình sau thi: Bảng tổng kết kết quả, điểm số, trạng thái chấm, lịch sử các lần làm bài trước.
  - Kích hoạt nút "Vào làm bài" trên Student Dashboard (`app/student/dashboard/page.tsx`).

---

## Kết quả nghiệm thu tĩnh
- `npx tsc --noEmit`: Exit code 0 (Không lỗi TypeScript).
- `npm run build`: Exit code 0, 18/18 routes biên dịch thành công (kèm route mới `/student/exams/[examId]`).
