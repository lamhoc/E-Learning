import { NextResponse } from 'next/server';
import { getDataSource } from '@/lib/db/data-source';
import { UserRoleSchema, UserSchema } from '@/lib/db/entities';
import { verifyPassword } from '@/lib/auth/password';
import { buildSessionCookieOptions, signSessionToken } from '@/lib/auth/session';

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
    };
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Vui lòng nhập đầy đủ email và mật khẩu.' },
        { status: 400 },
      );
    }

    const ds = await getDataSource();
    const userRepo = ds.getRepository(UserSchema);
    const roleRepo = ds.getRepository(UserRoleSchema);

    const user = await userRepo.findOne({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.' },
        { status: 401 },
      );
    }

    const validPassword = await verifyPassword(password, user.password_hash);
    if (!validPassword) {
      return NextResponse.json(
        { error: 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.' },
        { status: 401 },
      );
    }

    const isBannedByDate = Boolean(
      user.banned_until && new Date(user.banned_until).getTime() > Date.now(),
    );
    if (user.is_blocked || isBannedByDate) {
      return NextResponse.json(
        { error: 'Tài khoản của bạn hiện đang bị khóa. Vui lòng liên hệ quản trị viên.' },
        { status: 403 },
      );
    }

    const roleRecord = await roleRepo.findOne({ where: { user_id: user.id } });
    const role = roleRecord?.role ?? 'student';

    const token = await signSessionToken({
      sub: user.id,
      email: user.email,
      role,
    });

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, role },
    });

    const cookieOpts = buildSessionCookieOptions();
    response.cookies.set(cookieOpts.name, token, {
      httpOnly: cookieOpts.httpOnly,
      sameSite: cookieOpts.sameSite,
      secure: cookieOpts.secure,
      path: cookieOpts.path,
      maxAge: cookieOpts.maxAge,
    });

    return response;
  } catch (err) {
    console.error('[POST /api/auth/login] Error:', err);
    return NextResponse.json(
      { error: 'Lỗi hệ thống khi đăng nhập. Kiểm tra kết nối SQL Server.' },
      { status: 500 },
    );
  }
}
