# Kế hoạch triển khai E-Learning ("Mầm Học")

> **Trạng thái:** Phase 16 hoàn thành - Đã xử lý triệt để Minified React Error #441 trong luồng chấm thi tự luận, bổ sung fallback Supabase client an toàn và migration quyền RLS.
> **Cập nhật:** 2026-10-24

## Trạng thái đã hoàn thành & Lịch sử Commit (`main`)

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
- [x] **Phase 8 (Commit `9ee0af6`)**: Trang Quản trị Duy nhất dành cho Role Admin (`/admin/teacher-access`)
  - `app/admin/layout.tsx`: Layout bảo vệ nghiêm ngặt kiểm tra `user.app_metadata.role === 'admin'` và đồng bộ bảng `user_roles`.
  - `components/ui/tabs.tsx`: Component Tabs chuẩn Shadcn (Base UI Nova) hỗ trợ chuyển đổi tab linh hoạt.
  - `app/admin/teacher-access/page.tsx`: Giao diện 2 Tabs ("Duyệt hồ sơ" & "Phân công môn học") kèm số liệu thống kê.
  - `app/admin/teacher-access/actions.ts`: Server Actions `approveTeacher` (Supabase Admin update user metadata & user_roles & teacher_applications), `rejectTeacher`, `assignSubject`, `unassignSubject`.
  - `app/admin/teacher-access/teacher-subject-manager.tsx`: Trình quản lý giáo viên & click chọn gán/hủy môn học tức thì.
- [x] **Phase 9 (Commit `0ea2a37`)**: Quản lý Tài khoản Sinh viên cho Admin (`/admin/student-management`)
  - Cập nhật navigation trong `app/admin/layout.tsx` liên kết tới trang quản lý sinh viên.
  - `app/admin/student-management/actions.ts`: Server Action `toggleStudentStatus(userId, isBlocked)` sử dụng `@supabase/supabase-js` service role (`createAdminClient`) cập nhật `ban_duration` và metadata, chặn quyền đăng nhập.
  - `components/admin/student-table-client.tsx`: Data Table Shadcn hiển thị danh sách sinh viên: Tên, Email, Mã sinh viên, Ngày tạo, Trạng thái (Hoạt động / Bị khóa) kèm Action menu (Khóa / Mở khóa) có tìm kiếm và bộ lọc.
  - `app/admin/student-management/page.tsx`: Server Component truy vấn dữ liệu sinh viên từ Supabase Admin & DB profiles.
- [x] **Phase 10 (Commit `d11ba70`)**: Thống kê & Xuất điểm thi cho Giảng viên (`/teacher/exams/[examId]`)
  - `lib/teacher-exam-analytics.ts`: Server-side data fetching & transform logic tính toán điểm trắc nghiệm, điểm tự luận, tổng điểm, phân bố phổ điểm 5 khoảng (0-2, 3-4, 5-6, 7-8, 9-10).
  - `components/teacher/exam-score-chart.tsx`: Biểu đồ phổ điểm Recharts (`BarChart`) hiển thị phân bố điểm số sinh viên.
  - `components/teacher/exam-analytics-client.tsx`: Giao diện Tabs (Biểu đồ phổ điểm & Bảng điểm chi tiết) tích hợp xuất file `.csv` UTF-8 BOM qua `papaparse`.
  - `app/teacher/exams/[examId]/page.tsx`: Server Component cho route thống kê đề thi bọc trong `TeacherSidebar`.
- [x] **Phase 11 (Commit `4dbd63a`)**: Cơ chế Phát hiện Chuyển Tab & Giám sát Phòng thi Trực tuyến (`/student/exams/[examId]`)
  - `hooks/use-tab-switch-detection.ts`: React Hook lắng nghe sự kiện `visibilitychange` và `blur` với cơ chế chống kích hoạt kép (debounce window 1500ms), quản lý state vi phạm `tabSwitchCount`, tự động kích hoạt callback `onAutoSubmit` khi vượt ngưỡng tối đa (mặc định 3 lần).
  - `components/ui/alert-dialog.tsx`: Hộp thoại Alert Dialog chuẩn Shadcn (AlertDialog, Content, Header, Title, Description, Footer, Action) với lớp nền mờ và hiệu ứng mượt mà.
  - `components/student/exam-taking-client.tsx`: Tích hợp hook giám sát vào phòng thi sinh viên, hiển thị huy hiệu cảnh báo vi phạm trên thanh công cụ và bật Alert Dialog cảnh báo / đình chỉ thi.
  - `app/student/exams/[examId]/actions.ts`: Bổ sung Server Action `logExamTabViolationAction` ghi log vi phạm vào bảng phụ `exam_proctoring_logs` và dự phòng `notifications`.
  - `supabase/migrations/20261024_exam_proctoring_logs.sql`: File migration tạo bảng `exam_proctoring_logs` kèm chỉ mục và chính sách RLS an toàn.
  - `lib/teacher-grading.ts` & `components/teacher/essay-grading-client.tsx`: Bổ sung dữ liệu vi phạm vào trang chấm bài của giáo viên kèm Banner cảnh báo nếu thí sinh đã rời tab làm bài.
- [x] **Phase 12 (Commit `75f4726`)**: Hệ thống Thông báo Thời gian thực (Realtime Notifications via Supabase Channels)
  - `hooks/use-realtime-notifications.ts`: Custom Hook kết nối Supabase channel lắng nghe sự kiện `INSERT` trên bảng `notifications` lọc theo `user_id`, tự động tăng số lượng badge chưa đọc, kích hoạt Toast popup và dọn dẹp (unsubscribe) khi unmount.
  - `components/layout/notification-bell.tsx`: Chuông thông báo (Bell icon) với Badge đếm unreadCount, Dropdown Popover cuộn danh sách thông báo, nút đánh dấu tất cả đã đọc, và Floating Toast popup góc màn hình.
  - `components/layout/header.tsx`: Header component chung tích hợp sẵn `NotificationBell`, avatar người dùng và điều hướng.
  - `app/student/dashboard/page.tsx` & `app/teacher/dashboard/page.tsx`: Tích hợp trực tiếp `NotificationBell` vào thanh Header.
  - `supabase/migrations/20261024_enable_notifications_realtime.sql`: File migration kích hoạt publication Supabase Realtime trên bảng `notifications`.
- [x] **Phase 13 (Commit `3cd1aab`)**: Upload và Quản lý Tài liệu Học tập cho Lớp học (`/teacher/classes/[classId]/materials`)
  - `supabase/migrations/20261024_class_materials_and_storage.sql`: Schema bảng `class_materials` lưu URL, tên file, dung lượng, tuần học, kèm Storage bucket `course_materials` và policies RLS.
  - `lib/class-materials.ts`: Types và utilities fetch/transform tài liệu gom nhóm theo Tuần học.
  - `app/teacher/classes/[classId]/materials/actions.ts`: Server Actions `uploadClassMaterialAction` và `deleteClassMaterialAction` upload lên Supabase Storage và lưu vào CSDL.
  - `components/teacher/class-material-upload-form.tsx`: Component form upload file (PDF, DOCX) hoặc dán link Video bài giảng phân loại theo tuần học.
  - `components/teacher/class-material-list.tsx`: Component danh sách tài liệu theo tuần học với filter, xem/tải về và xóa.
  - `app/teacher/classes/[classId]/materials/page.tsx`: Server Component cho route quản lý tài liệu của giáo viên.
  - `components/student/student-class-materials.tsx`: Component phía sinh viên hiển thị kho tài liệu theo lớp và tuần học kèm tính năng tải về.
  - `app/student/dashboard/page.tsx` & `components/student/student-sidebar.tsx`: Bổ sung khu vực/tab "Tài liệu" trên Dashboard sinh viên.
- [x] **Phase 14 (Commit `c5e52e0`)**: Quản lý Chấm thi Tập trung & Entry Points cho Giảng viên (`/teacher/grading`)
  - `components/teacher/teacher-sidebar.tsx`: Thêm mục điều hướng "Chấm bài thi" (`/teacher/grading`) với icon `FileCheck`.
  - `app/teacher/dashboard/page.tsx`: Thêm Quick Action "Chấm bài thi", Metric card "Bài chờ chấm", nút truy cập trên Hero Header và bảng "Bài thi chờ chấm tự luận" trực tiếp trên Dashboard.
  - `lib/teacher-dashboard.ts`: Mở rộng `getTeacherDashboardData()` truy vấn `pendingAttempts` bài thi tự luận chờ chấm.
  - `lib/teacher-grading.ts`: Viết hàm `getTeacherGradingQueue()` phân loại bài thi `pending_grading` và `completed`.
  - `app/teacher/grading/page.tsx` & `components/teacher/grading-queue-client.tsx`: Trang quản lý chấm thi 2 tab "Chờ chấm điểm" và "Đã chấm xong" kèm tìm kiếm và xem cảnh báo gian lận tab-switch.
- [x] **Phase 15 (Commit `cf78d30`)**: Sửa lỗi Server Action Chấm thi Tự luận & Hoàn thiện Luồng Lưu Điểm / Công bố Kết quả (`/teacher/grading/[attemptId]`)
  - `app/teacher/grading/[attemptId]/actions.ts`: Bọc toàn bộ hàm `saveEssayGradesAction` trong khối `try/catch`, thêm hàm trợ lực `getDbClient(supabase)` linh hoạt, sửa logic kiểm tra `student_answers` không ghi đè bài làm, và tính toán chuẩn xác `totalScore = mcAwardedScore + essayScore`.
  - `components/teacher/essay-grading-client.tsx`: Hiển thị thông điệp lỗi chính xác từ `res.message` hoặc `err.message`, xử lý an toàn input rỗng / `NaN`.
  - Đã nghiệm thu bằng `npx tsc --noEmit` (0 lỗi) và `npm run build` (pass 100%).
- [x] **Phase 16 (Commit `5e3bc5d`)**: Xử lý triệt để "Minified React Error #441", cơ chế Supabase Admin Fallback an toàn & Migration phân quyền RLS chấm thi
  - `lib/supabase/admin.ts`: Thêm graceful fallback sang `NEXT_PUBLIC_SUPABASE_ANON_KEY` nếu thiếu `SUPABASE_SERVICE_ROLE_KEY`, tuyệt đối không quăng ngoại lệ làm sập RSC render stream.
  - `lib/teacher-grading.ts`: Chuyển đổi linh hoạt `process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase` cho cả `getTeacherGradingData` và `getTeacherGradingQueue`.
  - `app/teacher/grading/[attemptId]/page.tsx`: Gỡ bỏ bọc `<Suspense>` dư thừa quanh `<EssayGradingClient>` giúp đồng bộ rendering React 19 mượt mà.
  - `app/teacher/grading/[attemptId]/actions.ts`: Bảo vệ thao tác insert câu trả lời trống và điều hướng revalidation.
  - `supabase/migrations/20261024_teacher_grading_permissions.sql`: Cấp quyền và RLS policy toàn diện cho giảng viên quản lý điểm số trên `student_answer_grades`, `attempt_results`, `exam_attempts`, và `student_answers`.

---

## Chi tiết kỹ thuật Phase 16: Khắc phục Minified React Error #441

### 1. Hiện tượng & Bản chất lỗi
* Người dùng gặp thông báo lỗi:
  `"Minified React error #441; visit https://react.dev/errors/441 for the full message or use the non-minified dev environment for full errors and additional helpful warnings."`
* **Giải mã lỗi theo tài liệu React 19**:
  `"An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error."`

### 2. Chuỗi kích hoạt (Trigger Chain)
1. Người dùng bấm "Lưu tạm điểm" hoặc "Chốt điểm & Công bố kết quả" -> gọi `saveEssayGradesAction`.
2. Trong Server Action, khi `revalidatePath('/teacher/grading/[attemptId]')` được kích hoạt, Next.js tiến hành re-render Server Component `TeacherGradingPage` trên máy chủ để trả về payload RSC cập nhật.
3. Trong `TeacherGradingPage`, hàm `getTeacherGradingData` gọi `createAdminClient()`.
4. Trong `lib/supabase/admin.ts`, nếu biến môi trường `SUPABASE_SERVICE_ROLE_KEY` không có trong môi trường runtime, `createAdminClient()` ném ra `throw new Error('Missing server-side Supabase admin configuration.')`.
5. Ngoại lệ này xảy ra ngay trong luồng render Server Component, dẫn đến việc React 19 production mã hóa nó thành `Minified React error #441` và trả về client dưới dạng Promise rejection.

### 3. Biện pháp đã thực hiện
1. **Fallback an toàn trong `lib/supabase/admin.ts`**: Fallback sang `NEXT_PUBLIC_SUPABASE_ANON_KEY` khi không có `SUPABASE_SERVICE_ROLE_KEY`.
2. **Ưu tiên client có phiên trong `lib/teacher-grading.ts`**: Chỉ dùng `createAdminClient()` khi có service key, còn lại dùng `supabase` mang JWT của giáo viên đang đăng nhập.
3. **Loại bỏ Suspense dư thừa**: Tinh gọn cây Server Component tại `app/teacher/grading/[attemptId]/page.tsx`.
4. **Cập nhật SQL Migration**: Cung cấp `supabase/migrations/20261024_teacher_grading_permissions.sql` mở toàn diện quyền RLS cho giáo viên khi chấm điểm.
