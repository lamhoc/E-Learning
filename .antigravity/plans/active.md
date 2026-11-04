# Kế hoạch phát triển dự án E-Learning (Mầm Học)

## Trạng thái các Phase

- [x] **Phase 1-27**: Hoàn thiện các tính năng cốt lõi (Xem git log).
- [x] **Phase 28 (Commit `e48754b`)**: Đồng bộ nhận diện thương hiệu Đại học Lạc Hồng & Thêm nút chuyển đổi giao diện Sáng / Tối (Light/Dark Mode).
- [x] **Phase 29 (Commit `99e1ef8`)**: Sửa lỗi `cookies() inside unstable_cache()` và tối ưu hệ thống cache Next.js 16.
- [x] **Phase 30 (Commit `6ac63c0`)**: Tạo trang Quản lý Môn học riêng cho Admin `/admin/subjects`, sửa điều hướng và khắc phục triệt để lỗi mã hóa ký tự tên user tiếng Việt.
- [x] **Phase 31 (Commit `5062e16`)**: Đồng bộ triệt để màu sắc & độ tương phản trong Dark Mode.
- [x] **Phase 32 (Commit `a720f51`)**: Bổ sung mục "Tài liệu" và "Bài tập" vào giao diện Giảng viên.
- [x] **Phase 33 (Commit `4db02f0`)**: Hoàn thiện tính năng nút cập nhật giảng viên phụ trách lớp tại Cổng Quản trị viên
  - **Mục tiêu 1 (Server Action `updateClassTeacher`)**:
    - Định nghĩa `updateClassTeacher(classId, teacherId)` trong `app/admin/teacher-access/actions.ts`.
    - Kiểm tra bảo mật quyền admin, sử dụng `createAdminClient()`.
    - Kiểm tra điều kiện giảng viên được chọn bắt buộc có phân công môn học trong `teacher_subject_assignments`.
    - Cập nhật `teacher_id` của lớp trong bảng `classes`.
    - Thêm bản ghi thông báo mới vào bảng `notifications` gửi giảng viên vừa được giao lớp.
    - Revalidate cache phân môn và các trang `/admin/teacher-access`, `/teacher/dashboard`, `/teacher/subjects`, `/teacher/materials`, `/teacher/assignments`.
  - **Mục tiêu 2 (Client Component `ClassTeacherAssigner`)**:
    - Tạo `app/admin/teacher-access/class-teacher-assigner.tsx`.
    - Dropdown chọn giảng viên môn học, hiển thị rõ ràng giảng viên hiện tại.
    - Nút hành động "Giao lớp" / "Lưu": Tích hợp icon `UserCheck`, chỉ enable khi Admin chọn giảng viên khác hiện tại, hiển thị spinner khi lưu.
    - Phản hồi trực quan: Toast/Badge thông báo màu xanh "Đã cập nhật giảng viên phụ trách lớp!" tự ẩn sau 3.5 giây.
    - Hỗ trợ đầy đủ Light/Dark Mode theo chuẩn thương hiệu Đại học Lạc Hồng.
  - **Mục tiêu 3 (Tích hợp vào `academic-access.tsx` & `page.tsx`)**:
    - Thay thế form tĩnh cũ trong `academic-access.tsx` bằng `<ClassTeacherAssigner classItem={classItem} />`.
    - Cải thiện query `academicClasses` trong `page.tsx` để hỗ trợ lớp chưa có giảng viên phụ trách.
  - **Mục tiêu 4 (Kiểm thử & Nghiệm thu)**:
    - Pass 100% `npx tsc --noEmit` và `npm run build` (33/33 static & dynamic routes).
    - Tạo Local Commit an toàn theo đúng quy chuẩn dự án.
