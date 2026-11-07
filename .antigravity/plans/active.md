# Kế hoạch phát triển dự án E-Learning (Mầm Học)

## Trạng thái các Phase

- [x] **Phase 1-27**: Hoàn thiện các tính năng cốt lõi (Xem git log).
- [x] **Phase 28 (Commit `e48754b`)**: Đồng bộ nhận diện thương hiệu Đại học Lạc Hồng & Thêm nút chuyển đổi giao diện Sáng / Tối (Light/Dark Mode).
- [x] **Phase 29 (Commit `99e1ef8`)**: Sửa lỗi `cookies() inside unstable_cache()` và tối ưu hệ thống cache Next.js 16.
- [x] **Phase 30 (Commit `6ac63c0`)**: Tạo trang Quản lý Môn học riêng cho Admin `/admin/subjects`, sửa điều hướng và khắc phục triệt để lỗi mã hóa ký tự tên user tiếng Việt.
- [x] **Phase 31 (Commit `5062e16`)**: Đồng bộ triệt để màu sắc & độ tương phản trong Dark Mode.
- [x] **Phase 32 (Commit `a720f51`)**: Bổ sung mục "Tài liệu" và "Bài tập" vào giao diện Giảng viên.
- [x] **Phase 33 (Commit `4db02f0`)**: Hoàn thiện tính năng nút cập nhật giảng viên phụ trách lớp tại Cổng Quản trị viên.
- [x] **Phase 34 (Commit `0b7eb11`)**: Xóa khung "Thêm môn học mới" tại trang Quản trị Giảng viên & Phân môn, căn chỉnh Layout w-full cho Card Lớp học
- [x] **Phase 35**: Sửa triệt để lỗi chữ bị mờ / tàng hình trong Chế độ Tối (Dark Mode)
- [x] **Phase 36**: Làm nổi bật màu xanh cho Tab đang chọn ("Duyệt hồ sơ" & "Phân công môn học") tại `/admin/teacher-access`
- [x] **Phase 37 (Commit `9c0e5fe`)**: Nâng cấp phòng thi trực tuyến (Shuffle đề deterministic, Fullscreen Lockdown, Camera Proctoring)
- [x] **Phase 38 (Commit `15aac82`)**: Thống kê đào tạo (Learning Analytics), Phân tích chất lượng câu hỏi (Item Analysis) & Xuất bảng điểm Excel
- [x] **Phase 39**: Đồng bộ màu xanh Active cho Thanh Tab Trang Chấm Bài Thi & Toàn bộ Tab Lọc trên Hệ thống
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


- [x] **Phase 40 (Commit `30ea1e7`)**: Tích hợp Resend Email Service & Hệ thống OTP Xác thực:
  - [x] **Mục tiêu 1 (Cơ sở dữ liệu & Cấu hình)**: Tạo migration `supabase/migrations/20261108_auth_otps.sql` lưu mã băm SHA-256 OTP, mục đích (reset_password, register_verify, login_2fa), hạn sử dụng (TTL 5p), giới hạn nhập sai (max 5 lần). Bật RLS `auth_otps_deny_all` để bảo vệ mã nguồn. Cập nhật `.env.example` với `RESEND_API_KEY` và `RESEND_FROM_EMAIL`.
  - [x] **Mục tiêu 2 (Resend Email Service & HTML Templates)**: Xây dựng module `lib/email/resend.ts` và `lib/email/otp-service.ts` với giao diện HTML email responsive chuẩn Đại học Lạc Hồng:
    - Gửi mã OTP xác thực (6 chữ số to rõ, thời hạn 5 phút, thông điệp an toàn).
    - Gửi thư mời giảng viên tự động với nút CTA một chạm "Kích hoạt tài khoản" (hết hạn 24h).
    - Gửi thông báo phê duyệt / từ chối hồ sơ giảng viên.
    - Cơ chế graceful fallback khi môi trường dev chưa nạp `RESEND_API_KEY`.
  - [x] **Mục tiêu 3 (OTP Quên mật khẩu tại Trang Đăng nhập)**: Xây dựng Modal OTP Đặt lại mật khẩu tại `components/auth/forgot-password-otp-modal.tsx` kết nối `app/login/login-form.tsx` (Nhập email -> Nhận OTP 6 số qua Resend -> Đếm ngược 60s -> Nhập OTP & Mật khẩu mới -> Cập nhật trực tiếp qua Supabase Admin API). Khắc phục triệt để lỗi Supabase Rate Limit 429.
  - [x] **Mục tiêu 4 (OTP Xác thực Email khi Đăng ký)**: Tích hợp bước xác thực OTP 2 giai đoạn vào `app/register/registration-form.tsx` và `app/register/actions.ts`. Chỉ tạo tài khoản và kích hoạt khi người dùng xác minh OTP hợp lệ gửi qua hộp thư thật.
  - [x] **Mục tiêu 5 (Tự động gửi Thư mời & Duyệt hồ sơ Giảng viên qua Resend)**: Trong `app/admin/teacher-access/actions.ts`, khi admin tạo thư mời giảng viên, tự động dispatch email kích hoạt qua Resend; khi admin phê duyệt/từ chối hồ sơ giảng viên, tự động gửi email thông báo kết quả.
  - [x] **Mục tiêu 6 (Kiểm thử & Nghiệm thu)**: Đã kiểm tra `npx tsc --noEmit` và `npm run build` đạt 0 lỗi 100%, 33 routes tĩnh/động build thành công.
