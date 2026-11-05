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
- [x] **Phase 38**: Thống kê đào tạo (Learning Analytics), Phân tích chất lượng câu hỏi (Item Analysis) & Xuất bảng điểm Excel
  - [x] **Mục tiêu 1 (Thư viện Xuất Bảng Điểm Excel/CSV `lib/excel-export.ts`)**:
    - Xây dựng tiện ích xuất file SpreadsheetML (`.xlsx` / `.xls`) với header định dạng thương hiệu LHU, đường viền bảng, và định dạng số thập phân.
    - Xây dựng tiện ích xuất file CSV kèm tiền tố UTF-8 BOM (`\uFEFF`) để Microsoft Excel hiển thị 100% tiếng Việt có dấu.
    - Đảm bảo đầy đủ các cột: STT, Mã SV (MSSV), Họ và tên, Email, Lớp, Điểm Trắc nghiệm, Điểm Tự luận, Tổng điểm, Thời gian nộp bài, Số lần vi phạm quy chế, Trạng thái chấm.
  - [x] **Mục tiêu 2 (Backend Analytics & Phân tích Câu hỏi `lib/teacher-exam-analytics.ts`)**:
    - Truy vấn bổ sung tên Lớp sinh viên (`class_memberships`), số lần vi phạm phòng thi (`exam_proctoring_logs`), và trạng thái chấm điểm chi tiết.
    - Tính toán các chỉ số thống kê mở rộng: Điểm trung bình (Mean), Điểm trung vị (Median), Điểm cao nhất (Max), Điểm thấp nhất (Min), Tỉ lệ Đạt (Pass Rate >= 5.0).
    - Tính toán chỉ số Phân tích Câu hỏi (Question Item Analysis): Độ khó $P$, Độ phân biệt $D$ theo nhóm 27% điểm cao / 27% điểm thấp, gán nhãn tự động (`Câu quá dễ`, `Câu chuẩn (Phân hóa tốt)`, `Câu khó / Cần xem lại`).
  - [x] **Mục tiêu 3 (Giao diện Thống kê Đề thi `/teacher/exams/[examId]`)**:
    - Thêm nút Xuất Excel (`.xlsx`) & Xuất CSV (`.csv`) tại giao diện.
    - Cải tiến biểu đồ Recharts Phổ điểm: Cột phổ điểm histogram, đường trung bình Mean, trung vị Median, hỗ trợ Dark Mode và Light Mode tự động.
    - Bổ sung Tab / Khu vực **"Phân tích Chất lượng Đề thi (Learning Analytics)"** với Bảng phân tích từng câu hỏi trực quan.
  - [x] **Mục tiêu 4 (Giao diện Chấm thi `/teacher/grading`)**:
    - Bổ sung trường email, lớp, điểm TN/TL trong hàng đợi chấm thi (`lib/teacher-grading.ts`).
    - Thêm nút **"Xuất Bảng Điểm Excel (.xlsx)"** và **"Xuất CSV"** cho giảng viên xuất kết quả chấm toàn diện.
  - [x] **Mục tiêu 5 (Kiểm thử & Nghiệm thu)**:
    - Chạy `npx tsc --noEmit` và `cmd /c npm run build` kiểm tra 100% không có lỗi.
    - Tạo commit cục bộ an toàn.
