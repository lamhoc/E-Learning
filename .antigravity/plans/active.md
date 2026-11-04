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
  - **Mục tiêu 1 (Cập nhật `globals.css`)**:
    - Đổi `@custom-variant dark (&:is(.dark *));` thành `@custom-variant dark (&:where(.dark, .dark *));`.
    - Thêm fallback CSS cho `.dark h1, .dark h2, .dark h3, .dark h4` để đảm bảo tiêu đề không bao giờ bị tối chìm.
  - **Mục tiêu 2 (Sửa các trang cụ thể theo báo cáo)**:
    - `/admin/teacher-access`: Tiêu đề chính, thẻ duyệt hồ sơ, thanh Tabs, badge "4 hồ sơ", tiêu đề cột bảng `thead`, tên ứng viên bảng `tbody`.
    - `/teacher/dashboard`: Lời chào "Chào Hoc! 👋", eyebrow "Không gian giảng dạy", phụ đề, và toàn bộ 8 thẻ Thao tác nhanh (bỏ màu pastel sáng cứng, đồng bộ `bg-white dark:bg-[#111C2D] border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white`).
    - `/teacher/grading`: Tiêu đề "Chấm bài thi tự luận ✍️", phụ đề, bảng danh sách bài nộp cần chấm.
  - **Mục tiêu 3 (Quét rà soát toàn bộ dự án)**:
    - Rà soát các thành phần UI khác (Table, Tabs, Badge, Quick actions) trong `app/` và `components/` để đảm bảo độ tương phản hoàn hảo trong Dark Mode.
  - **Mục tiêu 4 (Kiểm thử & Nghiệm thu)**:
    - Kiểm tra `npx tsc --noEmit` & `npm run build` không phát sinh lỗi.
    - Tạo Local commit và chờ lệnh push.
