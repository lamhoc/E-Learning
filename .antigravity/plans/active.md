# Kế hoạch triển khai E-Learning ("Mầm Học")

> **Trạng thái:** Phase 15 hoàn thành - Đã sửa lỗi Server Action chấm tự luận, bảo vệ toàn diện luồng lưu điểm và cập nhật kế hoạch.
> **Cập nhật:** 2026-10-24

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
- [x] **Phase 7 - Nhiệm vụ 2 (Commit `8613063` & `236cb38`)**: Màn hình Chấm thi Tự luận (`/teacher/grading/[attemptId]`)
  - `lib/teacher-grading.ts`: Server Data Fetching chi tiết bài thi, sinh viên, đáp án mẫu, rubric, bài làm học sinh, điểm trắc nghiệm tự động.
  - `components/teacher/essay-grading-client.tsx`: Split View chuẩn EdTech (cột trái: Đề bài + Đáp án mẫu KaTeX + Rubric; cột phải: Bài làm sinh viên + Form chấm điểm + Điểm nhanh 0%, 50%, 75%, 100% + Feedback).
  - Tích hợp `react-hook-form` + `zod` + `@hookform/resolvers/zod` validate điểm số và feedback.
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
  - Cập nhật navigation trong `app/admin/layout.tsx` liên kết tới trang quản lý sinh viên.
  - `app/admin/student-management/actions.ts`: Server Action `toggleStudentStatus(userId, isBlocked)` sử dụng `@supabase/supabase-js` service role (`createAdminClient`) cập nhật `ban_duration` và metadata, chặn quyền đăng nhập.
  - `components/admin/student-table-client.tsx`: Data Table Shadcn hiển thị danh sách sinh viên: Tên, Email, Mã sinh viên, Ngày tạo, Trạng thái (Hoạt động / Bị khóa) kèm Action menu (Khóa / Mở khóa) có tìm kiếm và bộ lọc.
  - `app/admin/student-management/page.tsx`: Server Component truy vấn dữ liệu sinh viên từ Supabase Admin & DB profiles.
- [x] **Phase 10: Thống kê & Xuất điểm thi cho Giảng viên (`/teacher/exams/[examId]`)**:
  - `lib/teacher-exam-analytics.ts`: Server-side data fetching & transform logic tính toán điểm trắc nghiệm, điểm tự luận, tổng điểm, phân bố phổ điểm 5 khoảng (0-2, 3-4, 5-6, 7-8, 9-10).
  - `components/teacher/exam-score-chart.tsx`: Biểu đồ phổ điểm Recharts (`BarChart`) hiển thị phân bố điểm số sinh viên.
  - `components/teacher/exam-analytics-client.tsx`: Giao diện Tabs (Biểu đồ phổ điểm & Bảng điểm chi tiết) tích hợp xuất file `.csv` UTF-8 BOM qua `papaparse`.
  - `app/teacher/exams/[examId]/page.tsx`: Server Component cho route thống kê đề thi bọc trong `TeacherSidebar`.
- [x] **Phase 11: Cơ chế Phát hiện Chuyển Tab & Giám sát Phòng thi Trực tuyến (`/student/exams/[examId]`)**:
  - `hooks/use-tab-switch-detection.ts`: React Hook lắng nghe sự kiện `visibilitychange` và `blur` với cơ chế chống kích hoạt kép (debounce window 1500ms), quản lý state vi phạm `tabSwitchCount`, tự động kích hoạt callback `onAutoSubmit` khi vượt ngưỡng tối đa (mặc định 3 lần).
  - `components/ui/alert-dialog.tsx`: Hộp thoại Alert Dialog chuẩn Shadcn (AlertDialog, Content, Header, Title, Description, Footer, Action) với lớp nền mờ và hiệu ứng mượt mà.
  - `components/student/exam-taking-client.tsx`: Tích hợp hook giám sát vào phòng thi sinh viên, hiển thị huy hiệu cảnh báo vi phạm trên thanh công cụ và bật Alert Dialog cảnh báo / đình chỉ thi.
  - `app/student/exams/[examId]/actions.ts`: Bổ sung Server Action `logExamTabViolationAction` ghi log vi phạm vào bảng phụ `exam_proctoring_logs` và dự phòng `notifications`.
  - `supabase/migrations/20261024_exam_proctoring_logs.sql`: File migration tạo bảng `exam_proctoring_logs` kèm chỉ mục và chính sách RLS an toàn.
  - `lib/teacher-grading.ts` & `components/teacher/essay-grading-client.tsx`: Bổ sung dữ liệu vi phạm vào trang chấm bài của giáo viên kèm Banner cảnh báo nếu thí sinh đã rời tab làm bài.
- [x] **Phase 12: Hệ thống Thông báo Thời gian thực (Realtime Notifications via Supabase Channels)**:
  - `hooks/use-realtime-notifications.ts`: Custom Hook kết nối Supabase channel lắng nghe sự kiện `INSERT` trên bảng `notifications` lọc theo `user_id`, tự động tăng số lượng badge chưa đọc, kích hoạt Toast popup và dọn dẹp (unsubscribe) khi unmount.
  - `components/layout/notification-bell.tsx`: Chuông thông báo (Bell icon) với Badge đếm unreadCount, Dropdown Popover cuộn danh sách thông báo, nút đánh dấu tất cả đã đọc, và Floating Toast popup góc màn hình.
  - `components/layout/header.tsx`: Header component chung tích hợp sẵn `NotificationBell`, avatar người dùng và điều hướng.
  - `app/student/dashboard/page.tsx` & `app/teacher/dashboard/page.tsx`: Tích hợp trực tiếp `NotificationBell` vào thanh Header.
  - `supabase/migrations/20261024_enable_notifications_realtime.sql`: File migration kích hoạt publication Supabase Realtime trên bảng `notifications`.
- [x] **Phase 13: Upload và Quản lý Tài liệu Học tập cho Lớp học (`/teacher/classes/[classId]/materials`)**:
  - `supabase/migrations/20261024_class_materials_and_storage.sql`: Schema bảng `class_materials` lưu URL, tên file, dung lượng, tuần học, kèm Storage bucket `course_materials` và policies RLS.
  - `lib/class-materials.ts`: Types và utilities fetch/transform tài liệu gom nhóm theo Tuần học.
  - `app/teacher/classes/[classId]/materials/actions.ts`: Server Actions `uploadClassMaterialAction` và `deleteClassMaterialAction` upload lên Supabase Storage và lưu vào CSDL.
  - `components/teacher/class-material-upload-form.tsx`: Component form upload file (PDF, DOCX) hoặc dán link Video bài giảng phân loại theo tuần học.
  - `components/teacher/class-material-list.tsx`: Component danh sách tài liệu theo tuần học với filter, xem/tải về và xóa.
  - `app/teacher/classes/[classId]/materials/page.tsx`: Server Component cho route quản lý tài liệu của giáo viên.
  - `components/student/student-class-materials.tsx`: Component phía sinh viên hiển thị kho tài liệu theo lớp và tuần học kèm tính năng tải về.
  - `app/student/dashboard/page.tsx` & `components/student/student-sidebar.tsx`: Bổ sung khu vực/tab "Tài liệu" trên Dashboard sinh viên.
- [x] **Phase 14 (Commit `c5e52e0` - Đã Push `origin/main`)**: Quản lý Chấm thi Tập trung & Entry Points cho Giảng viên:
  - `components/teacher/teacher-sidebar.tsx`: Thêm mục điều hướng "Chấm bài thi" (`/teacher/grading`) với icon `FileCheck`.
  - `app/teacher/dashboard/page.tsx`: Thêm Quick Action "Chấm bài thi", Metric card "Bài chờ chấm", nút truy cập trên Hero Header và bảng "Bài thi chờ chấm tự luận" trực tiếp trên Dashboard.
  - `lib/teacher-dashboard.ts`: Mở rộng `getTeacherDashboardData()` truy vấn `pendingAttempts` bài thi tự luận chờ chấm.
  - `lib/teacher-grading.ts`: Viết hàm `getTeacherGradingQueue()` phân loại bài thi `pending_grading` và `completed`.
  - `app/teacher/grading/page.tsx` & `components/teacher/grading-queue-client.tsx`: Trang quản lý chấm thi 2 tab "Chờ chấm điểm" và "Đã chấm xong" kèm tìm kiếm và xem cảnh báo gian lận tab-switch.

---

## Phase 15: Sửa lỗi Server Action Chấm thi Tự luận & Hoàn thiện Luồng Lưu Điểm / Công bố Kết quả

### Bối cảnh & Hiện tượng lỗi (Bug Description)
* Khi giáo viên truy cập màn hình chấm tự luận `/teacher/grading/[attemptId]` và nhấn nút **"Lưu tạm điểm"** hoặc **"Chốt điểm & Công bố kết quả"**, giao diện xuất hiện thanh thông báo màu đỏ:
  `"Đã có lỗi bất ngờ xảy ra khi lưu điểm."`

### Nguyên nhân gốc rễ (Root Cause Analysis)
1. **Khối bắt lỗi ngoài ý muốn**: Trong `app/teacher/grading/[attemptId]/actions.ts`, toàn bộ phần khởi tạo kiểm tra đăng nhập, `user_roles`, `createAdminClient()`, và truy vấn `exams`/`exam_questions` (dòng 44-105) nằm NGOÀI khối `try/catch`. Khi client admin thiếu cấu hình hoặc gặp ngoại lệ ngoài ý muốn, lỗi unhandled bị Next.js che giấu và ném sang phía client.
2. **Che giấu lỗi ở Client**: Tại `components/teacher/essay-grading-client.tsx`, khối `catch { ... }` không nhận tham số lỗi `(err)` mà chỉ gán cứng thông báo `'Đã có lỗi bất ngờ xảy ra khi lưu điểm.'`, khiến người dùng và lập trình viên không nhìn thấy chi tiết lỗi thực sự.
3. **Nguy cơ ghi đè câu trả lời tự luận**: Thao tác `adminClient.from('student_answers').upsert(...)` thiếu trường `answer_text` có thể làm trắng nội dung bài làm tự luận của sinh viên đã nộp.
4. **Lỗi tính tổng điểm bài thi**: Khi chấm câu tự luận, hàm chỉ tính tổng điểm từ `student_answer_grades` mà bỏ qua điểm trắc nghiệm (vốn được chấm tự động từ `student_answers` so với `exam_answer_keys`), dẫn đến `total_score` bị tính sai (chỉ ra điểm tự luận mà mất điểm trắc nghiệm).
5. **Cơ chế Fallback Client**: Nếu môi trường runtime chưa nạp kịp `SUPABASE_SERVICE_ROLE_KEY`, `createAdminClient()` sẽ ném lỗi runtime. Cần cơ chế fallback linh hoạt sang client phiên xác thực của giáo viên `createClient()`.

### Các bước thực thi & Khắc phục (Action Plan)
- [x] **Bước 1**: Tái cấu trúc `app/teacher/grading/[attemptId]/actions.ts`:
  - Bọc toàn bộ logic trong `try / catch`.
  - Thêm hàm trợ lực `getDbClient(supabase)` linh hoạt dùng `createAdminClient()` hoặc fallback sang `supabase`.
  - Sửa thao tác với `student_answers`: Chỉ insert bản ghi mới nếu câu trả lời chưa tồn tại, tuyệt đối không ghi đè `answer_text`.
  - Tính toán tổng điểm chính xác: `mcAwardedScore` (trắc nghiệm) + `essayScore` (tự luận).
  - Cập nhật an toàn vào `attempt_results`, `exam_attempts` và gửi `notifications`.
  - Bọc `revalidatePath` trong `try/catch` bảo vệ.
- [x] **Bước 2**: Nâng cấp `components/teacher/essay-grading-client.tsx`:
  - Kiểm tra `res && res.status === 'success'` trước khi xử lý.
  - Hiển thị thông điệp lỗi chính xác từ `res.message` hoặc `err.message`.
  - Tránh lỗi NaN khi giá trị điểm bị bỏ trống trong input.
- [x] **Bước 3**: Kiểm tra & Xác minh:
  - Chạy `npx tsc --noEmit` đạt 0 lỗi.
  - Chạy `npm run build` đạt 0 lỗi.
- [x] **Bước 4**: Tạo commit cục bộ và báo cáo kết quả chi tiết.
