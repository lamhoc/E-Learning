# E-Learning AI

Next.js 16 App Router starter với Supabase Auth, RLS-protected subject listing và gia sư Groq.

## Cấu hình local

1. Cài dependencies để cập nhật `package-lock.json`:

	```powershell
	npm install
	```

2. Tạo `.env.local` cạnh `package.json` bằng cách sao chép `.env.example`, rồi điền Project URL, anon/publishable key và Groq key. Không commit `.env.local`.
3. Với Supabase project mới, chạy `supabase/schema.sql` một lần trong SQL Editor.
4. Bật Email/Password trong Supabase Auth và tạo người dùng trong Authentication. Trigger trong schema tự tạo profile và role `student`.
5. Chạy `npm run dev`, mở http://localhost:3000, đăng nhập tại `/login`; `/subjects` hiển thị môn theo role và lớp đã phân công/ghi danh.

Admin xem toàn bộ môn; teacher xem môn có lớp mình phụ trách; student xem môn của lớp đã ghi danh. Role được lưu trong `user_roles`, không phải `profiles.role`.

Để nâng một user thành admin sau khi đăng nhập lần đầu, lấy UUID của họ từ Authentication → Users rồi chạy trong SQL Editor:

```sql
UPDATE public.user_roles
SET role = 'admin'
WHERE user_id = '<AUTH_USER_UUID>';
```

Client đọc dữ liệu qua session người dùng để RLS có hiệu lực. Không đưa service-role key vào trình duyệt.
