# Kế hoạch phát triển dự án E-Learning (Mầm Học)

## Trạng thái các Phase

- [x] **Phase 1-27**: Hoàn thiện các tính năng cốt lõi (Xem git log).
- [x] **Phase 28 (Commit `e48754b`)**: Đồng bộ nhận diện thương hiệu Đại học Lạc Hồng & Thêm nút chuyển đổi giao diện Sáng / Tối (Light/Dark Mode).
- [x] **Phase 29 (Commit `99e1ef8`)**: Sửa lỗi `cookies() inside unstable_cache()` và tối ưu hệ thống cache Next.js 16.
- [x] **Phase 30 (Commit `6ac63c0`)**: Tạo trang Quản lý Môn học riêng cho Admin `/admin/subjects`, sửa điều hướng và khắc phục triệt để lỗi mã hóa ký tự tên user tiếng Việt.
- [x] **Phase 31 (Commit `5062e16`)**: Đồng bộ triệt để màu sắc & độ tương phản trong Dark Mode.
- [x] **Phase 32 (Commit `local`)**: Bổ sung mục "Tài liệu" và "Bài tập" vào giao diện Giảng viên
  - **Mục tiêu 1 (Cập nhật TeacherSidebar)**:
    - Bổ sung 2 mục điều hướng:
      - `Tài liệu giảng dạy` (`/teacher/materials` - Icon `FileText`)
      - `Bài tập về nhà` (`/teacher/assignments` - Icon `ClipboardList`)
    - Cập nhật kiểu `activeRoute` và highlight chuẩn khi đang truy cập 2 trang này.
  - **Mục tiêu 2 (Xây dựng trang Quản lý Tài liệu Giảng dạy `/teacher/materials`)**:
    - Data layer: `lib/teacher-materials.ts` lấy danh sách lớp học và tài liệu của giảng viên từ bảng `class_materials`.
    - UI: `app/teacher/materials/page.tsx` + `loading.tsx` + `components/teacher/teacher-materials-client.tsx`.
    - Thống kê đầu trang: Tổng tài liệu, Số lớp phụ trách, Phân loại Document vs Video/Link.
    - Bộ lọc: Theo lớp học, theo tuần học, tìm kiếm theo tên tài liệu.
    - Modal / Form upload: Chọn lớp nhận tài liệu, tuần học (1-16), tiêu đề, mô tả, upload file (PDF, DOCX, PPTX, ZIP) hoặc dán link video/Drive.
    - Danh sách tài liệu: Phân loại theo tuần/lớp, nút tải xuống, nút xóa tài liệu.
    - Đồng bộ: Dùng chung bảng `class_materials` với `/student/materials`.
  - **Mục tiêu 3 (Xây dựng trang Quản lý & Chấm Bài tập `/teacher/assignments`)**:
    - Data layer: `lib/teacher-all-assignments.ts` lấy danh sách lớp, bài tập và bài nộp từ `assignments` & `assignment_submissions`.
    - UI: `app/teacher/assignments/page.tsx` + `loading.tsx` + `components/teacher/teacher-assignments-client.tsx`.
    - Thống kê đầu trang: Tổng bài tập đã giao, Số bài nộp chờ chấm, Số bài đã chấm điểm.
    - Modal / Form tạo bài tập: Chọn lớp học, tiêu đề, hướng dẫn chi tiết, hạn nộp (due_date), điểm tối đa (mặc định 10), đính kèm file đề bài.
    - Danh sách bài tập: Tỷ lệ nộp bài, trạng thái.
    - Chấm điểm bài nộp: Modal/view chi tiết xem danh sách bài nộp của sinh viên, tải file bài làm, nhập Điểm số và Nhận xét (Feedback), lưu điểm ngay lập tức.
    - Đồng bộ: Dùng chung bảng `assignments` và `assignment_submissions` với `/student/assignments`.
  - **Mục tiêu 4 (Tiêu chuẩn kỹ thuật & Giao diện)**:
    - Thiết kế chuẩn LHU (Arizona State University), hỗ trợ 100% Light/Dark Mode (không lỗi chữ chìm).
    - `npx tsc --noEmit` đạt 0 lỗi, `npm run build` thành công 100% (33/33 static & dynamic routes).
