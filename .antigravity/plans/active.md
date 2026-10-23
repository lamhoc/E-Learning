# Kế hoạch triển khai E-Learning

> **Trạng thái:** Partial — implementation và build đã xác minh; runtime smoke test cần cấu hình Supabase.
> **Cập nhật:** 2026-10-23

## Trạng thái đã hoàn thành

- [x] Phase 1: Landing page mới và tách AI Chat sang `/chat` (commit `70ef6a7`)
- [x] Phase 2: Redesign trang đăng nhập (commit `e3dc635`)
- [x] Phase 3: Redesign Teacher Dashboard (commit `dad1cad`)

## Phase hiện tại: Student Dashboard

### Kế hoạch

- [x] Đọc tài liệu Next.js 16 về Server Components, data fetching và authentication. Thư mục `.agents/rules/` không có trong checkout.
- [x] Đối chiếu schema hiện có; không thay đổi DB schema.
- [x] Tạo truy vấn dashboard sinh viên, sidebar và trang `/student/dashboard`.
- [x] Điều hướng sinh viên tới dashboard sau login và từ `/subjects`; giữ luồng ứng viên giảng viên đang chờ.
- [x] Chạy `npx tsc --noEmit`, `npm run build` và ESLint trên các file thay đổi.
- [ ] Runtime smoke test sau khi có `.env.local` với cấu hình Supabase và tài khoản sinh viên thử nghiệm.

### Tiêu chí nghiệm thu

- Sinh viên đã đăng nhập được chuyển tới `/student/dashboard`.
- Dashboard dùng dữ liệu theo các bảng và RLS đã có; lỗi truy vấn được hiển thị rõ.
- Giáo viên và quản trị viên tiếp tục dùng các tuyến hiện tại.
- TypeScript và production build thành công.

## Roadmap tiếp theo

- [ ] Phase 4: Tinh chỉnh ngân hàng câu hỏi.
- [ ] Phase 5: Cải tiến modal sinh câu hỏi bằng AI.
- [ ] Phase 6: Student Exam Flow, không thay đổi schema nếu chưa được duyệt.
