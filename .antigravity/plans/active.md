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
- [x] **Phase 37**: Nâng cấp phòng thi trực tuyến (Shuffle đề, Fullscreen Lockdown, Camera Proctoring)
  - [x] **Mục tiêu 1 (Deterministic Seeded Shuffle)**:
    - Tạo `lib/exam-shuffle.ts` với PRNG xác định (Mulberry32) băm theo `attemptId` và `questionId`.
    - Xáo trộn thứ tự câu hỏi và thứ tự phương án A-B-C-D cho từng thí sinh.
    - Bảo toàn đáp án khi F5 reload và gửi đúng `originalKey` về Server để chấm điểm tự động chính xác 100%.
  - [x] **Mục tiêu 2 (Fullscreen Lockdown)**:
    - Màn hình khởi động phòng thi yêu cầu kích hoạt `document.documentElement.requestFullscreen()`.
    - Bắt sự kiện `fullscreenchange`: ghi nhận vi phạm `fullscreen_exit`, cảnh báo modal bắt quay lại toàn màn hình.
    - Chạm ngưỡng 3 lần vi phạm: Tự động khóa và nộp bài thi ngay lập tức.
  - [x] **Mục tiêu 3 (Webcam AI Proctoring)**:
    - Component `components/student/exam-webcam-proctor.tsx` hiển thị video PiP góc dưới kèm trạng thái giám sát AI.
    - Thu nhỏ gọn tránh che đề bài; định kỳ 60s quét độ sáng canvas phát hiện camera bị che tối đen.
    - Ghi log vi phạm `camera_blocked` vào CSDL `exam_proctoring_logs`.
  - [x] **Mục tiêu 4 (Giảng viên đối soát & Nghiệm thu)**:
    - Hiển thị chi tiết vi phạm (rời tab, thoát toàn màn hình, che camera) trên trang chấm thi `/teacher/grading/[attemptId]`.
    - Thẻ thông tin an ninh phòng thi trong `components/teacher/exam-create-form.tsx`.
    - Kiểm tra `npx tsc --noEmit` & `npm run build` đạt 100% không lỗi và tạo commit cục bộ.
