# Kế hoạch phát triển dự án E-Learning (Mầm Học)

## Trạng thái các Phase

- [x] **Phase 1-27**: Hoàn thiện các tính năng cốt lõi (Xem git log).
- [x] **Phase 28 (Commit `e48754b`)**: Đồng bộ nhận diện thương hiệu Đại học Lạc Hồng & Thêm nút chuyển đổi giao diện Sáng / Tối (Light/Dark Mode).
- [x] **Phase 29 (Commit `99e1ef8`)**: Sửa lỗi `cookies() inside unstable_cache()` và tối ưu hệ thống cache Next.js 16.
- [x] **Phase 30 (Commit `6ac63c0`)**: Tạo trang Quản lý Môn học riêng cho Admin `/admin/subjects`, sửa điều hướng và khắc phục triệt để lỗi mã hóa ký tự tên user tiếng Việt.
- [x] **Phase 31 (Commit `5062e16`)**: Đồng bộ triệt để màu sắc & độ tương phản trong Dark Mode.
- [x] **Phase 32 (Commit `a720f51`)**: Bổ sung mục "Tài liệu" và "Bài tập" vào giao diện Giảng viên.
- [x] **Phase 33 (Commit `4db02f0`)**: Hoàn thiện tính năng nút cập nhật giảng viên phụ trách lớp tại Cổng Quản trị viên.
- [x] **Phase 34 (Commit `local`)**: Xóa khung "Thêm môn học mới" tại trang Quản trị Giảng viên & Phân môn, căn chỉnh Layout w-full cho Card Lớp học
  - **Mục tiêu 1 (Xóa bỏ UI thừa)**:
    - Loại bỏ form và Card "Thêm môn học mới" khỏi `app/admin/teacher-access/academic-access.tsx` (tránh trùng lặp với trang chuyên biệt `/admin/subjects`).
    - Dọn dẹp các import không còn sử dụng (`createSubject`, `BookPlus`, `Input`, `Label`, `Button`).
  - **Mục tiêu 2 (Căn chỉnh Layout Grid)**:
    - Mở rộng thẻ "Lớp học & Giảng viên phụ trách" ra toàn bộ chiều ngang (`w-full`), đồng bộ thẳng hàng với bảng danh sách giảng viên phía trên.
    - Tối ưu hóa hiển thị bảng danh sách lớp học, căn lề và màu sắc đẹp mắt ở cả Light Mode và Dark Mode.
  - **Mục tiêu 3 (Kiểm thử & Nghiệm thu)**:
    - Pass 100% `npx tsc --noEmit` và `npm run build` (33/33 static & dynamic routes).
    - Tạo Local Commit an toàn theo đúng quy chuẩn dự án.
