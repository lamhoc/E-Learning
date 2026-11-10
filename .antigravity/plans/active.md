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
