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

- [x] **Phase 49 (Commit `65c4c5e`)**: Sửa triệt để lỗi trùng lặp câu hỏi & đáp án khi sinh câu hỏi AI (`/teacher/ai-generator` & `/teacher/questions`):
  - [x] **Mục tiêu 1 (Sửa Bộ Parse JSON LaTeX `sanitizeAndParseAiJson`)**:
    - Nâng cấp bộ xử lý JSON: Tiền xử lý mọi ký tự `\` đơn đứng trước các lệnh LaTeX (`\frac`, `\text`, `\beta`, `\right`, `\neq`, `\sqrt`, `\int`...) thành `\\` hợp lệ trước khi parse.
    - Đảm bảo kết quả thật từ mô hình Groq (`llama-3.3-70b-versatile`) luôn parse thành công 100%, không bị văng lỗi cú pháp giả để nhảy nhầm vào fallback.
  - [x] **Mục tiêu 2 (Đa dạng hóa câu hỏi & Phân bổ đều đáp án A-B-C-D)**:
    - Nâng cấp System Prompt & User Prompt: Yêu cầu AI chia chủ đề thành N khía cạnh/dạng bài tập khác nhau hoàn toàn.
    - Thêm cơ chế Shuffle phương án A-B-C-D ngẫu nhiên và tự động cập nhật lại `correct_option` tương ứng để phân bổ đều 4 vị trí A, B, C, D.
    - Viết hàm `cleanGeneratedQuestion`: Tự động cắt bỏ các tiền tố thừa lặp trên giao diện (`Câu X:`, `Phương án A:`, `Lời giải chi tiết:`).
  - [x] **Mục tiêu 3 (Nâng cấp Ngân hàng Kịch bản Dự phòng Đa dạng - Dynamic Parameterized Fallback)**:
    - Xóa bỏ hoàn toàn câu hỏi fallback tĩnh lặp đi lặp lại.
    - Xây dựng 10 kịch bản câu hỏi độc lập với các dạng toán, hàm số, phương án và đáp án luân phiên khác nhau 100%.
    - Bổ sung `Deduplication Guard`: Kiểm tra chống trùng lặp, đảm bảo không có bất kỳ 2 câu hỏi nào giống nhau trong kết quả trả về.
  - [x] **Mục tiêu 4 (Kiểm thử & Nghiệm thu)**:
    - `npx tsc --noEmit` đạt 0 lỗi.
    - `npm run build` thành công 100% (38/38 routes).
    - Tạo local commit và cập nhật mã hash vào kế hoạch.

- [x] **Phase 50 (Commit `13bfc7c`)**: Thêm tính năng Bật/Tắt "Tự chấm tự luận (Đối chiếu đáp án mẫu)" trong Tạo đề thi và luồng Chấm bài thi:
  - [x] **Mục tiêu 1 (Giao diện Công tắc Bật/Tắt tại `/teacher/exams/create`)**:
    - Thiết kế card Switch/Toggle "Tự động chấm bài Tự luận (Đối chiếu đáp án)" ngay bên dưới công tắc camera tại `components/teacher/exam-create-form.tsx`.
    - Chuẩn hóa Light/Dark Mode, icon `CheckCircle2`, mô tả chi tiết, badge trạng thái `Tự động chấm điểm` (khi bật) hoặc `Giảng viên chấm thủ công` (khi tắt).
    - Cập nhật card tóm tắt "3. Cơ chế Khảo thí & Giám sát AI" phản ánh trạng thái tự chấm tự luận.
  - [x] **Mục tiêu 2 (Database Migration & Zero-Crash Fallback Helper `lib/exam-auto-grade.ts`)**:
    - Tạo file migration `supabase/migrations/20261115_add_auto_grade_essay_to_exams.sql` bổ sung cột `auto_grade_essay BOOLEAN NOT NULL DEFAULT false`.
    - Tạo tiện ích `lib/exam-auto-grade.ts` hỗ trợ: `isAutoGradeEssay(exam)`, `cleanExamInstructions(instructions)`, `appendExamInstructionTags(instructions, flags)`.
    - Nâng cấp `app/teacher/exams/create/actions.ts`: Nhận `autoGradeEssay`, nhúng tag `[AUTO_GRADE_ESSAY:true/false]` vào instructions, thực hiện insert đa tầng có fallback nếu DB chưa kịp chạy migration.
  - [x] **Mục tiêu 3 (Hàm So khớp Chuỗi & Tự Động Chấm Tự Luận khi Nộp bài thi)**:
    - Viết hàm `normalizeAnswerText` và `checkEssayAnswerMatch`: Chuẩn hóa Unicode NFC, lowercase, bỏ khoảng trắng thừa, bỏ dấu câu cuối dòng, tách và đối chiếu danh sách đáp án tương đương (`|`, `;`, `\n`).
    - Nâng cấp `submitExamAttemptAction` (`app/student/exams/[examId]/actions.ts`):
      + Khi `autoGradeEssay === true`: Tự động đối chiếu câu trả lời của thí sinh với `model_answer`/`grading_rubric` của câu tự luận. Khớp = trọn điểm (`max_points`) kèm nhận xét chuẩn, Không khớp = 0 điểm.
      + Cộng tổng điểm `total_score = mcq_score + essay_score`, hoàn tất chấm thi ngay lập tức (`status: 'completed'`), ghi kết quả vào `attempt_results` và chuyển thẳng vào tab "Đã chấm xong" tại `/teacher/grading`.
      + Khi `autoGradeEssay === false`: Giữ nguyên luồng chấm thủ công chuyển trạng thái `pending_grading` chờ giảng viên.
  - [x] **Mục tiêu 4 (Đồng bộ Badge trên Thẻ Đề thi Giảng viên & Sinh viên và Kiểm thử)**:
    - Thẻ đề thi Giảng viên (`components/teacher/teacher-exams-client.tsx`, `app/teacher/exams/page.tsx`): Hiển thị badge `⚡ Tự chấm tự luận` hoặc `✍️ GV chấm tự luận`.
    - Thẻ đề thi Sinh viên (`app/student/exams/page.tsx`, `lib/student-dashboard.ts`): Hiển thị badge `⚡ Tự chấm tự luận` hoặc `✍️ GV chấm tự luận`.
    - Kiểm tra `npx tsc --noEmit` & `npm run build` đạt 0 lỗi.
    - Local commit an toàn (không push tự ý) và cập nhật commit hash.

- [x] **Phase 51 (Commit `64a7ab7`)**: Sửa triệt để lỗi `404 model_not_found` khi Upload đề thi DOCX/PDF & Đồng bộ cơ chế chọn Model AI toàn hệ thống:
  - [x] **Mục tiêu 1 (Bộ bóc tách DOCX XML & Regex Nội bộ `parseQuestionsLocallyFromText`)**:
    - Xây dựng hàm bóc tách văn bản nội bộ thuần JavaScript/Regex trong `lib/document-parser.ts`:
      + Tách các câu hỏi Trắc nghiệm (`Câu 1`, `Câu 2`...) kèm 4 phương án A-B-C-D (hỗ trợ cả các phương án cùng hàng hoặc xuống dòng).
      + Phát hiện đáp án bôi đỏ `[RED_ANSWER]` (hoặc gạch chân, `*`, `[x]`, `Đáp án: [A-D]`), tự động gán `correct_option` và `is_red_detected: true`.
      + Tách các câu hỏi Tự luận (`Bài 1`, `Tự luận`...) kèm lời giải mẫu (`model_answer`) hoặc thang điểm rubric.
      + Bảo tồn trọn vẹn công thức Toán KaTeX `$ ... $` / `$$ ... $$`.
    - Nâng cấp `app/api/questions/upload/route.ts`: Ưu tiên bóc tách nội bộ, bọc khối gọi AI trong `try / catch` an toàn. Nếu AI lỗi (`404`, `400`, `429`, `500`), lập tức dùng kết quả bóc tách nội bộ, tuyệt đối không quăng lỗi đỏ làm hỏng quá trình upload.
  - [x] **Mục tiêu 2 (Module AI Trung tâm & Dynamic Model Discovery `lib/ai-provider.ts`)**:
    - Xây dựng module `lib/ai-provider.ts` quản lý kết nối Groq/OpenAI:
      + Tự động xác định Base URL (`https://api.groq.com/openai/v1` nếu key là `gsk_...`).
      + Danh sách model cascade: `process.env.GROQ_MODEL` -> `llama-3.1-8b-instant` -> `meta-llama/llama-4-scout-17b-16e-instruct` -> `qwen/qwen3-32b` -> `llama-3.3-70b-versatile` -> `gemma2-9b-it`.
      + Cơ chế Tự động Dò tìm Model: Nếu gặp `404 model_not_found`, tự động gọi `GET /models` để lấy danh sách các model chat thực tế mà tài khoản có quyền truy cập và retry ngay lập tức.
      + Lưu cache model hoạt động (`activeWorkingModel`) để các request kế tiếp chạy nhanh nhất.
  - [x] **Mục tiêu 3 (Áp dụng Module AI Trung tâm cho Toàn Bộ Tính Năng AI)**:
    - Đồng bộ `lib/document-parser.ts` (upload file đề thi).
    - Đồng bộ `lib/ai-question-generator.ts` (sinh câu hỏi trắc nghiệm & tự luận AI).
    - Đồng bộ `app/api/chat-ai/route.ts` & `app/api/chat/route.ts` (Gia sư AI).
    - Đồng bộ `app/api/student/exam-tutor/route.ts` (Gia sư AI chữa đề thi).
  - [x] **Mục tiêu 4 (Sửa Màu sắc Khung Upload File trong Dark Mode & Kiểm thử)**:
    - Sửa dropzone trong `components/teacher/upload-document-modal.tsx`: Khung chọn file, tên file, dung lượng, và hướng dẫn chuẩn tương phản Light/Dark Mode theo yêu cầu.
    - Kiểm tra `npx tsc --noEmit` & `npm run build` đạt 0 lỗi.
    - Local commit an toàn (không push tự ý) và cập nhật commit hash.

- [x] **Phase 52 (Commit `574b4b7`)**: Bổ sung tính năng Chỉnh sửa & Xuất bản Đề thi Nháp (Tự động chuyển khỏi mục Bản nháp khi Xuất bản):
  - [x] **Mục tiêu 1 (Thao tác trên Thẻ Đề thi Nháp & Trang Chi tiết `/teacher/exams` & `/teacher/exams/[examId]`)**:
    + Nâng cấp `components/teacher/teacher-exams-client.tsx`:
      - Khi `exam.status === 'draft'`: Hiển thị 3 nút thao tác trực diện:
        * Nút `✏️ Chỉnh sửa bản nháp` (`/teacher/exams/create?editId=${exam.id}`). Style: `bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/40 font-semibold`.
        * Nút `🚀 Xuất bản ngay` (`bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-sm`).
        * Nút `🗑️ Xóa nháp` (icon Trash2 tinh tế, có hộp thoại confirm).
      - Giữ nút `Phổ điểm & Chi tiết` nếu đề đã đóng/phát hành hoặc bổ sung tinh gọn.
    + Nâng cấp trang chi tiết `app/teacher/exams/[examId]/page.tsx` và client:
      - Tạo component `components/teacher/exam-draft-actions.tsx`: Khi `status === 'draft'`, hiển thị cụm nút `✏️ Chỉnh sửa bản nháp` và `🚀 Xuất bản ngay` ở Header Card.
  - [x] **Mục tiêu 2 (Nạp Dữ liệu Bản Nháp vào Form Chỉnh sửa `app/teacher/exams/create`)**:
    + Nâng cấp `lib/teacher-exam-create.ts` và `app/teacher/exams/create/page.tsx`:
      - Nhận query param `editId`.
      - Khi có `editId`, truy vấn thông tin đề thi nháp từ DB: `title`, `instructions`, `duration_minutes`, `max_attempts`, `available_from`, `available_until`, `require_camera`, `auto_grade_essay`, `subject_id`, danh sách `class_id` từ `exam_classes`, và danh sách câu hỏi gốc từ `exam_questions`.
      - Đổi tiêu đề trang thành `"Chỉnh sửa đề thi nháp"`.
    + Nâng cấp `components/teacher/exam-create-form.tsx`:
      - Nhận prop `initialExam` chứa toàn bộ dữ liệu cấu hình bản nháp.
      - Pre-fill vào tất cả các trường input, toggle, và nạp danh sách câu hỏi đã chọn kèm điểm số.
  - [x] **Mục tiêu 3 (Server Actions UPDATE Bản Nháp & Xuất bản Trực tiếp không tạo trùng `actions.ts`)**:
    + Xây dựng `updateExamAction(payload: UpdateExamPayload)`:
      - BẮT BUỘC thực hiện `UPDATE` trên chính `id = editId`, tuyệt đối KHÔNG `INSERT` bản ghi mới.
      - Cập nhật thông số đề thi (`title`, `instructions`, `duration_minutes`, `max_attempts`, `available_from`, `available_until`, `require_camera`, `auto_grade_essay`).
      - Đồng bộ lại `exam_classes` (xóa liên kết cũ, thêm liên kết mới).
      - Đồng bộ lại `exam_questions` và `exam_answer_keys` (xóa câu hỏi cũ của đề, tạo lại snapshot mới).
      - Nếu `publishImmediately === true`, gọi `publish_exam` RPC (hoặc update `status = 'published'`, `published_at = now()`).
    + Xây dựng `publishExistingDraftExamAction(examId: string)`:
      - Cho phép bấm "Xuất bản ngay" trực tiếp từ thẻ đề thi hoặc trang chi tiết.
    + Xây dựng `deleteDraftExamAction(examId: string)`:
      - Xóa an toàn bản nháp khỏi hệ thống khi giảng viên yêu cầu.
    + Gọi đầy đủ `revalidatePath`: `/teacher/exams`, `/teacher/exams/[examId]`, `/teacher/dashboard`, `/student/exams`, `/student/dashboard`.
  - [x] **Mục tiêu 4 (Cập nhật State Tức thì trên Client, Chuyển Tab & Kiểm thử Nghiệm thu)**:
    + Xử lý State Client tại `teacher-exams-client.tsx`:
      - Khi xuất bản thành công: Cập nhật status của đề sang `published`, tự động giảm `stats.draft` đi 1, tăng `stats.published` lên 1, đề biến mất khỏi tab `Bản nháp`.
      - Tự động chuyển tab hiển thị sang `Đã phát hành` (`published`) kèm thông báo rõ ràng: `"Đã xuất bản đề thi thành công! Đề thi đã được chuyển sang mục Đã phát hành."`.
    + Kiểm tra `npx tsc --noEmit` & `npm run build` đạt 0 lỗi (36/36 static/dynamic routes).
    + Local commit an toàn `574b4b7` (không push tự ý) và cập nhật commit hash.

- [x] **Phase 53 (Commit `2e79979`)**: Nâng cấp Bộ Đọc File Upload (DOCX/PDF) Nhận diện & Tách biệt Đáp án Tự luận + Lời giải Trắc nghiệm:
  - [x] **Mục tiêu 1 (Sửa lỗi dính Lời giải/Đáp án vào Phương án D của Câu Trắc nghiệm)**:
    + Nâng cấp `lib/document-parser.ts`:
      - Quét và cắt bỏ hoàn toàn các chuỗi `Đáp án: [A-D]. ...`, `Lời giải: ...`, `Giải thích: ...` ra khỏi nội dung phương án `D` (hoặc các phương án).
      - Gán chính xác `correct_option` từ chữ cái đáp án nếu có nhãn `Đáp án: [A-D]`.
      - Đưa toàn bộ phần giải thích phía sau vào trường `explanation` (`💡 Giải thích chi tiết`).
  - [x] **Mục tiêu 2 (Thuật toán 3 Tầng Nhận diện & Tách Đáp án cho Câu Tự luận)**:
    + Tầng 1: Tách theo tag `[RED_ANSWER]` trong XML Word: Đề bài (`question_text`) chỉ giữ chữ đen/mặc định; Lời giải (`model_answer`) gom toàn bộ các đoạn chữ đỏ theo từng ý `a)`, `b)`, `c)`.
    + Tầng 2: Tách theo từ khóa nhãn: `Đáp án:`, `Lời giải:`, `Hướng dẫn giải:`, `Thang điểm:`, `Rubric:`, `Trả lời:`...
    + Tầng 3: Nhận diện inline khi câu trả lời viết liền sau câu hỏi `a)`, `b)`, `c)`: Phân tách ranh giới mệnh đề hỏi (`Tìm...`, `Giải...`, `Tính...`) và mệnh đề giải (`Ta có...`, `Vì...`, `Do đó...`, `Vậy...`).
    + Tự động tạo gợi ý `grading_rubric` theo từng ý `a)`, `b)`, `c)` và đánh dấu `is_red_detected: true` cho tự luận.
    + Nâng cấp Prompt Groq AI trong `parseDocumentWithGroq` để đồng bộ chỉ thị bóc tách câu tự luận và làm sạch phương án D.
  - [x] **Mục tiêu 3 (Đồng bộ Giao diện Preview & Chỉnh sửa trong Modal `upload-document-modal.tsx`)**:
    + Câu trắc nghiệm: Ô D sạch sẽ, hiển thị khung `💡 Giải thích chi tiết:` bên dưới nếu có.
    + Câu tự luận:
      - Badge tím: `✅ Đã tách đáp án tự luận`.
      - Đề bài sạch sẽ hiển thị qua `<MathText />`.
      - Khung Tím chuẩn Ngân hàng câu hỏi hiển thị **`Đáp án tham khảo:`** và **`Thang điểm / Hướng dẫn chấm:`**.
      - Cho phép chỉnh sửa riêng biệt 3 ô: Đề bài, Đáp án tham khảo, và Rubric trong form chỉnh sửa inline.
  - [x] **Mục tiêu 4 (Kiểm thử Thực tế với file Test DOCX & Xác minh Build)**:
    + Chạy kiểm tra với file `Toan_10_5_trac_nghiem_2_tu_luan_dap_an_do.docx`.
    + Đảm bảo 5 câu trắc nghiệm sạch ô D, 2 câu tự luận tách trọn vẹn đề bài và khung tím đáp án tham khảo.
    + Kiểm tra `npx tsc --noEmit` & `npm run build` đạt 0 lỗi (36/36 static/dynamic routes).
    + Local commit an toàn `2e79979` (không push tự ý) và cập nhật commit hash.

- [x] **Phase 54 (Commit `e7a0502`)**: Đồng bộ Động "Gợi ý Nhanh" Theo Môn Học Đang Chọn Tại Trang Sinh Câu Hỏi AI & Gia Sư AI:
  - [x] **Mục tiêu 1 (Module Tiện Ích Trung Tâm `lib/subject-topic-suggestions.ts`)**:
    + Xây dựng hàm `getSubjectTopicSuggestions(subject?: { code?: string; name?: string; description?: string } | null): string[]`.
    + Chuẩn hóa nhận diện 7 nhóm môn học (Toán học, Lập trình/KTPM, CTDL & Giải thuật, Cơ sở dữ liệu, Mạng MT & HĐH, Khoa học tự nhiên & Ngoại ngữ/Đại cương, Fallback thông minh từ tên và mô tả môn học).
    + Cung cấp hàm kiểm tra `isPresetTopicSuggestion` để phát hiện chuyển đổi chủ đề tương thích mượt mà.
  - [x] **Mục tiêu 2 (Trang Sinh Câu Hỏi AI Độc Lập `components/teacher/ai-generator-standalone.tsx`)**:
    + Chuyển cụm `PROMPT_SUGGESTIONS` tĩnh thành gợi ý động liên kết trực tiếp với môn học đang chọn.
    + Khi giảng viên đổi môn trên dropdown: Tự động đổi danh sách gợi ý và tự động nạp gợi ý đầu tiên của môn mới nếu chủ đề cũ là gợi ý có sẵn hoặc đang để trống.
    + Thể hiện trạng thái Active trực quan rõ nét (`!bg-blue-600/20 !text-blue-700 dark:!text-blue-300 !border-blue-500 font-semibold ring-1 ring-blue-500/40`).
  - [x] **Mục tiêu 3 (Modal Sinh Câu Hỏi AI `components/teacher/ai-generator-modal.tsx`)**:
    + Bổ sung cụm pill Gợi ý nhanh động vào dưới ô nhập Chủ đề của modal.
    + Đồng bộ hành vi bấm chọn và highlight đồng nhất với trang AI Generator độc lập.
  - [x] **Mục tiêu 4 (Trang Gia Sư AI Giảng Viên & Sinh Viên `/teacher/ai-tutor` & `/student/ai-tutor`)**:
    + Nâng cấp danh sách câu hỏi mẫu / gợi ý hỗ trợ học tập đồng bộ theo môn học của giảng viên (phân công) và sinh viên (lớp đã ghi danh).
    + Cho phép bấm chuyển đổi nhanh giữa các môn học để cập nhật tức thì danh sách câu hỏi gợi ý.
  - [x] **Mục tiêu 5 (Kiểm Thử Type Check, Build Sản Phẩm & Commit An Toàn)**:
    + Chạy `npx tsc --noEmit` và `npm run build` đạt 0 lỗi (36/36 static/dynamic routes).
    + Tạo Local Commit an toàn `e7a0502` theo quy định `AGENTS.md` (không tự ý push).
    + Ghi mã commit hash vào `.antigravity/plans/active.md`.

- [x] **Phase 55 (Commit `070edec`)**: Sửa triệt để lỗi Gia sư AI bên Sinh viên (Trả lời đúng nội dung thật & Render Markdown + KaTeX):
  - [x] **Mục tiêu 1 (Sửa Lỗi Kết Nối & Tự Động Dò Model Khả Dụng Trong `lib/ai-provider.ts` & `app/api/chat-ai/route.ts`)**:
    + Cập nhật thứ tự ưu tiên model Groq: `llama-3.1-8b-instant`, `meta-llama/llama-4-scout-17b-16e-instruct`, `qwen/qwen3-32b`, `gemma2-9b-it`, `llama-3.3-70b-versatile`.
    + Tự động dò `GET /models` khi gặp `404 model_not_found`, tự động lọc model chat hợp lệ.
    + Tự động loại bỏ thẻ suy nghĩ `<think>[\s\S]*?</think>` trước khi trả lời.
    + Đảm bảo System Prompt đóng vai Gia sư AI Đại học Lạc Hồng (LHU) ân cần, giải thích cặn kẽ bằng KaTeX `$..$` và `$$...$$`.
  - [x] **Mục tiêu 2 (Nâng Cấp Bộ Trả Lời Dự Phòng Học Thuật Thông Minh `Smart Academic Responder`)**:
    + Xóa bỏ hoàn toàn văn bản mẫu sáo rỗng (`1. Bản chất vấn đề... 2. Phương pháp tiếp cận...`).
    + Tự động bóc tách số lượng câu hỏi $N$ (mặc định 5 câu) và chủ đề (Toán 10, Toán 11, Toán 12, Giải tích, Đại số, Xác suất, Lập trình OOP, Cấu trúc dữ liệu, CSDL, Mạng...).
    + Sinh ra đúng $N$ câu hỏi trắc nghiệm hoàn chỉnh khác nhau 100% kèm 4 lựa chọn A-B-C-D, đáp án đúng và lời giải chi tiết KaTeX.
    + Hỗ trợ giải phương trình, tính đạo hàm, tích phân, ma trận, xác suất từng bước cụ thể.
  - [x] **Mục tiêu 3 (Xây Dựng Component `ChatMessageContent` Render Markdown + KaTeX Chuyên Nghiệp)**:
    + Tạo component `components/chat/chat-message-content.tsx` xử lý triệt để:
      - Cắt gọt và hiển thị tiêu đề `### ...`, `## ...`, `# ...` sạch đẹp không lộ dấu `#`.
      - Render in đậm `**...**` qua thẻ `<strong>`, in nghiêng `*...*`, không lộ dấu `*`.
      - Đường kẻ ngang `---` thành `<hr />`.
      - Code block và inline code gọn gàng, có nền tối.
      - Tích hợp KaTeX cho cả `$inline$` và `$$block$$`.
    + Đồng bộ component này vào cả `/student/ai-tutor` và `/teacher/ai-tutor`.
  - [x] **Mục tiêu 4 (Kiểm Thử Type Check, Build Sản Phẩm & Commit An Toàn)**:
    + Chạy `npx tsc --noEmit` và `npm run build` đạt 0 lỗi (36/36 static/dynamic routes).
    + Test thực tế với câu hỏi `"Tạo 5 câu hỏi ôn tập toán 10"`.
    + Tạo Local Commit an toàn `070edec` theo quy định `AGENTS.md` (không tự ý push).
    + Ghi mã commit hash vào `.antigravity/plans/active.md`.

- [x] **Phase 56 (Commit `1dc1848`)**: Sửa triệt để lỗi Sinh câu hỏi AI bị lệch môn học / chủ đề (Sinh môn Lịch sử nhưng ra câu hỏi Đạo hàm Toán):
  - [x] **Mục tiêu 1 (Sửa Lời Gọi Groq AI Thực Tế Hoạt Động 100% Cho Mọi Môn Học Trong `lib/ai-question-generator.ts`)**:
    + Truyền đầy đủ `subjectName`, `subjectCode`, `topic`, `difficulty`, `questionType` và `notes` vào Prompt.
    + Thêm chỉ thị nghiêm ngặt: BẮT BUỘC 100% câu hỏi, phương án và giải thích phải thuộc đúng môn học `[Tên môn]` và đề tài `[Chủ đề]`.
    + Phân biệt quy tắc công thức: Chỉ dùng KaTeX `$..$` cho Toán/Lý/Hóa/Công thức; các môn xã hội/lý thuyết (Lịch sử, Địa lý, Ngữ văn, Tiếng Anh, Pháp luật...) dùng văn bản học thuật chuẩn xác, cấm chèn công thức toán.
    + Không throw Error khi thiếu API key mà tự động kích hoạt bộ sinh thông minh tương thích môn học.
    + Khắc phục lỗi 400 `json_validate_failed`: Thử tuần tự JSON Mode -> Text Mode + Resilient JSON Parser -> Fallback theo đúng môn học.
  - [x] **Mục tiêu 2 (Xóa Bỏ Mặc Định Môn Toán Trong Hàm Fallback & Xây Dựng Bộ Sinh Đa Môn Theo Đề Tài `generateDomainAwareFallbackQuestions`)**:
    + NGHIÊM CẤM trả về câu hỏi Đạo hàm / Toán khi môn học không phải là Toán.
    + Xây dựng bộ câu hỏi chuẩn xác cho môn Lịch sử (`SU`, `HIST`, `Lịch sử`): Chủ đề "Vai trò của Sử học", "Cách mạng công nghiệp", "Văn minh Đại Việt", "Cách mạng tháng Tám"... kèm 4 phương án A-B-C-D và lời giải thích.
    + Tích hợp bộ câu hỏi cho các môn Địa lý, Ngữ văn, Tiếng Anh, Sinh học, GDCD/Pháp luật/Kinh tế, CNTT và Toán học.
    + Xây dựng bộ tổng hợp linh hoạt cho BẤT KỲ môn học và đề tài mới nào: Phân tích trực tiếp `subjectName` và `topic` để sinh ra các câu hỏi xoay quanh 10 khía cạnh học thuật của chính đề tài đó.
  - [x] **Mục tiêu 3 (Cập Nhật "Gợi Ý Nhanh" Tự Động Theo Đúng Môn Học Đang Chọn Trong `lib/subject-topic-suggestions.ts`)**:
    + Bổ sung nhận diện chuyên sâu cho nhóm môn Lịch sử (`SU`, `HIST`, `Lịch sử`, `Sử`): 5 chủ đề tiêu biểu chuẩn SGK & ĐH.
    + Bổ sung nhận diện cho Địa lý (`DIA`), Ngữ văn (`VAN`), Sinh học (`SINH`), GDCD/Pháp luật...
    + Đảm bảo khi giảng viên chọn `SU · Lịch Sử` trên dropdown tại `/teacher/ai-generator`, danh sách pill gợi ý nhanh đổi ngay sang các chủ đề Sử học.
  - [x] **Mục tiêu 4 (Kiểm Thử Type Check, Build Sản Phẩm & Commit An Toàn)**:
    + Chạy `npx tsc --noEmit` và `npm run build` đạt 0 lỗi (36/36 static/dynamic routes).
    + Test thực tế với môn `SU · Lịch Sử` và chủ đề `Vai trò của Sử học`.
    + Tạo Local Commit an toàn theo quy định `AGENTS.md` (không tự ý push) với mã hash `1dc1848`.
    + Ghi mã commit hash vào `.antigravity/plans/active.md`.

- [x] **Phase 57 (Commit `662bd48`)**: Tổng kiểm tra & Sửa triệt để toàn bộ hệ thống AI (Gia sư AI Giảng viên, Sinh viên, Sinh câu hỏi AI) để trả về đúng 100% nội dung yêu cầu:
  - [x] **Mục tiêu 1 (Xóa Bỏ Hoàn Toàn Các Câu Trả Lời Khuôn Mẫu Sáo Rỗng Trong `lib/academic-fallback-responder.ts` & Toàn Bộ Codebase)**:
    + Xóa vĩnh viễn các chuỗi cố định: "Chào Thầy/Cô! Với tư cách là Trợ lý Học thuật...", "1. Mục tiêu sư phạm...", "2. Cấu trúc Rubric...", "1. Bản chất vấn đề... 2. Phương pháp tiếp cận... 3. Lời khuyên ôn tập...".
    + Xây dựng Engine Tri thức Đa Môn nội bộ: Phân tích Intent (quiz, essay, outline, rubric, solve/explain) + Số lượng ($N$) + Chủ đề/Môn học.
    + Khi nhận yêu cầu tạo câu hỏi trắc nghiệm (ví dụ: "Tạo 5 câu hỏi trắc nghiệm liên quan đến lịch sử việt nam"): Sinh đúng $N$ câu hỏi chuẩn xác về Lịch sử Việt Nam (Văn Lang, Ngô Quyền, Mông - Nguyên, CMT8 1945, Điện Biên Phủ 1954...) với 4 phương án A, B, C, D, đáp án đúng và giải thích chi tiết.
    + Tương tự cho Địa lý, Ngữ văn, Tiếng Anh, Sinh học, Vật lý, Hóa học, Kinh tế/Pháp luật, CNTT, Toán học và các chủ đề tự do.
  - [x] **Mục tiêu 2 (Sửa Module AI Trung Tâm 3 Lớp Bất Tử Trong `lib/ai-provider.ts` & `app/api/chat-ai/route.ts`)**:
    + Lớp 1: Gọi Groq API với Dynamic Model Discovery (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`...) và tự động fallback.
    + Lớp 2: Cổng AI Dự Phòng Tự Động Miễn Phí (`https://text.pollinations.ai/openai/chat/completions`) khi không có `GROQ_API_KEY`, key 401 hoặc lỗi rate-limit.
    + Lớp 3: Offline Smart Academic Engine khi mất mạng hoàn toàn.
    + Tinh chỉnh System Prompt: Bám sát 100% yêu cầu người dùng, tạo đúng $N$ câu hỏi về chủ đề $X$ khi được yêu cầu.
  - [x] **Mục tiêu 3 (Sửa Lỗi Hiển Thị Ký Tự Markdown Thô Trong `components/chat/chat-message-content.tsx`)**:
    + Xử lý triệt để Heading: Làm sạch hoặc render chuẩn `**` trong `### **Tiêu đề:**` không bao giờ để lộ dấu `**` hay `###`.
    + Xử lý triệt để đường kẻ ngang `---`, `***`, `___`.
    + Xử lý triệt để in đậm `**...**` và in nghiêng `*...*` thành `<strong>` và `<em>` sáng đẹp.
    + Render các lựa chọn trắc nghiệm và câu hỏi danh sách rõ ràng, thoáng mắt.
  - [x] **Mục tiêu 4 (Đồng Bộ Trang Sinh Câu Hỏi AI `/teacher/ai-generator` & Upload Đề Thi `/teacher/questions`)**:
    + Nâng cấp `lib/ai-question-generator.ts` gọi AI 3 lớp (kể cả khi không có `GROQ_API_KEY`, vẫn gọi Lớp 2 Free AI theo thời gian thực).
    + Đảm bảo chức năng Upload DOCX/PDF tách riêng câu tự luận vào khung Đáp án tham khảo.
  - [x] **Mục tiêu 5 (Kiểm Thử Type Check, Build Sản Phẩm & Commit An Toàn)**:
    + Chạy `npx tsc --noEmit` và `npm run build` đạt 0 lỗi (36/36 static/dynamic routes).
    + Test thực tế với các yêu cầu: "Tạo 5 câu hỏi trắc nghiệm liên quan đến lịch sử việt nam", "Soạn đề cương ôn tập môn Cơ sở dữ liệu", giải phương trình bậc hai.
    + Tạo Local Commit an toàn theo quy định `AGENTS.md` (không tự ý push) với mã hash `662bd48`.
    + Ghi mã commit hash vào `.antigravity/plans/active.md`.

- [x] **Phase 58 (Commit `51074eb`)**: Sửa triệt để lỗi ký tự thô (`\(...\)`, `|---|`, LaTeX/Markdown) trên Gia sư AI & Tổng rà soát ký tự toàn hệ thống (Admin, Giảng viên, Sinh viên):
  - [x] **Mục tiêu 1 (Nâng Cấp `<MathText />` Hỗ Trợ Mọi Cú Pháp LaTeX `components/ui/math-text.tsx`)**:
    + Viết hàm `normalizeMathInput(text: string)`:
      - Chuyển `\[...\]` / `\\\[...\\\]` thành `$$...$$`.
      - Chuyển `\(...\)` / `\\\(...\\\)` thành `$...$`.
      - Khử escape kép dư thừa: `\\frac` -> `\frac`, `\\sqrt` -> `\sqrt`, `\\circ` -> `\circ`, `\\angle` -> `\angle`, `\\cdot` -> `\cdot`, `\\le` -> `\le`, `\\ge` -> `\ge`.
      - Tự động nhận diện lệnh LaTeX đơn lẻ ngoài dấu `$` (`\frac{...}{...}`, `\sqrt{...}`, `^\circ`) và bọc vào `$...$`.
  - [x] **Mục tiêu 2 (Sửa Định Dạng Trả Lời Của Gia Sư AI & Bộ Render Khung Chat `components/chat/chat-message-content.tsx` & `app/api/chat-ai/route.ts`)**:
    + Cập nhật System Prompt trong `app/api/chat-ai/route.ts`: Nghiêm cấm trả về bảng Markdown `| # | Đề bài | A | B | C | D |`; bắt buộc trình bày khối dọc `**Câu 1:**`, `- **A.**`, `👉 **Đáp án đúng:**`, `💡 **Giải thích:**`; bắt buộc dùng `$ ... $` thay cho `\( ... \)`.
    + Cập nhật `components/chat/chat-message-content.tsx`:
      - Chuẩn hóa toàn bộ `\(...\)` thành `$...$` trước khi parse blocks.
      - Thêm bộ phân tích cú pháp Table Markdown: Gom các dòng `| ... |` và `|---|---|` thành block `table`, render thành bảng HTML bo góc, header nổi bật và render `<MathText />` trong từng ô cell.
  - [x] **Mục tiêu 3 (Tổng Rà Soát & Xử Lý Ký Tự Toàn Bộ 3 Giao Diện Admin, Giảng Viên, Sinh Viên)**:
    + Giảng viên: Chuẩn hóa ký tự câu hỏi AI và bóc tách tài liệu (`\(...\)` -> `$...$`, loại bỏ `\u0000`, `\ufffd`, giải mã HTML entities `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`, `&nbsp;`, Unicode NFC); đảm bảo CSV/Excel xuất ra có UTF-8 BOM (`\uFEFF`).
    + Sinh viên: Lọc sạch tag nội bộ `[CAMERA_REQUIRED:...]`, `[AUTO_GRADE_ESSAY:...]` khỏi hướng dẫn đề thi; đảm bảo mọi câu hỏi thi và xem lại bài làm đều render qua `<MathText />`.
    + Quản trị viên: Chuẩn hóa Unicode NFC cho danh sách môn học, giảng viên, sinh viên.
  - [x] **Mục tiêu 4 (Kiểm Thử Type Check, Build Sản Phẩm & Commit An Toàn)**:
    + Chạy `npx tsc --noEmit` và `npm run build` đạt 0 lỗi (36/36 routes).
    + Test thực tế với các chuỗi `\(ABC\)`, `\(30^\circ\)`, bảng markdown `|---|`.
    + Tạo Local Commit an toàn theo quy định `AGENTS.md` (không tự ý push) với mã hash `51074eb`.
    + Ghi mã commit hash vào `.antigravity/plans/active.md`.

- [x] **Phase 59 (Commit `8706b01`)**: Xóa nút "← Tổng quan" trên Topbar & Quét xóa toàn bộ nút quay về Tổng quan dư thừa ở cả 3 giao diện (Admin, Giảng viên, Sinh viên):
  - [x] **Mục tiêu 1 (Xóa nút "← Tổng quan" trên Thanh Topbar / Header của cả 3 phân hệ)**:
    + Rà soát và xóa bỏ nút `<Link href="/.../dashboard"><ArrowLeft /> Tổng quan</Link>` cùng vạch phân cách `|` trên Topbar tại `app/teacher/ai-tutor/page.tsx`, `app/student/ai-tutor/page.tsx` và các header tương ứng tại `app/teacher/assignments`, `app/teacher/grading`, `app/teacher/materials`, `app/teacher/subjects`.
    + Đồng bộ Topbar Skeleton trong `loading.tsx` của `teacher/ai-tutor`, `student/ai-tutor`, `teacher/subjects`.
    + Đảm bảo bố cục góc trên bên trái của Topbar cân đối, thoáng đãng, hiển thị tiêu đề trang hoặc ngày tháng trực tiếp, không bị lệch giao diện ở cả Light Mode và Dark Mode.
  - [x] **Mục tiêu 2 (Quét và Xóa Toàn Bộ Nút Quay Về Tổng Quan Dư Thừa Tại Cổng Giảng Viên `/teacher/**`)**:
    + Rà soát tất cả các trang: `/teacher/subjects`, `/teacher/classes`, `/teacher/materials`, `/teacher/assignments`, `/teacher/questions`, `/teacher/ai-generator`, `/teacher/exams`, `/teacher/exams/create`, `/teacher/exams/[examId]`, `/teacher/grading`, `/teacher/ai-tutor`...
    + Xóa bỏ triệt để các nút/link dư thừa: `"← Quay về Tổng quan"`, `"← Quay lại Dashboard"` trong empty state của `app/teacher/subjects/page.tsx`.
    + Thay nút "Quay lại Tổng quan" trong `components/teacher/ai-generator-standalone.tsx` thành "Kiểm tra môn học phụ trách" dẫn đến `/teacher/subjects`.
    + Chuẩn hóa link tạo lớp mới trong `app/teacher/subjects/page.tsx` trỏ đến `/teacher/classes#create-class-section`.
    + Giữ nguyên mục "Tổng quan" DUY NHẤT trên Sidebar bên trái của Giảng viên.
  - [x] **Mục tiêu 3 (Quét và Xóa Toàn Bộ Nút Quay Về Tổng Quan Dư Thừa Tại Cổng Sinh Viên `/student/**`)**:
    + Rà soát tất cả các trang: `/student/classes`, `/student/materials`, `/student/assignments`, `/student/exams`, `/student/exams/[examId]`, `/student/results`, `/student/ai-tutor`, `/chat`...
    + Xóa bỏ nút `"Về Tổng quan"` trong section header của `student/assignments`, `student/classes`, `student/exams`, `student/materials`.
    + Nâng cấp trang chi tiết đề thi `student/exams/[examId]`: đổi nút quay lại Bảng điều khiển / trang chủ thành `"Quay lại danh sách đề thi"` trỏ đúng về `/student/exams`.
    + Giữ nguyên mục "Tổng quan" DUY NHẤT trên Sidebar bên trái của Sinh viên.
  - [x] **Mục tiêu 4 (Quét và Xóa Toàn Bộ Nút Quay Về Tổng Quan Dư Thừa Tại Cổng Quản Trị Viên `/admin/**`)**:
    + Rà soát tất cả các trang: `/admin`, `/admin/teacher-access`, `/admin/student-management`, `/admin/subjects`...
    + Đảm bảo không có link/nút quay về Dashboard/Tổng quan dư thừa bên trong nội dung (vì Navbar ngang phía trên đã có sẵn mục "Tổng quan").
  - [x] **Mục tiêu 5 (Kiểm Thử Type Check, Build Sản Phẩm & Commit An Toàn)**:
    + Chạy `npx tsc --noEmit` & `npm run build` đạt 0 lỗi (36/36 static/dynamic routes).
    + Tạo Local Commit an toàn theo quy định `AGENTS.md` (tuyệt đối không tự ý push) với mã hash `8706b01`.
    + Ghi mã commit hash vào `.antigravity/plans/active.md`.

- [x] **Phase 60 (Commit `295b518`)**: Tối ưu hóa giao diện tự động điều chỉnh (Responsive) trên điện thoại & máy tính cho cả 3 phân hệ (Admin, Giảng viên, Sinh viên):
  - [x] **Mục tiêu 1 (Hệ Thống Điều Hướng & Sidebar Tự Động Co Giãn Desktop vs Mobile)**:
    + Cập nhật `TeacherSidebar` & `StudentSidebar`: Cung cấp cả Sidebar cố định desktop (`hidden lg:flex`) và Mobile Drawer slide-over (`fixed inset-y-0 left-0 z-50 w-72 bg-[#0A275C] dark:bg-[#0B1628]`) kích hoạt qua nút Hamburger Menu (`TeacherSidebarTrigger` / `StudentSidebarTrigger`) trên Topbar di động (`lg:hidden`).
    + Tự động đóng Drawer khi click chọn route, click ra vùng nền mờ backdrop (`fixed inset-0 z-40 bg-black/60`), hoặc ấn phím `Escape`.
    + Ghim cố định nút "Đăng xuất" và thông tin tài khoản ở đáy Drawer (`shrink-0`), 10 mục menu Giảng viên & 7 mục Sinh viên cuộn dọc mượt mà (`flex-1 overflow-y-auto`).
    + Cập nhật `AdminNav`: Desktop hiển thị đầy đủ thanh tab; mobile (`< md:`) hỗ trợ Drawer trượt ngang chuyên nghiệp với đầy đủ 4 phân hệ Quản trị viên, ThemeToggle và Đăng xuất.
  - [x] **Mục tiêu 2 (Tự Động Điều Chỉnh Lưới Thẻ & Khu Vực Thao Tác Nhanh)**:
    + Cập nhật 8 ô Thao tác nhanh tại `/teacher/dashboard`: `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-8 gap-3`, touch target >= 44px.
    + Cập nhật các thẻ Metric trên `/teacher/dashboard` & `/student/dashboard`: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4` (hoặc `lg:grid-cols-4`), hiển thị rộng rãi, không bị cắt cụt chữ.
    + Chuyển trang Tạo đề thi (`components/teacher/exam-create-form.tsx`): Hỗ trợ `grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] xl:grid-cols-[420px_minmax(0,1fr)]` chuyển đổi mượt mà giữa máy tính và điện thoại.
  - [x] **Mục tiêu 3 (Bảng Dữ Liệu Tables, Thanh Pill Tabs & Bộ Lọc Tìm Kiếm Trên Mobile)**:
    + Nâng cấp component gốc `components/ui/table.tsx`: Tự động bọc trong `<div className="relative w-full overflow-x-auto overscroll-x-contain rounded-xl">` với `min-w-[640px]`, nút thao tác có `whitespace-nowrap shrink-0`.
    + Thanh Pill Tabs + Ô tìm kiếm + Nút hành động: `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`, Tab cuộn ngang `no-scrollbar`, input & nút tự động giãn full trên mobile (`w-full sm:w-auto`).
  - [x] **Mục tiêu 4 (Tối Ưu Phòng Thi Trực Tuyến `/student/exams/[examId]` Trên Mobile)**:
    + Đồng hồ đếm ngược & nút nộp bài ghim cố định đỉnh (`sticky top-0 z-30 backdrop-blur-md`).
    + Bảng Mục Lục Câu Hỏi (Question Palette): Desktop cố định cột bên; trên mobile tích hợp nút mở Question Palette Drawer dạng Bottom Sheet trượt lên (`isMobilePaletteOpen`) giúp học sinh nhảy câu hỏi tức thì bất cứ lúc nào.
    + Khung Camera Giám sát AI (`ExamWebcamProctor`): Tự động thu nhỏ linh hoạt trên mobile (`w-36 sm:w-56 md:w-64 bottom-3 right-3`), nút thu nhỏ pill không che đáp án.
    + Công thức KaTeX MathText: Bổ sung `max-w-full overflow-x-auto py-1` và `break-words` chống tràn layout màn hình 360px–375px.
  - [x] **Mục tiêu 5 (Tối Ưu Khung Chat Gia Sư AI & Cửa Sổ Modal)**:
    + Khung Chat Gia sư AI: Chiều cao động `h-[100dvh]` và `h-[calc(100dvh-61px)]` không bị bàn phím ảo che khuất ô nhập tin nhắn.
    + Bong bóng tin nhắn: `max-w-[92%] sm:max-w-[80%] lg:max-w-[75%] break-words`.
    + Cỡ chữ ô nhập `<textarea>`: Đặt chuẩn `text-base sm:text-sm` (16px mobile) chống iOS Safari tự động zoom lệch màn hình.
    + Đồng bộ mọi Cửa sổ Modal / Dialog: Kích thước co giãn an toàn `w-[95vw] max-w-2xl max-h-[90dvh] overflow-y-auto p-4 sm:p-6 rounded-2xl`.
  - [x] **Mục tiêu 6 (Kiểm Thử Type Check, Build Sản Phẩm & Commit An Toàn)**:
    + Thêm `overflow-x: hidden;` cho `body` và utility `.no-scrollbar` trong `app/globals.css`.
    + Chạy `npx tsc --noEmit` & `npm run build` đạt 0 lỗi (36/36 routes).
    + Tạo Local Commit an toàn theo quy định `AGENTS.md` (tuyệt đối không tự ý push) với mã hash `295b518`.
    + Ghi mã commit hash vào `.antigravity/plans/active.md`.

- [x] **Phase 61 (Commit `3a58af5`)**: Nâng cấp toàn diện Gia sư AI hoạt động đa năng như Google Gemini (Xử lý mọi yêu cầu tự do, xóa bỏ bộ bắt từ khóa ép ra câu hỏi trắc nghiệm):
  - [x] **Mục tiêu 1 (Xóa bỏ cơ chế bắt từ khóa cứng nhắc ép ra câu hỏi trắc nghiệm)**:
    + Loại bỏ hoàn toàn việc phát hiện từ khóa môn học (`toán 10`, `lịch sử`, `oop`...) để ép trả về 5 câu hỏi trắc nghiệm A-B-C-D.
    + Xây dựng bộ nhận diện ý định thông minh `detectUserIntent(q)` và làm sạch chủ đề `extractCleanTopic(query)`: Kịch bản video, giáo án bài giảng, giải bài toán, viết code, dàn ý, giải thích chuyên sâu... phản hồi đúng 100% định dạng mong muốn theo phong cách Gemini.
    + Chỉ sinh câu hỏi/quiz khi và chỉ khi người dùng nêu rõ từ khóa tạo câu hỏi/đề thi (`tạo câu hỏi`, `trắc nghiệm`, `ra đề`, `quiz`).
  - [x] **Mục tiêu 2 (Kiến trúc kết nối LLM đa cổng chuẩn Gemini - Multi-Provider LLM Engine)**:
    + Cổng 1: Google Gemini API chính thức (`gemini-2.5-flash` / `gemini-2.0-flash` / `gemini-1.5-flash` qua REST endpoint nếu có `GEMINI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY`).
    + Cổng 2: Groq Cloud LLM (`llama-3.3-70b-versatile`, `meta-llama/llama-4-scout-17b-16e-instruct`, `llama-3.1-8b-instant`, `qwen/qwen3-32b` kèm auto-discovery models).
    + Cổng 3: Cloud LLM miễn phí không cần key (`https://text.pollinations.ai/openai/chat/completions` và fallback `GET https://text.pollinations.ai/...`).
    + Cổng 4: Offline Smart Academic Fallback không bao giờ bị lỗi ngay cả khi mất mạng.
  - [x] **Mục tiêu 3 (Thiết lập System Prompt đa năng & Bộ nhớ ngữ cảnh đa lượt Multi-turn Context)**:
    + Áp dụng System Prompt Gemini-style: Trợ lý AI Đa Năng giải quyết mọi tác vụ học thuật, sáng tạo kịch bản video, lập trình, giải thích chi tiết, định dạng KaTeX `$..$` / `$$..$$`.
    + Truyền lịch sử trò chuyện `messages: [{ role, content }]` (tối đa 16-20 lượt) thay vì chỉ một câu đơn lẻ, giúp AI hiểu ngữ cảnh trao đổi liên tục.
  - [x] **Mục tiêu 4 (Đồng bộ đồng nhất cả 2 endpoint `app/api/chat/route.ts` & `app/api/chat-ai/route.ts`)**:
    + Đảm bảo cả hai route (và phía client Giảng viên/Sinh viên) đều gọi thống nhất một engine đa cổng thông minh, không có route nào bị sót logic cũ.
  - [x] **Mục tiêu 5 (Kiểm thử, nghiệm thu & commit an toàn)**:
    + Test thực tế với 9/9 test cases (kịch bản video Toán 10, kịch bản video Lịch sử, kịch bản video OOP, viết code thuật toán, tóm tắt, giáo án, giải phương trình, tạo trắc nghiệm Toán/Sử).
    + Chạy `npx tsc --noEmit` & `npm run build` đạt 0 lỗi (36/36 routes).
    + Tạo Local Commit an toàn theo quy định `AGENTS.md` (tuyệt đối không tự ý push).
    + Ghi mã commit hash vào `.antigravity/plans/active.md`.

- [x] **Phase 62 (Commit `6d64322`)**: Rà soát toàn bộ giao diện & chức năng Web — Sửa triệt để lỗi mất Menu/Trang chủ khi thu nhỏ và bổ sung Sidebar kéo ra / thu gọn cho cả 3 phân hệ:
  - [x] **Mục tiêu 1 (Thiết kế Client Shell Component: `TeacherShell` & `StudentShell`)**:
    + Tạo `components/teacher/teacher-shell.tsx`:
      * Desktop (`lg:` trở lên): Hỗ trợ Sidebar kéo ra (`w-64`) / thu gọn (`w-20` chỉ icon kèm tooltip), nút toggle `PanelLeftClose`/`PanelLeftOpen`, lưu trạng thái vào `localStorage`.
      * Mobile (`< 1024px`): Luôn hiển thị Sticky Topbar (`h-14`) cố định trên đỉnh mọi trang, có nút Hamburger (`☰`) mở Drawer trượt ngang và Logo LHU liên kết về `/teacher/dashboard` (tuyệt đối không mất lối về Trang chủ).
      * Mobile Drawer: Trượt mượt từ cạnh trái (`w-72`), đầy đủ 10 route, tự động đóng khi chọn trang hoặc bấm nền mờ, nút Đăng xuất ghim cố định ở đáy.
    + Tạo `components/student/student-shell.tsx`:
      * Tương tự với đầy đủ 7 route Sinh viên, Sticky Topbar Mobile có nút `☰` và Logo LHU về `/student/dashboard`.
  - [x] **Mục tiêu 2 (Đưa Shell Điều Hướng lên Layout cấp phân hệ & Dọn dẹp 25 trang con)**:
    + Bọc `TeacherShell` tại `app/teacher/layout.tsx` và `StudentShell` tại `app/student/layout.tsx`.
    + Rà soát và gỡ bỏ việc render lặp `<TeacherSidebar ... />`, `<StudentSidebar ... />`, topbar mobile trùng lặp, và nút `ThemeToggle` thừa trong 17 trang Giảng viên và 8 trang Sinh viên.
    + Đảm bảo 100% các trang (kể cả `/teacher/classes`, `/teacher/subjects`, các trang `[id]`) đều tự động kế thừa Shell điều hướng chuẩn, không trang nào bị kẹt hay mất menu.
  - [x] **Mục tiêu 3 (Đồng bộ thanh điều hướng Admin `/admin/**`)**:
    + Logo LHU Admin luôn là Link về `/admin`.
    + Đảm bảo ở màn hình nhỏ `360px`, Header Admin không bị tràn chữ, Drawer mobile hiển thị mượt mà.
  - [x] **Mục tiêu 4 (Tổng rà soát toàn bộ Web & Sửa lỗi chính tả UI / Responsive)**:
    + Kiểm tra mọi bảng dữ liệu `<table>` nằm trong `overflow-x-auto`.
    + Chuẩn hóa tiêu đề trang + cụm nút hành động co giãn tự động `flex flex-col sm:flex-row`.
    + Sửa lỗi chính tả trong mô tả trang Quản lý Lớp học (`/teacher/classes`): *"quản lý tài liệu, bài tập và sinh viên"*.
    + Kiểm tra độ tương phản chữ ở cả Light Mode và Dark Mode.
  - [x] **Mục tiêu 5 (Kiểm thử, nghiệm thu & commit an toàn)**:
    + Kiểm tra responsive ở các độ phân giải `360px`, `768px`, `1024px`, `1440px`.
    + Chạy `npx tsc --noEmit` & `npm run build` đạt 0 lỗi (36/36 routes).
    + Tạo Local Commit an toàn theo quy định `AGENTS.md` (tuyệt đối không tự ý push).
    + Ghi mã commit hash vào `.antigravity/plans/active.md`.

- [x] **Phase 63 (Commit `5e03dd0`)**: Đồng bộ Sidebar kéo ra / thu gọn & rà soát toàn bộ giao diện, chức năng cho cả 3 phân hệ (Admin, Giảng viên, Học sinh):
  - [x] **Mục tiêu 1 (Thiết kế `AdminShell` với Sidebar kéo ra / thu gọn & Sticky Topbar Mobile)**:
    + Tạo `components/admin/admin-shell.tsx`:
      * Desktop (`lg:`): Sidebar kéo ra (`w-64`) / thu gọn (`w-20` có floating tooltip), nút toggle `PanelLeftClose`/`PanelLeftOpen`, lưu `localStorage`.
      * Mobile (`< 1024px`): Sticky Topbar (`h-14`) có nút Hamburger `☰` (`size-10`) + Logo Admin liên kết về `/admin` + ThemeToggle.
      * Mobile Drawer: Trượt mượt từ cạnh trái (`w-72`), đủ 4 route Admin, nút Đăng xuất ghim ở đáy.
    + Cập nhật `app/admin/layout.tsx` sử dụng `AdminShell`.
  - [x] **Mục tiêu 2 (Hoàn thiện cơ chế thu gọn tự động an toàn trong phòng thi Sinh viên `/student/exams/[examId]`)**:
    + Nâng cấp `StudentShell`: Khi học sinh vào trang làm bài thi (`/student/exams/[examId]`), Sidebar mặc định thu gọn (`w-20`) hoặc tự ẩn để giải phóng tối đa không gian làm bài, học sinh có thể mở lại khi cần.
    + Chuẩn hóa nút Hamburger `☰` trên Mobile của cả 3 phân hệ có kích thước bấm chuẩn `h-10 w-10` (`size-10`), padding topbar `px-3 sm:px-6`.
  - [x] **Mục tiêu 3 (Khung chat Gia sư AI & Chuẩn hóa chiều cao viewport)**:
    + Đảm bảo khung chat Gia sư AI ở cả Giảng viên và Học sinh dùng `h-[calc(100dvh-3.5rem)]` (trừ đúng 3.5rem = 56px của Sticky Topbar) để ô nhập liệu luôn hiển thị rõ ràng, không bị bàn phím ảo che khuất.
  - [x] **Mục tiêu 4 (Rà soát toàn diện Responsive & Màu sắc ở cả 3 phân hệ)**:
    + Đảm bảo các bảng `<table>` đều nằm trong `overflow-x-auto`.
    + Đảm bảo không có trang nào bị tràn thanh cuộn ngang (`overflow-x-hidden`).
    + Đảm bảo độ tương phản màu chữ Dark / Light Mode trên cả 3 phân hệ, tích hợp ThemeToggle vào desktop sidebar footer.
  - [x] **Mục tiêu 5 (Kiểm thử, nghiệm thu & commit an toàn)**:
    + Test responsive ở `360px`, `768px`, `1024px`, `1440px`.
    + Chạy `npx tsc --noEmit` & `npm run build` đạt 0 lỗi (36/36 routes).
    + Tạo Local Commit an toàn theo quy định `AGENTS.md` (tuyệt đối không tự ý push).
    + Ghi mã commit hash vào `.antigravity/plans/active.md`.

- [x] **Phase 64 (Commit `166adb5`)**: Chuyển đổi Gia sư AI thành Trợ lý AI Chat Tự do Đa Năng (Gỡ bỏ khung "Gợi ý theo môn" ở cả Giảng viên & Sinh viên):
  - [x] **Mục tiêu 1 (Xóa bỏ khung "Gợi ý theo môn" & Thiết kế Empty State chuẩn AI Chat hiện đại)**:
    + Tại `app/student/ai-tutor/page.tsx` và `app/teacher/ai-tutor/page.tsx`:
      * Xóa bỏ hoàn toàn khung viền xanh "Gợi ý câu hỏi ôn tập theo môn:" / "Gợi ý tác vụ nhanh theo môn:".
      * Gỡ bỏ logic chọn môn học `subjects`, `selectedSubjectId` và helper `getSubjectTopicSuggestions`.
      * Thiết kế Empty State phong cách Gemini/ChatGPT: Icon AI nổi bật, lời chào cá nhân hóa "Xin chào [Tên]! Hôm nay tôi có thể giúp gì cho bạn?", mô tả hỗ trợ đa năng mọi lĩnh vực, 4 thẻ gợi ý ý tưởng tự do (kịch bản video, viết code, giải bài tập, kế hoạch học tập).
      * Focus sẵn vào ô `<textarea>`, placeholder: "Hỏi Gia sư AI bất cứ điều gì bạn cần...".
  - [x] **Mục tiêu 2 (Cấu hình Backend AI Chat Tự do Toàn Năng `app/api/chat-ai/route.ts` & `lib/ai-provider.ts`)**:
    + Xóa bỏ mọi ràng buộc ép theo môn học hoặc câu trả lời cứng nhắc/trắc nghiệm tự ý.
    + Cập nhật System Prompt chuẩn Trợ lý AI Toàn Năng (General-Purpose AI Assistant) xử lý mọi môn học, mọi lĩnh vực và mọi dạng tác vụ (giải bài, viết code, soạn giáo án, kịch bản video, dịch thuật, trò chuyện tự nhiên).
    + Duy trì thứ tự kết nối LLM 3 cổng: Cổng 1 Google Gemini API -> Cổng 2 Groq API -> Cổng 3 Free AI Gateway (Pollinations OpenAI-compatible).
    + Nếu mất kết nối mạng hoàn toàn: Phản hồi thông báo lỗi kết nối rõ ràng kèm nút "Thử gửi lại" (tuyệt đối không in câu trả lời giả mạo).
  - [x] **Mục tiêu 3 (Nâng cấp trải nghiệm Chat UX & Dọn nút thừa)**:
    + Nâng cấp `components/chat/chat-message-content.tsx`: Thêm nút Sao chép (Copy code) trong khối Code Block.
    + Thêm nút Sao chép (Copy) nhỏ gọn dưới mỗi bong bóng tin nhắn trả lời của AI.
    + Hiển thị trạng thái đang suy nghĩ: "Đang soạn câu trả lời..." với 3 dấu chấm nhảy động mượt mà.
    + Hỗ trợ auto-resize `<textarea>`, phím Enter để gửi và Shift + Enter để xuống dòng.
    + Ẩn nút `ThemeToggle` trong header trang chat trên Mobile (`hidden lg:flex`) để không bị lặp 2 nút chuyển giao diện với Topbar Shell.
  - [x] **Mục tiêu 4 (Kiểm thử thực tế, nghiệm thu & commit an toàn)**:
    + Test 4 câu hỏi thực tế: Kịch bản video biến đổi khí hậu, Code Python số nguyên tố, Định luật II Newton, Kế hoạch ôn thi 7 ngày.
    + Chạy `npx tsc --noEmit` & `npm run build` đạt 0 lỗi (36/36 routes).
    + Tạo Local Commit an toàn theo quy định `AGENTS.md` (tuyệt đối không tự ý push).
    + Cập nhật commit hash vào `.antigravity/plans/active.md`.

- [x] **Phase 65 (Commit `017739d`)**: Build lại định dạng AI Chat — Cấm xuất bảng, hiển thị chi tiết từng dòng & sửa lỗi `**` + thanh cuộn phân số KaTeX (Cả Giảng viên & Học sinh):
  - [x] **Mục tiêu 1 (Cấm AI xuất bảng Markdown & Ép trình bày chi tiết từng dòng trong System Prompt)**:
    + Cập nhật System Prompt trong `app/api/chat-ai/route.ts`: Cấm tuyệt đối bảng Markdown (`| ... |`, `|---|---|`), chỉ dùng khi người dùng ghi rõ chữ "lập bảng".
    + Ép định dạng trắc nghiệm theo bố cục dọc: Mỗi phương án A, B, C, D trên 1 dòng riêng biệt, bắt buộc có Đáp án đúng và Giải thích chi tiết từng bước.
    + Tự động chèn lời nhắc cấm bảng vào cuối tin nhắn cuối của người dùng.
  - [x] **Mục tiêu 2 (Module Anti-Table Post-Processor `lib/anti-table-processor.ts`)**:
    + Viết hàm `convertMarkdownTablesToLines(content)` chạy ở cả Backend (`/api/chat-ai`) và Frontend.
    + Tự động bóc tách các bảng câu hỏi trắc nghiệm thành từng câu dọc, tách 4 phương án dính liền (A. ... B. ... C. ... D. ...) thành 4 dòng riêng biệt kèm Đáp án đúng và Giải thích.
    + Bóc tách các bảng nội dung khác (kế hoạch, so sánh) thành danh sách gạch đầu dòng dọc thoáng mắt.
  - [x] **Mục tiêu 3 (Đồng bộ Component `ChatMessageRenderer.tsx` & Sửa triệt để lỗi lộ `**`)**:
    + Tạo `components/chat/ChatMessageRenderer.tsx` dùng chung cho cả 2 giao diện `/teacher/ai-tutor` và `/student/ai-tutor`.
    + Loại bỏ hoàn toàn mọi ký tự `**` thô mồ côi khỏi giao diện.
    + Khối trắc nghiệm có badge xanh A, B, C, D căn lề thẳng hàng; khối Đáp án đúng có pill xanh ngọc nổi bật; khối Giải thích chi tiết có card bo góc thoáng mắt.
    + Tích hợp nút Sao chép mã nguồn cho Code Block.
  - [x] **Mục tiêu 4 (Sửa triệt để lỗi thanh cuộn mini dính vào phân số KaTeX)**:
    + Trong `components/ui/math-text.tsx`: Xóa bỏ hoàn toàn `overflow-x-auto` và `max-w-full` khỏi thẻ `<span>` bọc inline math.
    + Trong `app/globals.css`: Thiết lập `.katex { overflow: visible !important; }`, `.katex-html { overflow: visible !important; }`, và `.katex-display { overflow-x: auto !important; overflow-y: hidden !important; padding: 0.5rem 0 !important; }`.
  - [x] **Mục tiêu 5 (Kiểm thử, nghiệm thu & commit an toàn)**:
    + Chạy `npx tsc --noEmit` & `npm run build` đạt 0 lỗi (36/36 routes).
    + Tạo Local Commit an toàn theo quy định `AGENTS.md` (tuyệt đối không tự ý push).
    + Cập nhật commit hash `017739d` vào `.antigravity/plans/active.md`.

- [x] **Phase 66 (Commit `21a9303`)**: Tự động chiếu toàn màn hình & ẩn hoàn toàn thanh Menu khi làm bài thi, tự động thoát Fullscreen khi nộp bài:
  - [x] **Mục tiêu 1 (Ẩn hoàn toàn Sidebar & Topbar Shell trong lúc làm bài thi)**:
    + Nâng cấp `StudentShell` (`components/student/student-shell.tsx`): Lắng nghe tín hiệu `exam-fullscreen-mode` để ẩn hoàn toàn `<aside>` Sidebar, `<header>` Topbar Mobile và Drawer khi đang làm bài.
    + Bọc container phòng thi đang diễn ra trong `fixed inset-0 z-[100] w-screen h-screen overflow-y-auto bg-slate-50 dark:bg-[#09111E]`.
    + Chỉ hiển thị Header riêng biệt của phòng thi (Logo LHU, tên đề, đồng hồ đếm ngược, nút nộp bài, ThemeToggle).
  - [x] **Mục tiêu 2 (Tự động bật Fullscreen API khi bấm "Bắt đầu làm bài" & Lớp phủ khóa màn hình khi thoát Fullscreen)**:
    + Xây dựng bộ hàm `enterFullscreenSafe()` và `exitFullscreenSafe()` hỗ trợ đa trình duyệt trong `lib/fullscreen.ts`.
    + Kích hoạt Fullscreen ngay trong sự kiện `onClick` của nút "Bắt đầu làm bài".
    + Xử lý F5 hoặc ấn `Esc`: Hiển thị Lớp phủ khóa màn hình (Fullscreen Lock Overlay) che mờ đề thi kèm cảnh báo và nút "🖥️ Vào chế độ Toàn màn hình để tiếp tục làm bài".
  - [x] **Mục tiêu 3 (Tự động thoát Fullscreen & Hiện lại Menu khi nộp bài hoặc hết giờ)**:
    + Trong hàm nộp bài `handleSubmitConfirm`, `handleForceSubmit` và `handleAutoSubmitOnTabViolation`: Gọi `await exitFullscreenSafe()`, chuyển `isSubmitted = true`, phát `active: false` và gỡ bỏ listener vi phạm.
    + Sidebar và Shell hiển thị lại bình thường ở màn hình kết quả / điểm số.
    + Cleanup khi unmount phòng thi: Gọi `exitFullscreenSafe()` và tắt cờ fullscreen.
  - [x] **Mục tiêu 4 (Sửa lỗi hiển thị ký tự `\%` trong đề thi `20\%`, `50\%`...)**:
    + Trong `components/ui/math-text.tsx`: Tự động thay thế `\%` thành `%` ngoài các khối công thức `$..$` / `$$..$$`.
  - [x] **Mục tiêu 5 (Kiểm thử, nghiệm thu & commit an toàn)**:
    + Chạy `npx tsc --noEmit` & `npm run build` đạt 0 lỗi (36/36 routes).
    + Tạo Local Commit an toàn theo quy định `AGENTS.md` (tuyệt đối không tự ý push).
    + Cập nhật commit hash `21a9303` vào `.antigravity/plans/active.md`.

- [x] **Phase 67 (Commit `4d66a53`)**: Thêm tính năng Bật/Tắt "Xem đáp án đúng/sai sau khi nộp bài" & Nâng cấp ngăn kéo "Gia sư AI chữa đề" hiển thị danh sách câu hỏi đã làm:
  - [x] **Mục tiêu 1 (Cấu hình Bật/Tắt xem đáp án ở Cổng Giảng viên & Migration DB)**:
    + Tạo migration SQL `supabase/migrations/20261122_add_show_answers_after_submit_to_exams.sql` (`ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS show_answers_after_submit BOOLEAN NOT NULL DEFAULT true`).
    + Nâng cấp `lib/exam-auto-grade.ts`: Viết hàm `isShowAnswersAfterSubmit(exam)` (default `true` trừ khi `false` hoặc `[SHOW_ANSWERS:false]`), cập nhật `cleanExamInstructions` và `appendExamInstructionTags` xử lý cờ `[SHOW_ANSWERS:true/false]` cho Zero-Crash Fallback.
    + Cập nhật `components/teacher/exam-create-form.tsx`: Thêm toggle switch "Cho phép học sinh xem đáp án đúng/sai sau khi nộp bài" kèm icon `Eye` và badge trạng thái. Hỗ trợ nạp lại khi chỉnh sửa bản nháp (`editId`).
    + Cập nhật `app/teacher/exams/create/actions.ts`: Lưu `showAnswersAfterSubmit` với cơ chế 3 lần thử fallback an toàn, và thêm action `toggleExamAnswerVisibilityAction` để bật/tắt nhanh ngay trên trang chi tiết đề thi `/teacher/exams/[examId]`.
    + Tạo component `ExamAnswerVisibilityToggle.tsx` trên trang `/teacher/exams/[examId]` cho phép giảng viên mở/khóa đáp án sau khi cả lớp thi xong.
    + Thêm badge `👁️ Cho xem đáp án` / `🔒 Ẩn đáp án` tại danh sách đề thi giảng viên và sinh viên.
  - [x] **Mục tiêu 2 (Tính năng Xem chi tiết đáp án đúng/sai cho Sinh viên & Bảo mật Server-side)**:
    + Cập nhật `lib/student-exam.ts`: Thêm `show_answers_after_submit` vào `StudentExamDetail`.
    + Trong bảng "Lịch sử các lần làm bài" (`app/student/exams/[examId]/page.tsx` và `components/student/student-exam-history-table.tsx`):
      * Nếu `showAnswersAfterSubmit === true`: Thêm nút `👁️ Xem đáp án` (màu xanh dương/ngọc nổi bật) bên cạnh nút `✨ Hỏi gia sư AI`.
      * Nếu `showAnswersAfterSubmit === false`: Hiển thị badge `🔒 Đáp án đang ẩn`.
    + Xây dựng Component `ExamAnswerReviewModal.tsx`:
      * Thanh tổng kết: Điểm tổng, số câu Làm đúng (xanh), Làm sai (đỏ), Chưa làm (xám).
      * Bộ lọc nhanh: Tất cả, ❌ Câu làm sai, ✅ Câu làm đúng, 📝 Tự luận.
      * Danh sách chi tiết từng câu (đúng thứ tự thí sinh đã làm với `shuffleExamQuestions`):
        - Trắc nghiệm: 4 phương án A-B-C-D, đánh dấu rõ đáp án đã chọn (xanh nếu đúng, đỏ nếu sai), đánh dấu đáp án đúng kèm icon, giải thích chi tiết.
        - Tự luận: bài làm học sinh, đáp án tham khảo/rubric, điểm đạt được, nhận xét của giảng viên.
        - Nút `✨ Hỏi Gia sư AI câu này` liên kết trực tiếp sang ngăn kéo chữa đề.
    + Tạo Server Action / API an toàn lấy chi tiết bài làm: Nếu `showAnswersAfterSubmit === false`, loại bỏ toàn bộ `correct_answer`, `is_correct`, `explanation`, `grading_rubric` trước khi trả về client.
  - [x] **Mục tiêu 3 (Nâng cấp toàn diện Ngăn kéo "Gia sư AI chữa đề" & Nạp danh sách câu hỏi thực tế)**:
    + Nâng cấp Backend `lib/student-exam-review.ts` và `app/api/student/exam-tutor/route.ts`:
      * Hàm `getStudentAttemptReviewData(attemptId)`: Lấy toàn bộ câu hỏi của lượt thi (đúng thứ tự shuffle theo seed `attemptId`), bài làm học sinh, điểm số và đáp án đúng (chỉ khi được phép xem).
      * Trả về danh sách câu hỏi trong phản hồi `action === 'initialize'`.
      * Truyền toàn bộ câu hỏi (Câu 1 -> Câu N) vào System Prompt của AI.
      * Quy tắc bảo mật: Nếu `showAnswers === true`, AI phân tích đáp án đúng và lý do sai. Nếu `showAnswers === false`, AI chỉ hướng dẫn phương pháp giải và công thức, tuyệt đối KHÔNG tiết lộ trực tiếp đáp án đúng.
      * Định dạng trả lời: Trình bày chi tiết từng dòng, không xuất bảng Markdown, công thức KaTeX chuẩn đẹp với `<ChatMessageRenderer />`.
    + Nâng cấp Frontend `components/student/exam-tutor-drawer.tsx`:
      * Mở rộng chiều rộng drawer (`w-full sm:w-[560px] lg:w-[640px]`).
      * Khu vực Danh sách Câu hỏi Bài Thi: Thanh lọc nhanh (Tất cả, ❌ Câu làm sai), Lưới nút số câu hỏi (Câu 1, 2, ..., N) với màu sắc trực quan (🔴 Đỏ, 🟢 Xanh, ⚪ Xám).
      * Tương tác 1 chạm: Bấm vào câu hỏi -> ghim câu hỏi đang hỏi hoặc tự động gửi câu hỏi giải thích chi tiết.
      * Nút nhanh "🔥 Chữa toàn bộ các câu mình làm sai".
      * Hỗ trợ focus ngay vào câu hỏi được chọn khi mở từ nút `✨ Hỏi Gia sư AI câu này` của Modal Xem đáp án.
  - [x] **Mục tiêu 4 (Kiểm thử thực tế, nghiệm thu & commit an toàn)**:
    + Kiểm tra tạo đề BẬT và TẮT xem đáp án bên Giảng viên.
    + Kiểm tra bật/tắt nhanh đáp án tại `/teacher/exams/[examId]`.
    + Kiểm tra hiển thị nút "Xem đáp án" và ngăn kéo Gia sư AI bên Sinh viên.
    + Chạy `npx tsc --noEmit` & `npm run build` đạt 0 lỗi (36/36 routes).
    + Tạo Local Commit an toàn theo quy định `AGENTS.md` (tuyệt đối không tự ý push).
    + Cập nhật commit hash `4d66a53` vào `.antigravity/plans/active.md`.

- [x] **Phase 68 (Commit `c1ed600`)**: Chuẩn hóa đều 100% chiều cao thẻ, căn lề & bố cục lưới trên mọi giao diện, mọi trang (Admin, Giảng viên, Học sinh):
  - [x] **Mục tiêu 1 (Khắc phục nguyên nhân gốc rễ & Quy tắc chuẩn hóa Grid / Card Equalization Rules)**:
    + Áp dụng `items-stretch` trên mọi container `grid` chứa các thẻ cùng hàng.
    + Thẻ con trực tiếp (`<Link>`, `<button>`, `<div>`): Bắt buộc `block h-full w-full text-left`.
    + Khối `Card`: `h-full flex flex-col justify-between` với `CardContent` có `flex-1 flex flex-col justify-between`.
    + Chân thẻ (Buttons, Links): Bắt buộc đặt `mt-auto pt-3` hoặc `mt-auto pt-4` để căn thẳng hàng ngang 100%.
    + Chuẩn hóa khung icon không bị chói trắng trong Dark Mode (dùng `bg-...-500/15 text-... dark:text-...`).
  - [x] **Mục tiêu 2 (Chuẩn hóa toàn diện Phân hệ Sinh viên `/student/**`)**:
    + `/student/dashboard`: 4 thẻ KPI đầu trang bằng nhau 100% (`min-h-[132px]`), sửa màu nền icon Dark Mode; 5 thẻ `KHU VỰC HỌC TẬP` đều hàng, chân thẻ thẳng tắp; 3 thẻ `Đề thi đang mở` chân nút thẳng hàng.
    + `/student/classes`: Lưới thẻ lớp học dùng `items-stretch`, `h-full`, `min-h-[3rem]` cho tiêu đề, chân nút `mt-auto`.
    + `/student/exams`: Lưới thẻ đề thi dùng `items-stretch`, `h-full flex flex-col justify-between`, nút "Vào phòng thi" `mt-auto`.
    + `/student/materials`: Khung tìm kiếm, chọn lớp, thẻ tài liệu đều hàng.
    + `/student/assignments`: Thẻ bài tập học sinh, nút nộp bài, huy hiệu trạng thái.
    + `/student/results`: 4 thẻ thống kê đầu trang, lưới thẻ kết quả đề thi `items-stretch`, cụm nút `mt-auto pt-4`.
  - [x] **Mục tiêu 3 (Chuẩn hóa toàn diện Phân hệ Giảng viên `/teacher/**`)**:
    + `/teacher/dashboard`: 5 thẻ KPI đầu trang bằng nhau 100%; 8 ô `Thao tác nhanh` đều nhau (`h-full min-h-[104px]`, label `min-h-[2.5rem]`).
    + `/teacher/subjects`: 3 thẻ KPI đầu trang, lưới thẻ môn học `items-stretch` + `CardFooter` `mt-auto`.
    + `/teacher/classes`: 3 thẻ KPI đầu trang, lưới thẻ lớp học `items-stretch` + `mt-auto` cho cụm nút.
    + `/teacher/exams`: 4 thẻ KPI đầu trang (`TỔNG ĐỀ THI`, `ĐÃ PHÁT HÀNH`, `BẢN NHÁP`, `ĐÃ ĐÓNG / LƯU TRỮ`) bằng nhau 100%; Lưới thẻ đề thi `items-stretch` + cụm nút chân thẻ `mt-auto pt-3`.
    + `/teacher/materials`: 4 thẻ KPI đầu trang, thẻ tài liệu đều hàng.
    + `/teacher/assignments`: 4 thẻ KPI đầu trang, lưới thẻ bài tập `items-stretch` + nút chấm bài `mt-auto`.
    + `/teacher/questions` & `/teacher/ai-generator`: 4 ô phương án A, B, C, D trong lưới 2x2 dùng `items-stretch` và `h-full`.
  - [x] **Mục tiêu 4 (Chuẩn hóa toàn diện Phân hệ Quản trị viên `/admin/**`)**:
    + `/admin`: Thống kê hệ thống, 2 thẻ quản trị lớn chuẩn EdTech (`items-stretch`, `h-full flex flex-col justify-between`).
    + `/admin/teacher-access`: Thẻ KPI đầu trang bằng nhau 100%.
    + `/admin/student-management`: 3 thẻ KPI đầu trang bằng nhau 100%.
    + `/admin/subjects`: 3 thẻ KPI đầu trang bằng nhau 100%, thanh công cụ tìm kiếm và nút thêm mới đồng bộ chiều cao `h-10`.
  - [x] **Mục tiêu 5 (Kiểm thử thực tế, nghiệm thu & commit an toàn)**:
    + Chạy `npx tsc --noEmit` & `npm run build` đạt 0 lỗi (36/36 routes).
    + Tạo Local Commit an toàn theo quy định `AGENTS.md` (tuyệt đối không tự ý push).
    + Cập nhật commit hash vào `.antigravity/plans/active.md`.

- [x] **Phase 69 (Commit `078a896` & `48693a9`)**: Sửa triệt để lỗi ký tự LaTeX nhiều dòng (`$$...$$`), căn lề trái khung Chat AI, nâng cấp toàn diện `<MathText />` & tổng rà soát lỗi ký tự toàn bộ website (Admin, Giảng viên, Học sinh).

- [x] **Phase 70 (Commit `de8e83e`)**: Sửa lỗi 404 nút Tài liệu / Bài tập trên thẻ Lớp học & Tổng rà soát, kiểm thử toàn bộ Button / Link / Route trên cả 3 giao diện (Admin, Giảng viên, Học sinh):
  - [x] **Mục tiêu 1 (Sửa lỗi 404 thẻ Lớp học & Tạo Route Redirect an toàn phía Giảng viên)**:
    + Cập nhật `app/teacher/classes/page.tsx`: Nút Tài liệu dẫn về `/teacher/materials?classId=${cls.id}` + `title`/`aria-label` rõ ràng; Nút Bài tập dẫn về `/teacher/assignments?classId=${cls.id}` + `title`/`aria-label` rõ ràng; Nút `DS Sinh viên` dẫn chuẩn về `/teacher/classes/${cls.id}`.
    + Tạo route redirect phòng thủ `app/teacher/classes/[classId]/materials/page.tsx` -> `redirect(\`/teacher/materials?classId=${classId}\`)`.
    + Tạo route redirect phòng thủ `app/teacher/classes/[classId]/assignments/page.tsx` -> `redirect(\`/teacher/assignments?classId=${classId}\`)`.
  - [x] **Mục tiêu 2 (Hỗ trợ tự động lọc theo `classId` tại `/teacher/materials` và `/teacher/assignments`)**:
    + Nâng cấp `app/teacher/materials/page.tsx` & `components/teacher/teacher-materials-client.tsx`: Nhận query param `classId`, tự động lọc danh sách tài liệu theo lớp đó, điền sẵn lớp trong modal đăng tải, hiển thị banner/nút "Xem tất cả lớp" để bỏ lọc.
    + Nâng cấp `app/teacher/assignments/page.tsx` & `components/teacher/teacher-assignments-client.tsx`: Nhận query param `classId`, tự động lọc danh sách bài tập theo lớp đó, điền sẵn lớp trong modal tạo bài, hiển thị dropdown/banner và nút "Xem tất cả lớp" để bỏ lọc.
  - [x] **Mục tiêu 3 (Đồng bộ phân hệ Sinh viên & Tạo Route Redirect phòng thủ)**:
    + Cập nhật `app/student/classes/page.tsx`: Nút Tài liệu dẫn về `/student/materials?classId=${classItem.id}`, nút Bài tập dẫn về `/student/assignments?classId=${classItem.id}`.
    + Nâng cấp `app/student/materials/page.tsx` & `components/student/student-class-materials.tsx`: Hỗ trợ đọc `?classId=...` và lọc sẵn theo lớp.
    + Nâng cấp `app/student/assignments/page.tsx` & `components/student/student-assignments.tsx`: Hỗ trợ đọc `?classId=...` và lọc sẵn bài tập của lớp đó.
    + Tạo route redirect phòng thủ `app/student/classes/[classId]/materials/page.tsx` -> `redirect(\`/student/materials?classId=${classId}\`)`.
    + Tạo route redirect phòng thủ `app/student/classes/[classId]/assignments/page.tsx` -> `redirect(\`/student/assignments?classId=${classId}\`)`.
  - [x] **Mục tiêu 4 (Quét tĩnh toàn bộ hệ thống phát hiện 100% Link chết 404 & Button lỗi)**:
    + Viết script quét đối chiếu toàn bộ `page.tsx` với mọi `href`, `router.push`, `redirect` trong `app/` và `components/`.
    + Kiểm tra mọi thẻ `<button>` (thiếu `onClick`, button lồng `<Link>`, lồng sai cú pháp HTML, kẹt `disabled`).
    + Rà soát toàn bộ các nút bấm và liên kết trên cả 3 phân hệ (Admin, Giảng viên, Học sinh).
  - [x] **Mục tiêu 5 (Kiểm thử thực tế, nghiệm thu & commit an toàn)**:
    + Kiểm tra trực tiếp chuyển hướng từ thẻ lớp 10A1 sang `/teacher/materials?classId=...` và `/teacher/assignments?classId=...` lọc chuẩn xác.
    + Chạy `npx tsc --noEmit` & `npm run build` đạt 0 lỗi (36/36 routes).
    + Tạo Local Commit an toàn theo quy định `AGENTS.md` (tuyệt đối không tự ý push).
    + Cập nhật commit hash `de8e83e` vào `.antigravity/plans/active.md`.

- [x] **Phase 71 (Commit `001e5c6`)**: Sửa triệt để lỗi giao diện điện thoại bị tràn / che khuất mép phải & Tổng rà soát, kiểm thử mobile toàn hệ thống (Admin, Giảng viên, Học sinh):
  - [x] **Mục tiêu 1 (Khóa tràn ngang tại Layout Shell & Global CSS)**:
    + Cập nhật `app/globals.css` và `app/layout.tsx`: `html, body` có `max-width: 100%; overflow-x: clip;`, body có `w-full max-w-full overflow-x-clip`.
    + Chuẩn hóa Flex layout trên cả 3 Shell (`TeacherShell`, `StudentShell`, `AdminShell`): Thẻ bọc ngoài có `w-full max-w-full min-h-dvh overflow-x-clip`, Khung bên phải có `flex-1 min-w-0 w-full max-w-full flex flex-col`, Khung con chứa nội dung có `flex-1 min-w-0 w-full max-w-full overflow-x-clip`.
    + Logo LHU Topbar Mobile: Đổi sang `variant="framed"` để có khung nền sáng nhẹ bo góc, chữ "ĐẠI HỌC LẠC HỒNG" luôn rõ nét trên Dark Mode, không bị chìm vào nền tối.
  - [x] **Mục tiêu 2 (Sửa triệt để trang `/teacher/exams` & Xóa nút ThemeToggle trùng lặp toàn web)**:
    + `app/teacher/exams/page.tsx`: Xóa bỏ thẻ `<ThemeToggle />` bị lặp bên cạnh nút "+ Tạo đề thi mới"; Bỏ bọc thừa `min-h-screen`, chuẩn hóa `<main>` với `p-4 sm:p-6 lg:p-8 w-full min-w-0 max-w-full`.
    + Quét và xóa toàn bộ các nút ThemeToggle bị trùng lặp bên trong nội dung trang con ở cả 3 phân hệ (chỉ giữ trên Topbar / Shell Header).
    + `components/teacher/teacher-exams-client.tsx`:
      * 4 thẻ thống kê: `grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 w-full min-w-0`, mỗi Card có `w-full min-w-0` bo tròn 4 góc đều tăm tắp.
      * Thanh Tab lọc: Container bọc `w-full max-w-full overflow-x-auto no-scrollbar pb-1`, các nút không làm phình trang.
      * Header: Tiêu đề + mô tả tự xuống dòng `break-words`, nút tạo đề `w-full sm:w-auto`.
  - [x] **Mục tiêu 3 (Tổng rà soát & Chuẩn hóa Mobile cho mọi trang ở cả 3 phân hệ)**:
    + Phân hệ Giảng viên:
      * `/teacher/dashboard`: 5 thẻ KPI, 8 ô Thao tác nhanh (`grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 min-w-0`), Biểu đồ Recharts `ResponsiveContainer width="100%"`.
      * `/teacher/questions`: Thanh lọc nhiều nút dùng `flex-wrap gap-2 w-full min-w-0`; Modal upload và modal câu hỏi khít mobile.
      * `/teacher/classes` & `/teacher/classes/[classId]`: Thẻ lớp, nút thao tác, bảng sinh viên bọc `overflow-x-auto`.
      * `/teacher/grading` & `/teacher/grading/[attemptId]`: Bảng hàng đợi `overflow-x-auto`, split-view chuyển thành xếp dọc 1 cột trên mobile.
      * `/teacher/ai-generator` & `/teacher/ai-tutor`: Form gợi ý `flex-wrap`, khung chat `min-w-0 break-words`.
    + Phân hệ Sinh viên:
      * `/student/dashboard`: KPI, 5 thẻ Khu vực học tập, Cần làm ngay chuẩn 100% chiều ngang `360px`.
      * `/student/exams` & `/student/exams/[examId]`: Bảng lịch sử làm bài bọc `overflow-x-auto`, Modal xem đáp án và Ngăn kéo Gia sư AI chữa đề vừa khít mobile, lưới nút câu hỏi `flex-wrap`.
      * Phòng thi trực tuyến: Thanh đồng hồ & nút nộp bài không che tên bài thi, camera thu nhỏ góc không đè nội dung.
      * `/student/classes`, `/student/materials`, `/student/assignments`, `/student/results`, `/student/ai-tutor`.
    + Phân hệ Quản trị viên & Auth:
      * `/admin`, `/admin/teacher-access`, `/admin/student-management`, `/admin/subjects`: Bọc `overflow-x-auto` cho mọi `<table>`, modal khít `360px`.
      * `/`, `/login`, `/register`: Căn giữa, padding cân đối trên `360px`.
  - [x] **Mục tiêu 4 (Kiểm thử thực tế & Nghiệm thu có chứng cứ)**:
    + Chạy script kiểm tra tràn ngang viewport mobile `360px`, `375px`, `390px`.
    + Đảm bảo `w-screen` loại bỏ 100%, không còn ThemeToggle thừa.
    + Chạy `npx tsc --noEmit` & `npm run build` đạt 0 lỗi (36/36 routes).
    + Tạo Local Commit an toàn theo quy định `AGENTS.md` (tuyệt đối không tự ý push).
    + Cập nhật commit hash `001e5c6` vào `.antigravity/plans/active.md`.

- [x] **Phase 72 (Commit `3ad7cf9`)**: Sửa triệt để lỗi hiển thị ký tự thô (Toán & tất cả các môn khác) tại Bảng Phân tích Đề thi + Tổng rà soát toàn bộ web (Admin, Giảng viên, Học sinh):
  - [x] **Mục tiêu 1 (Sửa lỗi hiển thị LaTeX thô & cắt chữ tại Bảng Phân tích Đề thi `/teacher/exams/[examId]`)**:
    + Bọc nội dung câu hỏi bằng `<MathText text={stripLeadingQuestionPrefix(item.questionText)} />` (tự động loại bỏ tiền tố lặp như `Câu 6.` / `Bài 1:` khi bảng đã có cột `#1, #2...`).
    + Cột "Nội dung câu hỏi": Tự động xuống dòng gọn gàng (`min-w-[260px] max-w-[480px] whitespace-normal break-words leading-relaxed`), bỏ `line-clamp-2` làm mất chữ và vỡ công thức ma trận/phân số.
    + Bọc container bảng bằng `w-full max-w-full overflow-x-auto` để các cột P, D, Tỷ lệ đúng, Đánh giá không bị đẩy ra ngoài.
  - [x] **Mục tiêu 2 (Nâng cấp `<MathText />` hỗ trợ hoàn hảo Toán & tất cả các môn khác)**:
    + Nhận cả `text` và `content` trong props (`MathTextProps`).
    + Môn Toán: Render chuẩn ma trận `\begin{pmatrix}`, `\begin{bmatrix}`, `\begin{vmatrix}`, `\begin{cases}`, phân số `\frac`, căn `\sqrt`, `\det`, `\lim`, `\int`, `\sum`, `\overline`, `\mid`, `\infty`, `\mathbb`, bảo toàn dấu xuống dòng `\\` trong ma trận.
    + Môn Lý, Hóa, Sinh: Chỉ số trên/dưới, phương trình hóa học (`$H_2SO_4$`, `$\rightarrow$`, `$\rightleftharpoons$`, `$\Delta H$`), đơn vị vật lý (`$120\text{ m}$`, `$\vec{F} = m\vec{a}$`, `\Omega`, `\mu`, `\lambda`, `^\circ\text{C}`).
    + Môn Tin học / CNTT & Xã hội / Ngoại ngữ / Kinh tế: Độ phức tạp (`$O(n \log n)$`, `$2^n$`), không nhầm ký hiệu tiền tệ USD (`$100`, `$50 và $20`).
    + Làm sạch: `\%` -> `%`, `\&` -> `&`, `\_` -> `_` ngoài khối toán; giải mã HTML entities; chuyển `\[...\]` -> `$$...$$` và `\(...\)` -> `$...$`; lọc sạch tag cấu hình `[CAMERA_REQUIRED:...]`, `[AUTO_GRADE_ESSAY:...]`, `[SHOW_ANSWERS:...]` và `<think>...</think>`; chuẩn hóa Unicode NFC.
    + Đảm bảo CSS `.katex` có `overflow: visible !important`.
  - [x] **Mục tiêu 3 (Tổng rà soát toàn bộ dự án — Tìm & Sửa 100% chỗ render text thô chưa dùng `<MathText />`)**:
    + Giảng viên: `/teacher/exams/[examId]`, `/teacher/exams/create`, `/teacher/questions`, `/teacher/ai-generator`, `/teacher/grading`, `/teacher/assignments`, `/teacher/materials`.
    + Sinh viên: `/student/exams/[examId]`, `/student/results`, `/student/assignments`, `/student/classes`, `/student/ai-tutor`, `/student/dashboard`.
    + Admin: Rà soát `/admin/**` chuẩn hóa Unicode tiếng Việt NFC, không để lộ entities hay ký tự rác.
    + Đảm bảo tính năng Xuất Excel / CSV có UTF-8 BOM (`\uFEFF`) không lỗi font.
  - [x] **Mục tiêu 4 (Kiểm thử thực tế, nghiệm thu có chứng cứ & commit an toàn)**:
    + Kiểm tra trực tiếp bảng Item Analysis trên `/teacher/exams/[examId]` hiển thị công thức Toán/Lý/Hóa mượt mà, không còn ký tự thô.
    + Chạy `npx tsc --noEmit` & `npm run build` đạt 0 lỗi (36/36 routes).
    + Tạo Local Commit an toàn theo quy định `AGENTS.md` (tuyệt đối không tự ý push).
    + Cập nhật commit hash `3ad7cf9` vào `.antigravity/plans/active.md`.

- [x] **Phase 73 (Commit `1187ebe`)**: Nâng cấp lõi AI toàn hệ thống — Chống lỗi kết nối, chống cắt cụt chữ, hiểu đúng Tự luận/Trắc nghiệm & Đồng bộ cho cả 3 giao diện (Admin, Giảng viên, Học sinh):
  - [x] **Mục tiêu 1 (Khắc phục triệt để lỗi kết nối khi chat nhiều lượt)**:
    + Cập nhật API route AI: Thêm `export const maxDuration = 60;` và `export const dynamic = 'force-dynamic';` tại `app/api/chat/route.ts`, `app/api/chat-ai/route.ts`, `app/api/student/exam-tutor/route.ts`.
    + Làm sạch & Chuẩn hóa mảng lịch sử (`sanitizeChatHistory`): Chỉ giữ `{ role, content }`, lọc sạch các tin nhắn lỗi cũ `⚠️ Lỗi kết nối...` và tin rỗng, gộp các tin cùng role đứng liền kề, sliding window tối đa 10 tin nhắn gần nhất (~12.000 ký tự) để chống 429 TPM của Groq.
    + Cơ chế Fast Failover và Timeout thông minh: Giảm timeout từng lượt thử xuống 12–15s; tự động xoay vòng qua các model có quota TPM riêng biệt (Gemini -> Groq Llama 3.3 -> Scout 17B -> Llama 3.1 8B -> Qwen 3 -> Pollinations Free Gateway).
    + Sửa nút đỏ "Thử gửi lại" ở Frontend (`/teacher/ai-tutor`, `/student/ai-tutor`): Xóa sạch bong bóng lỗi cũ, không duplicate tin nhắn user trong state.
  - [x] **Mục tiêu 2 (Sửa triệt để lỗi câu trả lời bị cắt cụt giữa chừng)**:
    + Đặt `max_tokens: 4096` cho Gia sư AI và Gia sư AI chữa đề.
    + Đặt `max_tokens: 4096 - 6000` cho Sinh câu hỏi AI và Chấm tự luận.
    + Tự động xử lý khi `finish_reason === 'length'` để đảm bảo câu trả lời luôn trọn vẹn, không bị cụt giữa từ.
    + Không sử dụng `.slice()` cắt ngắn chuỗi phản hồi.
  - [x] **Mục tiêu 3 (Nâng cấp khả năng hiểu đúng yêu cầu Tự luận vs Trắc nghiệm & Sửa lỗi lặp chữ "chi tiết:")**:
    + Cập nhật System Prompt tại `app/api/chat-ai/route.ts`: Phân biệt tuyệt đối Tự luận và Trắc nghiệm; khi người dùng yêu cầu hoặc sửa đổi sang Tự luận (ví dụ *"tự luận cơ không phải trắc nghiệm"*), tuyệt đối không sinh phương án A-B-C-D mà bám sát chủ đề trước và sinh câu hỏi tự luận mở + gợi ý đáp án + rubric; ưu tiên tuyệt đối ý định sửa đổi ở tin nhắn mới nhất.
    + Sửa lỗi lặp tiền tố trong `<ChatMessageRenderer />`: Đặt cụm dài lên trước cụm ngắn trong regex bóc tách giải thích (`giải thích chi tiết|lời giải chi tiết|hướng dẫn giải|giải thích|lời giải|explanation`) và làm sạch triệt để, không còn chữ `"chi tiết:"` bị in thừa.
    + Bổ sung giao diện hiển thị chuyên biệt cho câu Tự luận (Đề bài, Gợi ý trả lời, Thang điểm).
  - [x] **Mục tiêu 4 (Kiểm tra & Đồng bộ toàn bộ tính năng AI trên cả 3 giao diện)**:
    + Giảng viên: `/teacher/ai-tutor`, `/teacher/ai-generator`, `/teacher/questions` (modal AI), chấm tự luận và upload đề thi.
    + Sinh viên: `/student/ai-tutor`, `/chat`, ngăn kéo `/student/exams/[examId]` & `/student/results`.
    + Admin: Rà soát `/admin/**` đảm bảo không có route AI gọi model cố định hay cấu hình cũ.
  - [x] **Mục tiêu 5 (Kiểm thử thực tế, nghiệm thu có chứng cứ & commit an toàn)**:
    + Test hội thoại nhiều lượt: Lượt 1 hỏi chủ đề, Lượt 2 yêu cầu "tự luận cơ không phải trắc nghiệm" -> trả về đúng câu tự luận, không lỗi kết nối, không cắt cụt chữ, không lặp "chi tiết:".
    + Chạy `npx tsc --noEmit` & `npm run build` đạt 0 lỗi (36/36 routes).
    + Tạo Local Commit an toàn theo quy định `AGENTS.md` (tuyệt đối không tự ý push).
    + Cập nhật commit hash `1187ebe` vào `.antigravity/plans/active.md`.

- [x] **Phase 74 (Commit `c561e32`)**: Xóa hoàn toàn tên "Mầm Học" trên toàn bộ hệ thống web & đổi sang "E-Learning" + Sửa khung Dark Mode tại student dashboard:
  - [x] **Mục tiêu 1 (Quét toàn bộ mã nguồn không bỏ sót biến thể nào)**:
    + Tìm kiếm `Mầm Học`, `Mầm học`, `mầm học`, `MẦM HỌC`, `Mam Hoc`, `mam hoc`, `MamHoc`, `mamhoc`, `mam-hoc`, `mam_hoc` trong `app/**`, `components/**`, `lib/**`, `public/**`.
  - [x] **Mục tiêu 2 (Thay thế đồng bộ sang "E-Learning" trên cả 3 phân hệ & trang công khai)**:
    + Chân trang (Footer): `"E-Learning cùng bạn học tốt hơn mỗi ngày"`, `© 2026 E-Learning · Đại học Lạc Hồng (LHU)`.
    + Trang Chủ, Đăng nhập, Đăng ký, Quên mật khẩu: Thay đổi logo text, slogan, thẻ alt, tiêu đề. Tránh lặp từ `"E-Learning E-Learning"`.
    + Sidebar, Topbar, Modal, Toast, Empty State trên Admin, Giảng viên, Học sinh.
  - [x] **Mục tiêu 3 (Cập nhật Metadata, AI Prompt & File xuất dữ liệu)**:
    + Metadata: `metadata.title`, `metadata.description`, `openGraph.title`, `applicationName` trong `layout.tsx`, `manifest.json`.
    + AI Prompt & Chat: Đổi câu chào ban đầu và System Prompt từ Mầm Học sang `"hệ thống E-Learning - Đại học Lạc Hồng (LHU)"`.
    + Tên file Export: Đổi `MamHoc_...` sang `E-Learning_...`.
  - [x] **Mục tiêu 4 (Sửa lỗi khung nền trắng trong Dark Mode tại `/student/dashboard`)**:
    + Mục "Lượt thi gần nhất": Khung `"Bài thi bạn đã nộp sẽ xuất hiện tại đây."` đổi sang `bg-slate-50 dark:bg-[#111C2D] border border-dashed border-slate-300 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 rounded-xl`.
  - [x] **Mục tiêu 5 (Kiểm thử thực tế, nghiệm thu có chứng cứ & commit an toàn)**:
    + Quét lại toàn bộ repo đảm bảo 0 kết quả cho từ khóa Mầm Học.
    + Chạy `npx tsc --noEmit` & `npm run build` đạt 0 lỗi (35/35 routes).
    + Tạo Local Commit an toàn theo quy định `AGENTS.md` (tuyệt đối không tự ý push).
    + Cập nhật commit hash `c561e32` vào `.antigravity/plans/active.md`.

- [x] **Phase 75 (Commit `c843d91`)**: Sửa triệt để lỗi không đồng bộ dữ liệu tại "Lịch sử thi & Kết quả" (`/student/results`) và Tổng quan sinh viên (`/student/dashboard`) sau khi thi xong:
  - [x] **Mục tiêu 1 (Điều tra & Sửa lỗi truy vấn dữ liệu tại `/student/results`)**:
    + Sửa lọc trạng thái: Lấy tất cả lượt thi đã kết thúc/đã nộp (`submitted`, `graded`, `completed`, `published`, `auto_graded`, `pending_grading`), hoặc `.neq('status', 'in_progress')` kết hợp `.not('submitted_at', 'is', null)`. TUYỆT ĐỐI không ẩn bài chờ chấm hoặc bài chưa published.
    + Sửa lệch khóa `student_id` & Join bảng bị rớt dòng: Không dùng `!inner` join khi join sang `exams`, `subjects`, `classes`. Đảm bảo truy vấn an toàn (dùng tách bước hoặc admin client đọc metadata exams/subjects sau khi đã xác thực user.id của sinh viên).
    + Chuẩn hóa đọc điểm số: `const finalScore = attempt.final_score ?? attempt.total_score ?? attempt.score ?? attempt.auto_score ?? null;` Chuẩn hóa thang 10 đồng bộ.
  - [x] **Mục tiêu 2 (Xóa Cache cũ & Đồng bộ thời gian thực Real-time Sync)**:
    + Thêm `export const dynamic = 'force-dynamic';` và `export const revalidate = 0;` tại:
      * `app/student/results/page.tsx`
      * `app/student/dashboard/page.tsx`
      * `app/student/exams/page.tsx`
      * `app/student/exams/[examId]/page.tsx`
      * `app/teacher/grading/page.tsx`
    + Bổ sung đầy đủ `revalidatePath` tại luồng Nộp bài thi, Giảng viên lưu điểm và Nộp bài tập.
    + Gọi `router.refresh()` phía Client sau khi nộp bài thi thành công.
  - [x] **Mục tiêu 3 (Đồng bộ 4 thẻ KPI, Bộ lọc Tab & Dữ liệu trên `/student/dashboard`)**:
    + Tính toán chính xác 4 thẻ KPI tại `/student/results`: Điểm trung bình thi (làm tròn 1 số thập phân), Tỷ lệ đạt (>=5.0), Bài tập đã nộp (sửa mô tả `"Bài tập các lớp đang học"`), Tổng lượt thi.
    + Bộ lọc tab: `Tất cả`, `Đạt`, `Chưa đạt`, `Chờ chấm`; từng dòng hiển thị Tên đề, Môn, Lượt thi, Ngày nộp, Trạng thái, Điểm số, Nút Xem đáp án và Nút Hỏi Gia sư AI.
    + Đồng bộ mục "Lượt thi gần nhất" & "Kết quả học tập" trên `/student/dashboard` khớp 100% với `/student/results`.
  - [x] **Mục tiêu 4 (Tiện tay dọn nút trùng lặp trên `/student/results`)**:
    + Xóa nút đổi Theme Sáng/Tối bị trùng lặp ở góc trên bên phải tiêu đề trang `/student/results`.
  - [x] **Mục tiêu 5 (Kiểm thử thực tế, nghiệm thu có chứng cứ & commit an toàn)**:
    + Chạy `npx tsc --noEmit` & `npm run build` đạt 0 lỗi (35/35 routes).
    + Tạo Local Commit an toàn theo quy định `AGENTS.md` (tuyệt đối không tự ý push).
    + Cập nhật commit hash `c843d91` vào `.antigravity/plans/active.md`.


- [x] **Phase 76 (Commit `f22af6b`)**: Tối ưu hiệu năng request/phản hồi toàn hệ thống (an toàn tuyệt đối, giữ nguyên UI/tính năng/RLS/schema):
  - [x] **Mục tiêu 1 (Auth & Query waterfall)**:
    + Thay `supabase.auth.getUser()` + truy vấn `user_roles` lặp lại trong các loader (`lib/teacher-grading.ts`, `lib/student-exam.ts`, `lib/student-exam-review.ts`, `lib/teacher-exam-analytics.ts`, `lib/teacher-exam-create.ts`, `lib/question-bank.ts`, `lib/ai-exam-tutor.ts`, `app/admin/teacher-access/page.tsx`) bằng `getCurrentUser()` / `getCurrentUserWithRole()` (React.cache) trong `lib/auth-cache.ts` → dùng chung kết quả với `layout.tsx`.
    + Role cache chỉ áp dụng cho loader render-time (không áp cho Server Action / Route Handler để tránh mất dedupe).
    + Rà soát waterfall: dashboard sinh viên đã `Promise.all` (giữ nguyên); gộp truy vấn tuần tự còn sót ở `getTeacherGradingData`.
  - [x] **Mục tiêu 2 (N+1 → bulk)**:
    + `createExamAction` (4 biến thể snapshot câu hỏi): gom insert `exam_questions` thành 1 lệnh bulk + 1 lệnh bulk `exam_answer_keys`.
    + `updateQuestion`: 4 upsert option → 1 upsert mảng.
    + `saveAIQuestionsBatchAction`: bulk insert `question_bank` → bulk `question_options` → bulk `question_answer_keys` (fallback từng câu nếu bulk lỗi để không mất dữ liệu).
    + `saveEssayGrades`: bỏ SELECT từng câu → 1 SELECT + 1 bulk insert student_answers rỗng + 1 bulk upsert grades.
    + Tối giản `select('*')` ở danh sách lớn nếu cột sử dụng rõ ràng.
    + Migration mới `supabase/migrations/20261125_performance_indexes_v2.sql`: chỉ `CREATE INDEX IF NOT EXISTS`, cột đã đối chiếu `schema.sql` (migration 20261102 cũ tham chiếu cột không tồn tại → không sửa, không phụ thuộc).
  - [x] **Mục tiêu 3 (Instant navigation & Client)**:
    + Thêm `app/teacher/loading.tsx`, `app/student/loading.tsx` (skeleton Light/Dark `#09111E`/`#111C2D`).
    + `next/dynamic` cho Recharts (`ExamScoreChart`) và các modal/drawer nặng (nếu đang import tĩnh).
    + `useDeferredValue` cho ô tìm kiếm lọc danh sách lớn; kiểm tra cờ chống bấm đúp ở nộp bài / tạo đề / sinh câu hỏi.
  - [x] **Mục tiêu 4 (AI & Proxy)**:
    + `/api/chat-ai`: giới hạn thời gian tra cứu role (không chặn TTFB khi Supabase chậm), rà soát timeout từng cổng AI & số tin nhắn gửi đi.
    + `proxy.ts`: xác nhận `config.matcher` chỉ chạy trên route cần auth, không chạy trên static.
  - [x] **Mục tiêu 5 (Nghiệm thu)**:
    + `npx tsc --noEmit` + `npm run build` đạt 0 lỗi; Local Commit (TUYỆT ĐỐI không `git push`); cập nhật commit hash cạnh Phase 76.

- [x] **Phase 77 (Commit `dab392d`)**: Nâng cấp lõi AI — chống cắt cụt (auto-continue + streaming), chuẩn hóa rubric thang 10, tối ưu hiển thị (Giảng viên & Học sinh):
  - [x] **Mục tiêu 1 (Chống cắt cụt & Nâng trần 8192 token)**:
    + Lõi AI trong `lib/ai-provider.ts` & alias `lib/ai-engine.ts`: Nâng trần token mặc định 8192 cho các model lớn (`gemini-2.5-flash`, `gemini-2.0-flash`, `llama-3.3-70b`, `llama-4-scout`, `qwen3-32b`), an toàn context cho model nhỏ (`gemma2-9b-it`), đọc `finishReason`/`finish_reason` và gộp toàn bộ `parts` của Gemini.
    + File mới `lib/ai-continuation.ts`: hàm thuần `isTextIncomplete` (nhận diện ngắt độ dài, thiếu câu so với yêu cầu N câu, KaTeX `$` lẻ, ngoặc mở chưa đóng), `stripOverlap` (thuật toán cắt bỏ phần trùng giữa đuôi và đầu), `mergeContinuation` (ghép chuỗi tự nhiên có khoảng trắng), `buildContinuationPrompt`.
    + Vòng lặp Server-Side Auto-Continuation: Tự động gửi tiếp tối đa 2 lần lặp khi phát hiện câu trả lời bị ngắt dở, ghép nối mượt mà trước khi trả về Client.
    + Endpoint `/api/chat` & `/api/chat-ai`: Hỗ trợ `continueFrom` cho nút tiếp tục viết và hỗ trợ SSE Streaming (`stream: true`). Nới giới hạn `MAX_MESSAGE_LENGTH = 8000` và sliding window để không bỏ sót ngữ cảnh.
    + Giao diện `/teacher/ai-tutor`, `/student/ai-tutor`: Bổ sung nút nhỏ **`▶ Tiếp tục viết phần còn lại`** đặt cạnh nút **`Sao chép`** dưới mỗi tin nhắn Assistant.
  - [x] **Mục tiêu 2 (Chuẩn hóa Rubric & Thang điểm 10 Khảo thí)**:
    + Bổ sung quy tắc trong System Prompt: Mặc định tính theo thang điểm 10 chuẩn Việt Nam (tổng các câu = 10.0, hoặc 1 câu tự luận tổng tiêu chí = điểm câu đó, tuyệt đối không bịa tổng 30 điểm).
    + Định dạng rubric gọn trên cùng 1 dòng: `- **[Tên tiêu chí] ([X.X] điểm):** [Nội dung yêu cầu cần đạt]`.
    + Phân bổ độ dài thông minh khi người dùng yêu cầu 5 - 10 câu.
  - [x] **Mục tiêu 3 (Tối ưu hiển thị ChatMessageRenderer & Chuyển đổi bảng)**:
    + `convertMarkdownTablesToLines` (`lib/anti-table-processor.ts`): Tự động gộp bảng 2 cột thành `- **[Cột 1]:** [Cột 2]` gọn đẹp, không bung heading + bullet lộn xộn.
    + `ChatMessageRenderer`: Phân cấp rõ rệt đề bài câu hỏi tự luận với border-left màu xanh và nền riêng, khối `Gợi ý trả lời` (amber), khối `Thang điểm` (purple), badge điểm nổi bật cho từng tiêu chí, tự động cân bằng delimiter KaTeX khi streaming dở.
  - [x] **Mục tiêu 4 (Đồng bộ toàn bộ 3 phân hệ)**:
    + Cả Teacher AI Tutor, Student AI Tutor, Exam Tutor Drawer (`/api/student/exam-tutor`), Sinh câu hỏi AI (`/teacher/ai-generator`) và Bóc tách tài liệu đều đồng bộ hưởng lợi trần token 8192 và renderer mới.
  - [x] **Mục tiêu 5 (Kiểm thử & Nghiệm thu có chứng cứ)**:
    + Chạy bộ unit test độc lập kiểm tra trích xuất câu hỏi, phát hiện ngắt dở, overlap trimming và anti-table 2 cột: 100% Passed.
    + Chạy `cmd /c "npx tsc --noEmit"`: 0 lỗi.
    + Chạy `cmd /c "npm run build"`: Compiled successfully, 31/31 static/dynamic pages tối ưu 100%.
    + Tạo Local Commit an toàn theo `AGENTS.md` (tuyệt đối không `git push` tự ý). Ghi nhận commit hash `dab392d`.

- [x] **Phase 78 (Commit `28939a7`)**: Nâng cấp tính năng "Sinh câu hỏi AI" chạy LLM thực thụ (Gemini / ChatGPT) — bám sát 100% nội dung kiến thức đã chọn hoặc nhập tự do:
  - [x] **Mục tiêu 1 (Xóa bỏ hoàn toàn kho câu hỏi mẫu tĩnh gây lệch chủ đề)**:
    + Xóa bỏ `generateSmartDiverseFallback`, `mcScenarios`, `essayScenarios`, và vô hiệu hóa triệt để `domain-fallback-generator.ts`.
    + TUYỆT ĐỐI không trả về câu hỏi tĩnh khi AI gặp lỗi. Trả về thông báo lỗi thân thiện rõ ràng kèm nút "Thử sinh lại". 100% câu hỏi phải sinh từ LLM dựa trên môn học và chủ đề yêu cầu.
  - [x] **Mục tiêu 2 (Kết nối lõi LLM đa cổng & bộ sửa lỗi parse JSON chứa LaTeX `safeParseAIQuestionsJson`)**:
    + Nâng trần `max_tokens: 8192` và `temperature: 0.7`, kết hợp nonce chống lặp để mỗi lần bấm sinh đều ra câu hỏi mới đa dạng.
    + Module mới `lib/ai-json-parser.ts`: viết hàm `safeParseAIQuestionsJson(rawText: string)` tự động sửa escape cho LaTeX (`\frac`, `\vec`, `\sqrt`, `\text`, `\times`...), gỡ thẻ `<think>...</think>`, và cơ chế State-Machine Bracket Matcher tự động cứu các câu hỏi hoàn chỉnh nếu chuỗi JSON bị ngắt giữa chừng do token limit.
  - [x] **Mục tiêu 3 (Nâng cấp System Prompt chuyên gia khảo thí ép bám sát 100% chủ đề)**:
    + Ép bám sát 100% chủ đề / nội dung kiến thức bắt buộc: nếu là Tọa độ Oxy/Oxyz thì 100% về tọa độ điểm, vectơ, đường thẳng, mặt phẳng, mặt cầu; tuyệt đối không sinh Đạo hàm/Tích phân.
    + Nếu dán đoạn văn bản/bài giảng/code thì chỉ khai thác kiến thức từ đoạn đó.
    + Định dạng JSON chuẩn cho cả Trắc nghiệm và Tự luận (kèm Rubric chi tiết).
  - [x] **Mục tiêu 4 (Nâng cấp giao diện /teacher/ai-generator & Modal trong /teacher/questions)**:
    + Nâng cấp ô "Chủ đề bài học / Nội dung kiến thức" từ `<input>` 1 dòng thành `<textarea rows={3}>` tự co giãn, cho phép gõ tự do mọi chủ đề hoặc dán nguyên đoạn bài giảng.
    + Bỏ active gợi ý nhanh khi gõ tay tự do; hiển thị thanh tóm tắt ngữ cảnh (Chủ đề, Loại câu, Mức độ) và nút "Sinh lại bộ khác".
    + Render công thức qua `<MathText />` chuẩn đẹp cho vectơ, tọa độ, ma trận, phân số.
    + Thống nhất tiêu đề và nhận diện thương hiệu E-Learning (hỗ trợ đa mô hình AI thông minh: Gemini / Groq Llama 3).
  - [x] **Mục tiêu 5 (Kiểm thử thực tế, nghiệm thu & commit an toàn)**:
    + Kiểm thử unit test parser với chuỗi LaTeX phức tạp: 100% Passed.
    + Kiểm thử cứu vãn JSON bị truncated do token: 100% Passed.
    + Chạy `cmd /c "npx tsc --noEmit"`: 0 lỗi.
    + Chạy `cmd /c "npm run build"`: Compiled successfully, 31/31 static/dynamic pages tối ưu 100%.
    + Tạo local commit an toàn theo `AGENTS.md` (tuyệt đối không `git push` tự ý). Ghi nhận commit hash `28939a7`.

- [x] **Phase 79**: Chuyển đổi toàn bộ hạ tầng CSDL & Auth từ Supabase sang **SQL Server 2019 + TypeORM + JWT + Local Storage**:
  - [x] **Mục tiêu 1 (TypeORM & SQL Server 2019 Core)**:
    + Cài đặt `typeorm`, `mssql`, `@types/mssql`, `jose`, `bcryptjs`, `@types/bcryptjs`, `tsx`. Cấu hình `serverExternalPackages` trong `next.config.ts`.
    + Tạo toàn bộ 29 `EntitySchema` TypeORM (`users`, `profiles`, `user_roles`, `subjects`, `classes`, `teacher_subject_assignments`, `class_memberships`, `question_bank`, `question_options`, `question_answer_keys`, `exams`, `exam_classes`, `exam_questions`, `exam_answer_keys`, `exam_attempts`, `student_answers`, `student_answer_grades`, `attempt_results`, `notifications`, `ai_generation_jobs`, `ai_tutor_conversations`, `ai_tutor_messages`, `invitation_tokens`, `teacher_applications`, `class_materials`, `exam_proctoring_logs`, `assignments`, `assignment_submissions`, `auth_otps`) trong `lib/db/entities/` và singleton `DataSource` tại `lib/db/data-source.ts`.
    + Tạo script T-SQL chuẩn SQL Server 2019 (`sql/001_init_sqlserver2019.sql`), khởi tạo database `AutoBankELearning` trực tiếp trên SQL Server 2019 (`127.0.0.1:1433`), tạo sequence `student_code_seq` và seed tài khoản mẫu (`scripts/db-init.ts`, `scripts/db-verify.ts`).
  - [x] **Mục tiêu 2 (Xác thực JWT + HTTP-only Cookie thay Supabase Auth)**:
    + Tạo `lib/auth/password.ts`, `lib/auth/session.ts` (`jose` HS256), `lib/auth/user-service.ts`, API routes `/api/auth/login`, `/api/auth/logout`, `/api/auth/set-password`, `/api/auth/me`.
    + Cập nhật `proxy.ts`, `lib/auth-cache.ts`, `app/login/*`, `app/register/*`, `app/auth/*`, 6 component sidebar/shell.
  - [x] **Mục tiêu 3 (Lưu trữ file nội bộ thay Supabase Storage)**:
    + Tạo `lib/storage/local-storage.ts` lưu vào `storage/uploads/` và route `/api/uploads/[...path]` kiểm tra quyền truy cập.
    + Chuyển đổi `app/teacher/classes/[classId]/materials/actions.ts` và `app/teacher/classes/[classId]/assignments/actions.ts`.
  - [x] **Mục tiêu 4 (Chuyển đổi toàn bộ nghiệp vụ, Thông báo & 8 RPC sang TypeORM)**:
    + Viết lại toàn bộ `lib/*.ts`, `app/**/actions.ts`, `app/**/page.tsx`, `app/api/**/*.ts`, `hooks/use-realtime-notifications.ts` + `/api/notifications` sang TypeORM Repository / QueryBuilder / Transaction.
    + Chuyển 8 hàm RPC Postgres (`publish_exam`, `claim_teacher_invitation`, `list_class_roster`, `find_student_for_class`, `enroll_student_in_class`, `unenroll_student_from_class`, `preview_class_enrollment_csv`, `bulk_enroll_students_in_class`) sang TypeScript service + transaction.
  - [x] **Mục tiêu 5 (Dọn dẹp Supabase, Kiểm thử & Nghiệm thu)**:
    + Gỡ `@supabase/ssr`, `@supabase/supabase-js` và thư mục `lib/supabase/`.
    + Kiểm thử trực tiếp trên SQL Server 2019 (`scripts/db-init.ts`, `scripts/db-verify.ts`: 29 bảng, bcrypt + JWT HS256), `npx tsc --noEmit` (0 lỗi), `npm run build` (34/34 routes thành công). Local commit an toàn, không push tự ý.
