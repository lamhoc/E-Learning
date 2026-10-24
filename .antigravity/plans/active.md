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
- [x] **Phase 7 - Nhiệm vụ 3 (Commit `d776fa0`)**: Gia sư AI Chữa đề (AI Exam Tutor) với Groq SDK (`openai/gpt-oss-120b`)
  - `lib/ai-exam-tutor.ts`: Kiểm tra quyền lượt thi, kết quả đã công bố (`released_at`), tổng hợp RAG context câu sai, đáp án mẫu, rubric và feedback.
  - `app/api/student/exam-tutor/route.ts`: API Route Handler khởi tạo session hội thoại `ai_tutor_conversations`, lưu tin nhắn `ai_tutor_messages`, streaming phản hồi qua Groq SDK.
  - `components/student/exam-tutor-drawer.tsx`: Drawer Chat tương tác, MathText KaTeX chuẩn công thức toán `$..$` / `$$..$$`, hỗ trợ cả nút bảng điểm và Banner nổi bật.
  - `app/student/exams/[examId]/page.tsx`: Banner thông minh Gia sư AI và nút kích hoạt theo từng lượt thi đã công bố.
- [x] **Phase 8: Trang Quản trị Duy nhất dành cho Role Admin (`/admin/teacher-access`)**:
  - `app/admin/layout.tsx`: Layout bảo vệ nghiêm ngặt kiểm tra `user.app_metadata.role === 'admin'` và đồng bộ bảng `user_roles`.
  - `components/ui/tabs.tsx`: Component Tabs chuẩn Shadcn (Base UI Nova) hỗ trợ chuyển đổi tab linh hoạt.
  - `app/admin/teacher-access/page.tsx`: Giao diện 2 Tabs ("Duyệt hồ sơ" & "Phân công môn học") kèm số liệu thống kê.
  - `app/admin/teacher-access/actions.ts`: Server Actions `approveTeacher` (Supabase Admin update user metadata & user_roles & teacher_applications), `rejectTeacher`, `assignSubject`, `unassignSubject`.
  - `app/admin/teacher-access/teacher-subject-manager.tsx`: Trình quản lý giáo viên & click chọn gán/hủy môn học tức thì.
- [x] **Phase 9: Quản lý Tài khoản Sinh viên cho Admin (`/admin/student-management`)**:
  - [x] Cập nhật navigation trong `app/admin/layout.tsx` liên kết tới trang quản lý sinh viên.
  - [x] `app/admin/student-management/actions.ts`: Server Action `toggleStudentStatus(userId, isBlocked)` sử dụng `@supabase/supabase-js` service role (`createAdminClient`) cập nhật `ban_duration` và metadata, chặn quyền đăng nhập.
  - [x] `components/admin/student-table-client.tsx`: Data Table Shadcn hiển thị danh sách sinh viên: Tên, Email, Mã sinh viên, Ngày tạo, Trạng thái (Hoạt động / Bị khóa) kèm Action menu (Khóa / Mở khóa) có tìm kiếm và bộ lọc.
  - [x] `app/admin/student-management/page.tsx`: Server Component truy vấn dữ liệu sinh viên từ Supabase Admin & DB profiles.
  - [x] Nghiệm thu tĩnh: `npx tsc --noEmit` & `npm run build` pass 100%.
- [x] **Phase 10: Thống kê & Xuất điểm thi cho Giảng viên (`/teacher/exams/[examId]`)**:
  - [x] `lib/teacher-exam-analytics.ts`: Server-side data fetching & transform logic tính toán điểm trắc nghiệm, điểm tự luận, tổng điểm, phân bố phổ điểm 5 khoảng (0-2, 3-4, 5-6, 7-8, 9-10).
  - [x] `components/teacher/exam-score-chart.tsx`: Biểu đồ phổ điểm Recharts (`BarChart`) hiển thị phân bố điểm số sinh viên.
  - [x] `components/teacher/exam-analytics-client.tsx`: Giao diện Tabs (Biểu đồ phổ điểm & Bảng điểm chi tiết) tích hợp xuất file `.csv` UTF-8 BOM qua `papaparse`.
  - [x] `app/teacher/exams/[examId]/page.tsx`: Server Component cho route thống kê đề thi bọc trong `TeacherSidebar`.
  - [x] `app/teacher/dashboard/page.tsx`: Thêm liên kết từ bảng đề thi tới trang `/teacher/exams/[examId]`.
  - [x] Nghiệm thu tĩnh: `npx tsc --noEmit` & `npm run build` pass 100%.
  - [x] Push code lên GitHub sau khi hoàn thành theo yêu cầu của user.
- [x] **Phase 11: Cơ chế Phát hiện Chuyển Tab & Giám sát Phòng thi Trực tuyến (`/student/exams/[examId]`)**:
  - [x] `hooks/use-tab-switch-detection.ts`: React Hook lắng nghe sự kiện `visibilitychange` và `blur` với cơ chế chống kích hoạt kép (debounce window 1500ms), quản lý state vi phạm `tabSwitchCount`, tự động kích hoạt callback `onAutoSubmit` khi vượt ngưỡng tối đa (mặc định 3 lần).
  - [x] `components/ui/alert-dialog.tsx`: Hộp thoại Alert Dialog chuẩn Shadcn (AlertDialog, Content, Header, Title, Description, Footer, Action) với lớp nền mờ và hiệu ứng mượt mà.
  - [x] `components/student/exam-taking-client.tsx`: Tích hợp hook giám sát vào phòng thi sinh viên, hiển thị huy hiệu cảnh báo vi phạm trên thanh công cụ và bật Alert Dialog cảnh báo / đình chỉ thi.
  - [x] `app/student/exams/[examId]/actions.ts`: Bổ sung Server Action `logExamTabViolationAction` ghi log vi phạm vào bảng phụ `exam_proctoring_logs` và dự phòng `notifications`.
  - [x] `supabase/migrations/20261024_exam_proctoring_logs.sql`: File migration tạo bảng `exam_proctoring_logs` kèm chỉ mục và chính sách RLS an toàn.
  - [x] `lib/teacher-grading.ts` & `components/teacher/essay-grading-client.tsx`: Bổ sung dữ liệu vi phạm vào trang chấm bài của giáo viên kèm Banner cảnh báo nếu thí sinh đã rời tab làm bài.
  - [x] Nghiệm thu tĩnh: `npx tsc --noEmit` & `npm run build` pass 100%.
- [x] **Phase 12: Hệ thống Thông báo Thời gian thực (Realtime Notifications via Supabase Channels)**:
  - [x] `hooks/use-realtime-notifications.ts`: Custom Hook kết nối Supabase channel lắng nghe sự kiện `INSERT` trên bảng `notifications` lọc theo `user_id`, tự động tăng số lượng badge chưa đọc, kích hoạt Toast popup và dọn dẹp (unsubscribe) khi unmount.
  - [x] `components/layout/notification-bell.tsx`: Chuông thông báo (Bell icon) với Badge đếm unreadCount, Dropdown Popover cuộn danh sách thông báo, nút đánh dấu tất cả đã đọc, và Floating Toast popup góc màn hình.
  - [x] `components/layout/header.tsx`: Header component chung tích hợp sẵn `NotificationBell`, avatar người dùng và điều hướng.
  - [x] `app/student/dashboard/page.tsx` & `app/teacher/dashboard/page.tsx`: Tích hợp trực tiếp `NotificationBell` vào thanh Header.
  - [x] `supabase/migrations/20261024_enable_notifications_realtime.sql`: File migration kích hoạt publication Supabase Realtime trên bảng `notifications`.
  - [x] Nghiệm thu tĩnh: `npx tsc --noEmit` & `npm run build` pass 100%.

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
