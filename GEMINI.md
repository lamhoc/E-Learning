# ANTIGRAVITY PRO MAX: BẢN HIẾN PHÁP DỰ ÁN (WORKSPACE CONTRACT)

> **File này là kim chỉ nam tối cao cho Antigravity AI khi làm việc trong Workspace này.**
> Mọi task thực hiện (kể cả nhỏ nhất) đều phải tuân thủ nghiêm ngặt các nguyên tắc dưới đây.
> Các quy tắc kỹ thuật chi tiết theo từng lĩnh vực được mô-đun hóa trong thư mục `.agents/rules/`.

---

## 1. NGUYÊN TẮC BẤT BIẾN (CORE GUARDRAILS)

1. **Plan First (Kế hoạch trước - Code sau)**:
   - Trước khi sửa/tạo code, phải lập hoặc cập nhật kế hoạch vào `.antigravity/plans/active.md`.
   - Phân rã công việc thành từng Phase cụ thể kèm tiêu chí nghiệm thu (Acceptance Criteria).
2. **Không nói suông (Truthful Verification)**:
   - Tuyệt đối không bao giờ báo cáo `complete` nếu chưa có bằng chứng kiểm thử thực tế (Terminal log, Unit test, Build output, API status code).
   - Nếu bị lỗi hoặc chưa test được, phải báo `partial` hoặc `blocked` kèm lý do rõ ràng.
3. **Bảo tồn mã nguồn (Preserve Code & Comments)**:
   - Chỉ chỉnh sửa tập trung vào file liên quan đến yêu cầu.
   - Giữ nguyên các comment giải thích nghiệp vụ có sẵn, không tự tiện xóa hoặc refactor code không thuộc phạm vi task.
4. **Hài hòa ngôn ngữ**:
   - Khái niệm kỹ thuật, biến hệ thống, config, API protocols: Dùng tiếng Anh chuẩn quốc tế (`accessToken`, `isDeleted`, `transaction`, `req`, `res`).
   - Logic nghiệp vụ, chú thích giải thích trong code, thông điệp người dùng, tài liệu: Dùng tiếng Việt rõ ràng, dễ hiểu để thuận tiện báo cáo và bảo vệ đồ án.

---

## 2. BỘ ĐIỀU PHỐI QUY TẮC KỸ THUẬT (.AGENTS/RULES/)

Tùy theo yêu cầu môn học hoặc đề tài, Antigravity tự động kích hoạt và tuân thủ các bộ luật tương ứng:

* 📌 **Quy trình làm việc**: Đọc `.agents/rules/00-core-workflow.md`
* 🏛️ **Kiến trúc hệ thống (Clean Arch / Phân tầng)**: Đọc `.agents/rules/01-architecture-clean.md`
* 🌐 **Chuẩn thiết kế RESTful API**: Đọc `.agents/rules/02-api-restful.md`
* 🗄️ **Chuẩn thiết kế CSDL (Postgres / SQL Server)**: Đọc `.agents/rules/03-database-design.md`
* 🔷 **Nếu dự án dùng C# / .NET Core**: Đọc `.agents/rules/04-backend-dotnet.md`
* 🟩 **Nếu dự án dùng Node.js / Express / NestJS**: Đọc `.agents/rules/05-backend-nodejs.md`
* 🎨 **Chuẩn giao diện Frontend (React / Next.js / Tailwind)**: Đọc `.agents/rules/06-frontend-craftsmanship.md`
* 🐙 **Quy chuẩn Git & Commit**: Đọc `.agents/rules/07-git-workflow.md`
* 🛡️ **Bảo mật & Phân quyền (JWT / RBAC / OWASP)**: Đọc `.agents/rules/08-security-auth.md`
* 🐍 **Nếu dự án dùng Python / FastAPI**: Đọc `.agents/rules/09-backend-python.md`
* 📱 **Nếu dự án phát triển Mobile App (React Native/Flutter)**: Đọc `.agents/rules/10-mobile-craftsmanship.md`
* 🐳 **Chuẩn đóng gói & triển khai Docker**: Đọc `.agents/rules/11-docker-deployment.md`

---

## 3. CƠ CHẾ TRIỆU HỒI SUBAGENTS CHUYÊN BIỆT (.AGENTS/AGENTS/)

Antigravity tích hợp sẵn kho tác tử chuyên trách cao cấp để phối hợp giải quyết mọi bài toán:
* 🏛️ **Kiến trúc & Hệ thống**: `backend-architect.md`, `dotnet-architect.md`, `db-architect.md`, `mermaid-expert.md`.
* 💻 **Thực thi Fullstack, Backend & Mobile**: `frontend-developer.md`, `typescript-pro.md`, `python-pro.md`, `java-pro.md`, `golang-pro.md`, `mobile-developer.md` (React Native/Flutter), `ui-ux-designer.md`.
* 🧪 **Kiểm thử & QA**: `qa-tester.md`, `test-automator.md`, `playwright.md`, `tdd-orchestrator.md`.
* 🛡️ **Kiểm toán & Tối ưu**: `code-reviewer.md`, `security-auditor.md`, `database-optimizer.md`, `performance-engineer.md`.
* 📚 **Tài liệu & Học thuật**: `docs-architect.md` (soạn báo cáo đồ án), `api-documenter.md` (Swagger/OpenAPI).
* 👔 **Bộ Tác tử Kỹ sư Chuyên Sâu (`engineering/` & `personas/`)**: `cs-backend-engineer.md`, `cs-frontend-engineer.md`, `cs-karpathy-reviewer.md`, `cs-senior-engineer.md`, `startup-cto.md`, `devops-engineer.md`...

---

## 4. KHO KỸ NĂNG TỰ ĐỘNG HÓA (.AGENTS/SKILLS/)

Khi gặp tác vụ phức tạp, Antigravity chủ động kích hoạt các skill tương ứng:
* 🎨 **Giao diện & UI/UX**: `impeccable` (35 playbooks chuẩn frontend), `shadcn` (components chuẩn), `minimalist-skill` (thẩm mỹ tối giản).
* 🏛️ **Kiến trúc & CSDL**: `dotnet-aspnetcore`, `dotnet-data`, `postgresql-table-design`, `domain-modeling` (Matt Pocock).
* 🧪 **Kiểm thử & QA**: `api-testing`, `playwright-e2e-testing`, `test-driven-development`.
* 🔍 **Gỡ lỗi & Nghiệm thu**: `systematic-debugging` (điều tra 5 tầng gốc rễ), `verification-before-completion` (nghiệm thu có chứng cứ).

