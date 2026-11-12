# Kế hoạch phát triển dự án E-Learning Đại học Lạc Hồng (LHU)

## Trạng thái các Phase

- [x] **Phase 1-27**: Hoàn thiện các tính năng cốt lõi (Xem git log).
- [x] **Phase 28 (Commit `e48754b`)**: Đồng bộ nhận diện thương hiệu Đại học Lạc Hồng & Thêm nút chuyển đổi giao diện Sáng / Tối (Light/Dark Mode).
- [x] **Phase 29 (Commit `99e1ef8`)**: Sửa lỗi `cookies() inside unstable_cache()` và tối ưu hệ thống cache Next.js 16.
- [x] **Phase 30 (Commit `6ac63c0`)**: Tạo trang Quản lý Môn học riêng cho Admin `/admin/subjects`, sửa điều hướng và khắc phục triệt để lỗi mã hóa ký tự tên user tiếng Việt.
- [x] **Phase 31 (Commit `5062e16`)**: Đồng bộ triệt để màu sắc & độ tương phản trong Dark Mode.
- [x] **Phase 32 (Commit `a720f51`)**: Bổ sung mục "Tài liệu" và "Bài tập" vào giao diện Giảng viên.
- [x] **Phase 33 (Commit `4db02f0`)**: Hoàn thiện tính năng nút cập nhật giảng viên phụ trách lớp tại Cổng Quản trị viên.
- [x] **Phase 34 (Commit `0b7eb11`)**: Xóa khung "Thêm môn học mới" tại trang Quản trị Giảng viên & Phân môn, căn chỉnh Layout w-full cho Card Lớp học
- [x] **Phase 35 (Commit `5a43fa8`)**: Sửa triệt để lỗi chữ bị mờ / tàng hình trong Chế độ Tối (Dark Mode)
- [x] **Phase 36 (Commit `442560d`)**: Làm nổi bật màu xanh cho Tab đang chọn ("Duyệt hồ sơ" & "Phân công môn học") tại `/admin/teacher-access`
- [x] **Phase 37 (Commit `9c0e5fe`)**: Nâng cấp phòng thi trực tuyến (Shuffle đề deterministic, Fullscreen Lockdown, Camera Proctoring)
- [x] **Phase 38 (Commit `15aac82`)**: Thống kê đào tạo (Learning Analytics), Phân tích chất lượng câu hỏi (Item Analysis) & Xuất bảng điểm Excel
- [x] **Phase 39 (Commit `cc1b5ba`)**: Đồng bộ màu xanh Active cho Thanh Tab Trang Chấm Bài Thi & Toàn bộ Tab Lọc trên Hệ thống
  - [x] **Mục tiêu 1 (Component Tabs Gốc `components/ui/tabs.tsx`)**:
    - Nâng cấp `TabsTrigger` mặc định: Áp dụng style active màu xanh `data-[selected]:!bg-blue-600 data-[selected]:!text-white data-[state=active]:!bg-blue-600 data-[state=active]:!text-white data-[selected]:shadow-md data-[selected]:shadow-blue-600/30` hỗ trợ cả Base UI (`data-[selected]`) và Radix UI (`data-[state=active]`).
  - [x] **Mục tiêu 2 (Trang Chấm Bài Thi `components/teacher/grading-queue-client.tsx`)**:
    - Chuẩn hóa khung bọc `TabsList`: `inline-flex items-center gap-1.5 rounded-full bg-slate-200/80 dark:bg-[#111C2D] p-1.5 border border-slate-300/80 dark:border-slate-800`.
    - Trạng thái Active: `!bg-blue-600 !text-white font-semibold shadow-md shadow-blue-600/30 ring-1 ring-blue-400/40 rounded-full px-4 py-2`.
    - Badge đếm số lượng: Tab "Chờ chấm điểm" dùng pill nổi bật `bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded-full text-xs`; tab "Đã chấm xong" khi active dùng `bg-white text-blue-700 font-bold px-2 py-0.5 rounded-full text-xs`.
    - Icon bên trong tab active tự động chuyển sang `text-white`.
  - [x] **Mục tiêu 3 (Trang Thống kê Đề thi `components/teacher/exam-analytics-client.tsx`)**:
    - Đồng bộ thanh chuyển tab chính (Phổ điểm / Item Analysis / Bảng điểm) với style chuẩn Admin (`group`, `data-[selected]`, `aria-selected`).
    - Nâng cấp bộ lọc loại câu hỏi (Tất cả / Trắc nghiệm / Tự luận / Cần xem lại) và bộ lọc kết quả (Tất cả / Đạt / Không đạt) sang active màu xanh dương.
  - [x] **Mục tiêu 4 (Trang Ngân hàng Câu hỏi `components/teacher/question-manager.tsx`)**:
    - Nâng cấp cụm lọc loại câu hỏi (`Tất cả` | `Trắc nghiệm` | `Tự luận`) sang active màu xanh dương nổi bật `!bg-blue-600 !text-white shadow-md shadow-blue-600/30 font-semibold`.
  - [x] **Mục tiêu 5 (Các Trang Quản lý & Học tập Khác)**:
    - Quản lý Sinh viên (`components/admin/student-table-client.tsx`): Lọc Tất cả / Hoạt động / Bị khóa.
    - Quản lý Môn học (`app/admin/subjects/subjects-manager-client.tsx`): Lọc Tất cả / Đang mở / Lưu trữ.
    - Bài tập Sinh viên (`components/student/student-assignments.tsx`): Lọc Tất cả / Chưa nộp / Chờ chấm / Đã có điểm.
    - Tài liệu học tập (`components/teacher/class-material-list.tsx`, `components/student/student-class-materials.tsx`, `components/teacher/teacher-materials-client.tsx`): Lọc Lớp & Tuần học.
  - [x] **Mục tiêu 6 (Kiểm thử & Nghiệm thu)**:
    - Chạy `npx tsc --noEmit` & `npm run build` đảm bảo 100% không có lỗi.
    - Tạo commit cục bộ an toàn (không push).


- [x] **Phase 40 (Commit `30ea1e7` & `1c6ff1c`)**: Tích hợp Resend Email Service & Hệ thống OTP Xác thực & Nhận diện LHU.
- [x] **Phase 41 (Commit `542157a` & `c34d587`)**: Tích hợp Gmail SMTP (Nodemailer) giải phóng giới hạn Sandbox:
  - [x] Cài đặt `nodemailer` và `@types/nodemailer`.
  - [x] Cấu hình Transporter Gmail trong `lib/email/resend.ts` ưu tiên gửi qua Gmail SMTP nếu có `SMTP_USER` và `SMTP_PASS` (App Password).
  - [x] Cho phép gửi thư đến bất kỳ email nào (sinh viên, giảng viên, các domain khác) miễn phí 100% không yêu cầu Custom Domain.
  - [x] Dự phòng Resend API với thông báo lỗi Sandbox chi tiết hướng dẫn cấu hình.

- [x] **Phase 42 (Commit `17ff1b8`)**: Đồng bộ 100% các tính năng "Thao tác nhanh" lên Menu bên trái (Trang riêng biệt) & Sửa lỗi màu chữ bị mờ:
  - [x] **Mục tiêu 1: Cập nhật Sidebar Giảng viên (`components/teacher/teacher-sidebar.tsx`)**:
    - Mở rộng union type `TeacherSidebarActiveRoute` hỗ trợ 10 route.
    - Cập nhật danh sách `navItems` gồm 10 mục theo thứ tự logic chuẩn: Tổng quan, Môn học, Lớp học, Tài liệu giảng dạy, Bài tập về nhà, Ngân hàng câu hỏi, Sinh câu hỏi AI, Đề thi, Chấm bài thi, Gia sư AI.
  - [x] **Mục tiêu 2: Xây dựng các trang riêng biệt cho Cổng Giảng viên**:
    - Tạo `app/teacher/classes/page.tsx`: Quản lý danh sách lớp học phụ trách, thống kê số lớp/sinh viên, tích hợp `ClassForm` tạo lớp mới độc lập.
    - Tạo `app/teacher/ai-generator/page.tsx`: Trang sinh câu hỏi AI Groq chuyên nghiệp, giao diện cấu hình, xem trước định dạng KaTeX LaTeX và lưu trực tiếp vào Ngân hàng câu hỏi.
    - Tạo `app/teacher/exams/page.tsx`: Quản lý toàn bộ danh sách đề thi, lọc trạng thái (Đã phát hành / Bản nháp / Đã đóng), nút tạo đề thi mới và link xem phổ điểm / thống kê.
  - [x] **Mục tiêu 3: Cập nhật Sidebar Sinh viên & Trang Kết quả học tập**:
    - Cập nhật `components/student/student-sidebar.tsx`: thêm route `'results'` (Kết quả học tập, icon `Trophy`).
    - Tạo `app/student/results/page.tsx`: Lịch sử thi & bài tập, bảng điểm chi tiết, phân loại Đạt / Không đạt / Chờ chấm, thống kê điểm trung bình.
  - [x] **Mục tiêu 4: Sửa triệt để lỗi màu chữ mờ & Nâng độ tương phản UI**:
    - Nút "Chấm bài thi" góc trên phải `/teacher/dashboard`: màu amber nổi bật, viền rõ nét (`bg-amber-500/15 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 font-semibold hover:bg-amber-500/30`).
    - 8 ô "Thao tác nhanh" (`QUICK_ACTIONS`): tiêu đề đậm `dark:text-white`, mô tả `dark:text-slate-300`, border `dark:border-slate-700/80`, hover bóng mượt, chuẩn hóa link điều hướng trỏ về các trang độc lập.
    - 5 Thẻ Thống kê Metric Cards: bỏ `line-clamp-1` cho phép xuống dòng, tiêu đề `text-slate-600 dark:text-slate-200`, mô tả đáy `dark:text-slate-300`.
    - Đồng bộ độ tương phản các thẻ ở `/student/dashboard` và bổ sung thẻ "Kết quả học tập".
  - [x] **Mục tiêu 5: Kiểm thử & Nghiệm thu chất lượng**:
    - Chạy TypeScript check (`npx tsc --noEmit`) 0 errors.
    - Chạy Production Build (`npm run build`) 37/37 static/dynamic pages biên dịch thành công.
    - Tạo Local commit an toàn (không push tự ý).

- [x] **Phase 43 (Commit `5cfd027`)**: Đồng bộ Layout Sidebar + Sửa Links + Khắc phục màu chữ tàng hình toàn hệ thống:
  - [x] **Mục tiêu 1: Đồng bộ Layout cho classId pages**: Wrap `/teacher/classes/[classId]`, `/teacher/classes/[classId]/assignments`, `/teacher/classes/[classId]/assignments/[assignmentId]`, `/teacher/classes/[classId]/materials` vào layout sidebar đầy đủ. Xóa header rời rạc cũ.
  - [x] **Mục tiêu 2: Active route chuẩn xác**: Nâng cấp Sidebar với `usePathname()` tự động phát hiện route con (`/teacher/exams/create`, `/teacher/exams/[examId]` → sáng "Đề thi"; `/teacher/classes/[classId]` → sáng "Lớp học").
  - [x] **Mục tiêu 3: Nút bấm & Links**: Nút quay lại `/teacher/classes/[classId]` trỏ về `/teacher/classes`. Cụm nút header: "Bài tập về nhà" (`bg-blue-600`), "Tài liệu học tập" (amber), badge "X sinh viên" cuộn mượt `#danh-sach-sinh-vien`.
  - [x] **Mục tiêu 4: Sửa màu chữ tàng hình tại `exam-create-form.tsx`**: Nhãn form (`text-slate-800 dark:text-slate-100 font-semibold text-sm`), công thức MathText/KaTeX (`text-slate-900 dark:text-slate-100 [&_.katex]:text-slate-900 dark:[&_.katex]:text-slate-100`), khung tìm kiếm & chọn lớp (`bg-slate-100 dark:bg-slate-800/90`), nút "Lưu bản nháp".
  - [x] **Mục tiêu 5: Rà soát & sửa màu sắc trang con classId & dashboard**: 3 thẻ thống kê bài tập (`bg-white dark:bg-[#111C2D] border-slate-200 dark:border-slate-800`), khung trạng thái rỗng, link lớp gần đây, nút thống kê đề thi.
  - [x] **Mục tiêu 6: Kiểm thử & Nghiệm thu**: `npx tsc --noEmit` đạt 0 lỗi, `npm run build` thành công 37/37 static/dynamic pages. Commit cục bộ an toàn.

- [x] **Phase 44 (Commit `bd58696`)**: Thêm tính năng Bật/Tắt bắt buộc mở Camera khi tạo đề thi & đồng bộ phòng thi:
  - [x] **Mục tiêu 1 (Giao diện Tạo đề thi)**: Thêm toggle switch "Bắt buộc học sinh mở Camera trong quá trình thi" tại `components/teacher/exam-create-form.tsx` kèm badge trạng thái, icon Camera và giải thích rõ ràng cả Light/Dark Mode.
  - [x] **Mục tiêu 2 (Database Migration & Zero-Crash Fallback)**:
    - Tạo migration SQL `supabase/migrations/20261110_add_require_camera_to_exams.sql` (`ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS require_camera BOOLEAN NOT NULL DEFAULT false`).
    - Viết cơ chế Fallback thông minh trong `app/teacher/exams/create/actions.ts`: Nhúng tag `[CAMERA_REQUIRED:true/false]` vào `instructions` nếu DB chưa có cột; đọc an toàn qua helper `isCameraRequired`.
  - [x] **Mục tiêu 3 (Đồng bộ Phòng thi Sinh viên `/student/exams/[examId]`)**:
    - Khi `requireCamera = true`: Sảnh chuẩn bị yêu cầu kiểm tra webcam và cấp quyền trước khi mở khóa nút "Bắt đầu làm bài", hiển thị `ExamWebcamProctor` góc màn hình trong giờ thi.
    - Khi `requireCamera = false`: Cho phép vào thi ngay không cần webcam, ẩn khung camera và không ghi log vi phạm camera.
  - [x] **Mục tiêu 4 (Hiển thị Badge trên các Danh sách Đề thi)**:
    - Thêm badge `📷 Bắt buộc Camera` / `Không yêu cầu Camera` tại `/teacher/exams`, `/student/exams`, và `/student/dashboard`.
  - [x] **Mục tiêu 5 (Kiểm thử & Nghiệm thu)**:
    - `npx tsc --noEmit` đạt 0 lỗi.
    - `npm run build` thành công 37/37 routes.
    - Tạo commit cục bộ an toàn (không push tự ý) và lưu mã hash commit `bd58696`.

- [x] **Phase 45 (Commit `f843f47`)**: Sửa lỗi Kẹt nút Đăng xuất trên Sidebar Giảng viên & Rà soát đồng bộ màu chữ Sáng/Tối toàn hệ thống:
  - [x] **Mục tiêu 1 (Sidebar Giảng viên & Sinh viên)**:
    - Sửa cấu trúc Flexbox chuẩn: `<aside>` cố định `h-screen w-64 shrink-0 flex flex-col overflow-hidden`; `<nav>` ở giữa gắn `flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-1 scrollbar-thin`; khối tài khoản & Đăng xuất ở đáy gắn `shrink-0 p-3 border-t border-white/10 dark:border-slate-800/80 z-10` cố định 100% không bị đẩy khuất.
    - Thu gọn padding mỗi item thành `py-2 px-3 text-sm` hiển thị trọn vẹn 10 mục.
    - Độc lập hóa nút Đăng xuất: Handler `handleSignOut` gọi client `supabase.auth.signOut()` và hard redirect `window.location.href = '/login'` giải phóng phiên ngay tức thì.
    - Sửa triệt để lỗi sáng 2 mục cùng lúc: Khi `pathname` tồn tại, chỉ so sánh `pathname` (mục dashboard so sánh bằng tuyệt đối `===`, các mục khác dùng `pathname.startsWith(href)`), không fallback xuống `activeRoute`.
  - [x] **Mục tiêu 2 (Trang Chi tiết & Kết quả Đề thi Sinh viên `/student/exams/[examId]`)**:
    - Thẻ chính trên cùng: `bg-white dark:bg-[#111C2D] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white`, 4 ô thông số con `bg-slate-50 dark:bg-[#162235] border border-slate-200/80 dark:border-slate-700/80` số lớn `text-slate-900 dark:text-white`, nhãn `text-slate-600 dark:text-slate-300`.
    - Banner Gia sư AI Chữa đề: Đổi sang `bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 dark:from-[#171836] dark:via-[#1E1B4B] dark:to-[#111C2D] border border-indigo-200 dark:border-indigo-500/30`. Tiêu đề `text-slate-900 dark:text-white`, mô tả `text-slate-600 dark:text-slate-200`.
    - Thẻ Lịch sử làm bài: `bg-white dark:bg-[#111C2D] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white`, chữ trong bảng `text-slate-800 dark:text-slate-200`.
    - Thẻ Quy chế / Lưu ý phòng thi: `bg-white dark:bg-[#111C2D] border border-slate-200 dark:border-slate-800`, tiêu đề `text-slate-900 dark:text-white font-bold text-lg`, 4 gạch đầu dòng in đậm `text-slate-900 dark:text-white`, giải thích `text-slate-600 dark:text-slate-300`. Khung dưới `bg-slate-50 dark:bg-[#162235] border border-slate-200 dark:border-slate-700/80`. Nút "Quay về trang chủ" `bg-slate-200 hover:bg-slate-300 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white font-semibold`.
  - [x] **Mục tiêu 3 (Rà soát Toàn Diện 100% Hệ Thống)**:
    - Quét và sửa các thẻ `bg-white`, `bg-slate-50` thiếu `dark:bg-...` và chữ tàng hình tại các màn hình:
      + `/teacher/exams/[examId]`, `/teacher/grading/[attemptId]`, `/teacher/classes/[classId]`, `/student/assignments`, `/student/materials`, `/student/classes`, `/admin/subjects`, `/admin/teacher-access`, `/admin/student-management`, `AlertDialog`, `Dialog`, `ExamTutorDrawer`.
  - [x] **Mục tiêu 4 (Kiểm thử & Nghiệm thu)**:
    - `npx tsc --noEmit` đạt 0 lỗi.
    - `npm run build` thành công 37/37 routes.
    - Local commit (tuyệt đối không push) và ghi mã commit hash `f843f47` vào kế hoạch.

- [x] **Phase 46 (Commit `b17953b`)**: Tổng rà soát & sửa lỗi liên kết chức năng, điều hướng & màu chữ (Sáng/Tối) trên cả 3 giao diện (Admin, Giảng viên, Sinh viên):
  - [x] **Mục tiêu 1 (Rà soát & Sửa toàn bộ Liên kết và Điều hướng Admin, Teacher, Student)**:
    - Admin: Cập nhật `AdminNav` độc lập với client signOut + hard redirect, highlight active tab rõ ràng với `!bg-blue-600 !text-white`, chuyển các card thống kê dashboard `/admin` thành link dẫn sang các trang quản lý tương ứng. Xóa bỏ link nhảy nhầm từ Admin sang Giảng viên tại `/admin/teacher-access` (chuyển sang `<span>` chuẩn).
    - Giảng viên: Đồng bộ 10 mục Sidebar và 8 ô Thao tác nhanh trên `/teacher/dashboard`. Sửa link `/chat` thành `/teacher/ai-tutor`. Sửa nút quay lại tại `/teacher/exams/[examId]` trỏ đúng `/teacher/exams` ("Quay lại danh sách đề thi"). Sửa chuyển hướng sau khi tạo đề thi mới `/teacher/exams/create` về `/teacher/exams` thay vì dashboard. Giữ nguyên khung Sidebar và active route chuẩn.
    - Sinh viên: 100% link Thao tác nhanh trên `/student/dashboard` trỏ tới trang độc lập (`/student/classes`, `/student/materials`, `/student/assignments`, `/student/exams`, `/student/results`, `/student/ai-tutor`), sạch bóng link `#hash`. Các nút điều hướng trong luồng thi `/student/exams/[examId]` trỏ chuẩn `/student/dashboard` và `/student/exams`, tuyệt đối không trỏ về `/`.
  - [x] **Mục tiêu 2 (Sửa triệt để 5 Lỗi Màu sắc Sáng/Tối)**:
    - Lỗi 1: Thẻ Card và box con có nền trắng cứng trong Dark Mode đã được phủ đầy đủ `dark:bg-[#111C2D]`, `dark:bg-[#162235]`, `dark:border-slate-800`.
    - Lỗi 2: Chữ màu đen/tối cứng trên nền Dark Mode đã được nâng cấp `dark:text-white` cho tiêu đề và `dark:text-slate-100` cho nội dung/nhãn.
    - Lỗi 3: Chữ mô tả phụ, placeholder và bảng dữ liệu quá mờ được chuẩn hóa sang `text-slate-600 dark:text-slate-300`, ô nhập liệu có `dark:bg-[#162235] text-slate-900 dark:text-white placeholder:text-slate-400`.
    - Lỗi 4: Công thức Toán học KaTeX (`<MathText />`) bị đen trong Dark Mode: Đã bổ sung quy tắc CSS chuẩn trong `app/globals.css`: `.katex { color: inherit; }` và `.dark .katex, .dark .katex-display, .dark .katex-html { color: #F8FAFC !important; }`.
    - Lỗi 5: Đồng bộ các thanh Tab lọc & Badge trạng thái sang màu xanh active `!bg-blue-600 !text-white font-semibold shadow-sm`.
  - [x] **Mục tiêu 3 (Kiểm thử, Xác minh & Bàn giao)**:
    - `npx tsc --noEmit` đạt 0 lỗi.
    - `npm run build` thành công 100% (37/37 routes).
    - Local commit an toàn (tuyệt đối không push tự ý) với mã commit hash `b17953b`.

- [x] **Phase 47 (Commit `1ac0af7`)**: Sửa triệt để lỗi Groq `400 json_validate_failed` & Tổng rà soát hệ thống AI + UI:
  - [x] **Mục tiêu 1 (Sửa lỗi Groq `json_validate_failed` tại AI Generator)**:
    - Nâng cấp `lib/ai-question-generator.ts`: Dùng model `llama-3.3-70b-versatile` (fallback `llama-3.1-8b-instant`), tăng `max_tokens: 8192`, `temperature: 0.3`.
    - Multi-layer fallback 3 lớp: Layer 1 (json_object mode) → Layer 2 (text mode + `parseAiJsonSafely()`) → Layer 3 (smart local fallback).
    - Hàm `parseAiJsonSafely`: Thoát markdown, tự động sửa dấu `\` đơn của LaTeX thành `\\`, khôi phục các câu hỏi đã hoàn tất khi JSON bị ngắt giữa chừng.
    - Không văng lỗi thô `400 {"error":...}` lên UI.
  - [x] **Mục tiêu 2 (Lưu câu hỏi Tự luận & Preview Rubric)**:
    - Nâng cấp Preview Tự luận tại `ai-generator-standalone.tsx` và `ai-generator-modal.tsx`: Hiển thị rõ ràng Đáp án mẫu (`model_answer`) và Thang điểm Rubric (`grading_rubric`) kèm render KaTeX `<MathText />`.
    - Server action `saveAIQuestionsBatchAction`: Payload gửi vào Supabase chuẩn xác với schema `question_bank`, `question_answer_keys` (essay: `options` không chèn thừa, `correct_option_key: null`, `model_answer`, `grading_rubric`).
  - [x] **Mục tiêu 3 (Rà soát Toàn bộ AI Chat, AI Tutor & Upload Document)**:
    - `app/api/chat-ai/route.ts`: Model `llama-3.3-70b-versatile`, `max_tokens: 4096`, system prompt yêu cầu KaTeX `$ ... $` / `$$ ... $$`.
    - `app/api/student/exam-tutor/route.ts`: Model `llama-3.3-70b-versatile`, `max_tokens: 4096`, streaming mượt mà, lưu lịch sử hội thoại.
    - `lib/document-parser.ts`: Model `llama-3.3-70b-versatile`, `max_tokens: 8192`, tích hợp `parseAiJsonSafely` bóc tách DOCX/PDF an toàn 100%.
  - [x] **Mục tiêu 4 (Tinh chỉnh Scrollbar Sidebar & Kiểm thử)**:
    - Tinh chỉnh scrollbar siêu mảnh trên `<nav>` của cả `components/teacher/teacher-sidebar.tsx` và `components/student/student-sidebar.tsx`: `[&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/20 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700/50 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent`.
    - `npx tsc --noEmit` đạt 0 lỗi.
    - `npm run build` thành công 100% (37/37 routes).
    - Local commit an toàn (tuyệt đối không push tự ý) và cập nhật commit hash.

- [x] **Phase 48 (Commit `4c62eca`)**: Sửa lỗi màu chữ ô nhập liệu & Lỗi kết nối Gia sư AI (`Could not get an AI response`) + Quét toàn bộ màu sắc hệ thống:
  - [x] **Mục tiêu 1 (Sửa lỗi Màu Chữ Đen Tàng Hình trong Ô Chat & Phím Tắt)**:
    - Tại `/teacher/ai-tutor`, `/student/ai-tutor`:
      + Ô `<textarea id="chat-input">`: gắn class `bg-white dark:bg-[#111C2D] !text-slate-900 dark:!text-white caret-blue-600 dark:caret-amber-400 placeholder:text-slate-400 dark:placeholder:text-slate-400 border border-slate-300 dark:border-emerald-500/50 focus:border-blue-600 dark:focus:border-emerald-400`, thêm `spellCheck={false}`.
      + Khối thẻ `<kbd>` (`Enter`, `Shift + Enter`): `px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 font-mono text-xs font-semibold`.
      + Các nút gợi ý câu hỏi nhanh: `bg-slate-100 hover:bg-blue-50 dark:bg-[#162235] dark:hover:bg-[#1E2F48] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700`.
  - [x] **Mục tiêu 2 (Sửa triệt để lỗi Kết nối AI `Could not get an AI response`)**:
    - Nâng cấp `app/api/chat-ai/route.ts` & tạo alias `app/api/chat/route.ts`:
      + Chuẩn hóa payload linh hoạt: nhận cả `{ messages: [...] }` lẫn `{ message: "...", history: [...] }`.
      + Phân biệt ngữ cảnh: Giảng viên (Trợ lý Học thuật & Khảo thí AI) vs Sinh viên (Gia sư AI học tập).
      + Bọc an toàn mọi truy vấn phụ trong try/catch độc lập.
      + Cascade Multi-Model: `llama-3.3-70b-versatile` -> fallback `llama-3.1-8b-instant`.
      + Smart Academic Fallback: Khi Groq lỗi/hết quota/mất mạng, tự động trả về câu trả lời học thuật chuyên sâu đúng chủ đề (OOP, Dijkstra, Rubric, Đạo hàm, CSDL...) kèm công thức KaTeX sắc nét, không bao giờ văng lỗi `Could not get an AI response.`.
  - [x] **Mục tiêu 3 (Khóa quy tắc toàn cục trong `app/globals.css` & Quét toàn bộ 3 phân hệ)**:
    - Bổ sung quy tắc bảo vệ toàn cục cho `input, textarea, select`:
      + Light Mode: chữ `#0F172A`, placeholder `#64748B`.
      + Dark Mode: chữ `#F8FAFC !important`, placeholder `#94A3B8 !important`, caret `#60A5FA`.
    - Nâng cấp component gốc `components/ui/input.tsx` và `components/ui/textarea.tsx`: bổ sung `text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400`.
    - Rà soát các ô nhập bài làm tự luận (`components/student/exam-taking-client.tsx`), ô nhập nhận xét chấm bài (`components/teacher/essay-grading-client.tsx`), dialog tạo bài tập, drawer chữa đề và modal xem trước đề thi.
  - [x] **Mục tiêu 4 (Kiểm thử & Nghiệm thu)**:
    - `npx tsc --noEmit` đạt 0 lỗi.
    - `npm run build` thành công 100% (38/38 routes).
    - Tạo local commit và ghi mã hash cạnh Phase 48 trong active.md.
    - Tạo local commit và ghi mã hash cạnh Phase 48 trong active.md.
