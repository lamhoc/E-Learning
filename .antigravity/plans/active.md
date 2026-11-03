# Kế hoạch phát triển dự án E-Learning (Mầm Học)

## Trạng thái các Phase

- [x] **Phase 1-27**: Hoàn thiện các tính năng cốt lõi (Xem git log).
- [x] **Phase 28 (Commit `e48754b`)**: Đồng bộ nhận diện thương hiệu Đại học Lạc Hồng & Thêm nút chuyển đổi giao diện Sáng / Tối (Light/Dark Mode).
- [x] **Phase 29 (Commit `99e1ef8`)**: Sửa lỗi `cookies() inside unstable_cache()` và tối ưu hệ thống cache Next.js 16.
- [x] **Phase 30 (Commit `6ac63c0`)**: Tạo trang Quản lý Môn học riêng cho Admin `/admin/subjects`, sửa điều hướng và khắc phục triệt để lỗi mã hóa ký tự tên user tiếng Việt.
- [x] **Phase 31 (Commit `local`)**: Đồng bộ triệt để màu sắc & độ tương phản trong Dark Mode
  - **Mục tiêu 1 (Khung Layout chính & Nền trang)**:
    - Tạo `app/teacher/layout.tsx` và `app/student/layout.tsx` chuẩn hóa nền `bg-slate-50 dark:bg-[#09111E] text-slate-900 dark:text-slate-100 transition-colors`.
    - Cập nhật `app/admin/layout.tsx` với `<main className="flex-1 bg-slate-50 dark:bg-[#09111E] text-slate-900 dark:text-slate-100 transition-colors">`.
    - Thay thế toàn bộ mã màu nền cũ `bg-[#f3f6f3]` và `bg-slate-50 text-slate-900` trên mọi trang con và `loading.tsx` thành `bg-slate-50 dark:bg-[#09111E] text-slate-900 dark:text-slate-100 transition-colors`.
  - **Mục tiêu 2 (Sửa lỗi mất chữ & Tương phản /teacher/questions)**:
    - 4 Thẻ thống kê: Quy chuẩn hóa sang `bg-white dark:bg-[#111C2D] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-xs`.
    - Toolbar lọc câu hỏi: Nền thẻ `bg-white dark:bg-[#111C2D] border-slate-200 dark:border-slate-800`.
    - Nút outline "Xem trước đề": Thêm `dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100 dark:hover:bg-slate-700`.
    - Nút outline "Upload tài liệu": Thêm `dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60`.
    - Nút "AI Sinh câu hỏi": Thêm `dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50`.
    - Ô `input`, dropdown `select`: `bg-white dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100`.
    - Thẻ câu hỏi và thẻ rỗng: `bg-white dark:bg-[#111C2D] border-slate-200 dark:border-slate-800`.
  - **Mục tiêu 3 (Sửa lỗi trang Admin Quản lý Sinh viên /admin/student-management)**:
    - Tiêu đề: `text-slate-900 dark:text-white`. Mô tả: `text-slate-600 dark:text-slate-400`.
    - Thẻ "Tổng sinh viên": `bg-white dark:bg-[#111C2D] border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white`.
    - Thẻ "Đang hoạt động": `bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60`, số liệu `dark:text-emerald-300`.
    - Thẻ "Đang bị khóa": `bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60`, số liệu `dark:text-rose-300`.
    - Card bảng và các hàng dữ liệu: `bg-white dark:bg-[#111C2D] border-slate-200 dark:border-slate-800`, text `dark:text-slate-100`.
    - Nút hành động Mở khóa / Khóa: Tương phản rõ nét trong Dark Mode.
  - **Mục tiêu 4 (Rà soát toàn diện các trang Sinh viên, Giảng viên & Admin)**:
    - `/student/materials`, `/student/dashboard`, `/student/classes`, `/student/assignments`, `/student/exams`, `/student/exams/[examId]`.
    - `/teacher/dashboard`, `/teacher/grading`, `/teacher/subjects`, `/teacher/exams/[examId]`, `/teacher/exams/create`, `/teacher/classes/[classId]/...`.
    - `ClassMaterialUploadForm`, `ClassMaterialList`, `EssayGradingClient`, `ExamCreateForm`, `ExamScoreChart`, `ExamTakingClient`, `AIGeneratorModal`, `ExamPreviewModal`.
  - **Tiêu chí nghiệm thu**:
    - `cmd /c npx tsc --noEmit` đạt 0 lỗi (Exit Code 0).
    - `cmd /c npm run build` đạt 100% (31/31 routes compile thành công, Exit Code 0).
    - Cam kết kỷ luật: Tạo Local Commit, không tự ý `git push` khi chưa có lệnh.
