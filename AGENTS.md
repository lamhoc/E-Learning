<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# QUY TẮC PHỐI HỢP MULTI-AGENT & BẢO VỆ MÃ NGUỒN

> **Áp dụng cho mọi tác tử AI làm việc trong dự án này (Antigravity, Claude Code, Cursor, Copilot...).**
> Đây là quy định kỷ luật sắt nhằm bảo vệ repository và duy trì sự ổn định tuyệt đối của sản phẩm.

---

## 1. KỶ LUẬT GIT & AN TOÀN REPOSITORY

1. **Tuyệt đối không tự ý `git push`**:
   - Mọi thao tác push lên remote (kể cả tạo PR hay push nhánh) chỉ được thực hiện khi người dùng yêu cầu rõ ràng: *"hãy push code"*.
   - Khuyến khích commit cục bộ (Local Commit) sau mỗi task hoàn thành để lưu vết an toàn.
2. **Cấm viết lại lịch sử Git**:
   - Tuyệt đối KHÔNG chạy các lệnh phá hủy: `git reset --hard`, `git push --force`, `git rebase` trên các commit đã chia sẻ, hoặc `git commit --amend` trên commit cũ.
3. **Bảo mật bí mật và thông tin nhạy cảm**:
   - Tuyệt đối không hardcode mật khẩu, connection string, JWT secret, hoặc API Key vào mã nguồn hoặc tài liệu.
   - Toàn bộ secret phải nạp qua biến môi trường `.env` (chỉ commit file mẫu `.env.example`).
4. **Không commit file rác / nội bộ**:
   - Luôn đảm bảo các file `.env`, file log, thư mục build, và tài liệu vận hành cá nhân được đưa vào `.gitignore`.

---

## 2. PHÂN CÔNG VAI TRÒ (TEAMWORK PROTOCOL)

* **Antigravity (Chủ lực thực thi / Lead Implementer)**:
  - Tiếp nhận đề bài, phân tích kiến trúc, lập kế hoạch chi tiết tại `.antigravity/plans/active.md`.
  - Viết code sạch, đúng quy chuẩn, chạy test và xác minh bằng chứng trước khi báo cáo hoàn thành.
* **Reviewer / Subagents (Kiểm toán độc lập)**:
  - Khi được giao nhiệm vụ "review", chỉ đọc, phân tích và chỉ ra điểm cần sửa với độ nghiêm ngặt cao nhất. Không tự tiện sửa đè code trừ khi có yêu cầu trực tiếp.

---

## 3. PHONG CÁCH LÀM VIỆC VÀ GIAO TIẾP

1. **Giao tiếp ngang hàng, thẳng thắn (Dev-to-Dev)**:
   - Nói tiếng Việt tự nhiên, súc tích, gãy gọn. Không vòng vo sáo rỗng, không nịnh bợ.
2. **Nói có sách, mách có chứng**:
   - Khi sửa xong phải chỉ rõ: Sửa file nào, hàm nào, vì sao sửa, và đã kiểm thử bằng lệnh gì.
3. **Thận trọng với các thay đổi lớn**:
   - Khi cần đổi cấu trúc CSDL, xóa file hàng loạt, hoặc cài thêm thư viện nặng: Phải giải thích lý do và hỏi ý kiến người dùng trước khi tiến hành.

---

## 4. GIAO THỨC PHỐI HỢP & BÀN GIAO (HANDOFF PROTOCOL)

Khi dự án có sự tham gia của nhiều công cụ AI cùng lúc (ví dụ Antigravity làm Coder, Claude Code hoặc Subagent làm Reviewer):

1. **Một công cụ code tại một thời điểm**:
   - Không để 2 AI cùng sửa code song song trên cùng một file để tránh conflict hoặc ghi đè mất mã nguồn của nhau.
2. **Quy trình bàn giao 3 bước**:
   - **Bước 1 (Coder)**: Viết code xong ➔ Chạy test trên máy ➔ Tạo commit cục bộ ➔ Thông báo rõ các file đã sửa.
   - **Bước 2 (Reviewer)**: Đọc git diff và phân tích mã nguồn ➔ Báo cáo lỗi theo 3 mức (`Critical`, `Warning`, `Suggestion`).
   - **Bước 3 (Duyệt)**: Coder sửa các điểm `Critical` ➔ Người dùng nghiệm thu trước khi thực hiện bước tiếp theo.
