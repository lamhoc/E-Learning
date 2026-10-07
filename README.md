# E-Learning AI

Next.js 16 App Router starter với Supabase Auth, RLS-protected subject listing và gia sư Groq.

## Cấu hình local

1. Cài dependencies để cập nhật `package-lock.json`:

	```powershell
	npm install
	```

2. Tạo `.env.local` cạnh `package.json` bằng cách sao chép `.env.example`, rồi điền Supabase URL, anon key, service-role key, site URL và Groq key. Không commit `.env.local`; `SUPABASE_SERVICE_ROLE_KEY` chỉ được đọc ở server, tuyệt đối không dùng trong Client Component hoặc biến `NEXT_PUBLIC_*`.
3. Với Supabase project mới, chạy `supabase/schema.sql`, sau đó chạy migration theo thứ tự tên trong `supabase/migrations/`.
4. Trong Supabase Auth, bật Email/Password và thêm redirect URLs `http://localhost:3000/auth/callback` cùng URL production của bạn.
5. Chạy `npm run dev`, mở http://localhost:3000. Đăng ký student tại `/register/student`; đăng ký teacher tại `/register/teacher` (không mã mời thì chờ admin duyệt).

Admin quản lý yêu cầu giảng viên, link mời, danh mục môn, phân công môn và giảng viên phụ trách lớp tại `/admin/teacher-access`. Link mời gắn email, dùng một lần, hết hạn sau 24 giờ; DB chỉ lưu hash. Đặt `NEXT_PUBLIC_SITE_URL` đúng với domain đang dùng để link mời hoạt động ở production.

Tài khoản sinh viên và giảng viên được tạo server-side bằng Supabase Admin API với email đã xác nhận, nên không gửi mail xác nhận Auth và có thể đăng nhập ngay. `SUPABASE_SERVICE_ROLE_KEY` phải được cấu hình ở server local và Vercel, không đưa ra client. Mã mời giảng viên vẫn được kiểm tra và consume bởi trigger/RPC trong database; đăng ký giảng viên không mã mời vẫn ở trạng thái chờ admin duyệt.

Admin tạo môn học và phân công môn cho teacher. Teacher chỉ xem môn được phân công và tạo lớp của mình trong các môn đó; admin có thể chuyển lớp cho teacher khác được phân công cùng môn. Student chỉ xem môn của lớp đã ghi danh. Role được lưu trong `user_roles`, không phải `profiles.role`.

Với Supabase project đã tồn tại, chạy `supabase/migrations/20261005_teacher_subject_assignments.sql` trong SQL Editor trước khi dùng màn hình phân công môn/lớp.

Để nâng một user thành admin sau khi đăng nhập lần đầu, lấy UUID của họ từ Authentication → Users rồi chạy trong SQL Editor:

```sql
UPDATE public.user_roles
SET role = 'admin'
WHERE user_id = '<AUTH_USER_UUID>';
```

Client đọc dữ liệu qua session người dùng để RLS có hiệu lực. Không đưa service-role key vào trình duyệt.
