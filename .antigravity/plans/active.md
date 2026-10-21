# KẾ HOẠCH REDESIGN UI (ĐANG THỰC HIỆN)

> **Trạng thái:** In Progress
> **Bắt đầu:** 2026-10-21

## PHASE 1: Landing Page + Chat route tách riêng
- [ ] Chuyển AI Chat từ `/` → `/chat/page.tsx`
- [ ] Tạo Landing Page mới tại `app/page.tsx`
- [ ] Tạo `components/layout/app-navbar.tsx`

## PHASE 2: Login Page (Split Layout)
- [ ] Redesign `app/login/page.tsx` (2 cột)

## PHASE 3: Teacher Dashboard (Bento + Quick Actions)
- [ ] Cập nhật `app/teacher/dashboard/page.tsx`
- [ ] Chuẩn hóa component `TeacherSidebar`

## PHASE 4: Question Bank refinement
- [ ] Cải thiện UX trang `/teacher/questions`

## PHASE 5: AI Generator Modal refinement

## PHASE 6: Student Dashboard (mới hoàn toàn)
- [ ] Tạo `app/student/dashboard/page.tsx`

## QUY TẮC THỰC THI
- Kiểm tra schema trước khi viết query
- Phân biệt rõ static build pass vs runtime smoke test
- Không tự push — chỉ commit local sau mỗi phase pass build
