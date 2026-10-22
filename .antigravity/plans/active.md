# KẾ HOẠCH REDESIGN UI (ĐANG THỰC HIỆN)

> **Trạng thái:** In Progress
> **Bắt đầu:** 2026-10-21

## PHASE 1: Landing Page + Chat route tách riêng ✅ DONE
- [x] Chuyển AI Chat từ `/` → `app/chat/page.tsx`
- [x] Tạo Landing Page mới tại `app/page.tsx` (Hero, Bento, Stats, How It Works, CTA, Footer)
- [x] Cập nhật links "Gia sư AI" → `/chat` trong sidebar + dashboard
- [x] Build pass (17/17 routes) + commit `70ef6a7` + push origin main

## PHASE 2: Login Page (Split Layout) ← NEXT
- [ ] Redesign `app/login/page.tsx` (split: left brand panel + right form panel)
- [ ] Mobile: chỉ hiện form panel
- [ ] Giữ nguyên toàn bộ logic auth hiện có

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
- Auto-push sau mỗi phase pass build (theo yêu cầu user)
