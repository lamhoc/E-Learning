import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth/session';
import { hashPassword } from '@/lib/auth/password';
import { getDataSource } from '@/lib/db/data-source';
import { UserRoleSchema, UserSchema } from '@/lib/db/entities';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const session = await verifySessionToken(token);

    if (!session) {
      return NextResponse.json(
        { error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' },
        { status: 401 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as { password?: string };
    const password = String(body.password ?? '');

    if (password.length < 12 || password.length > 128) {
      return NextResponse.json(
        { error: 'Mật khẩu mới phải có từ 12 đến 128 ký tự.' },
        { status: 400 },
      );
    }

    const ds = await getDataSource();
    const userRepo = ds.getRepository(UserSchema);
    const roleRepo = ds.getRepository(UserRoleSchema);

    const passwordHash = await hashPassword(password);
    await userRepo.update({ id: session.sub }, { password_hash: passwordHash });

    const roleRecord = await roleRepo.findOne({ where: { user_id: session.sub } });
    return NextResponse.json({
      success: true,
      role: roleRecord?.role ?? session.role,
    });
  } catch (err) {
    console.error('[POST /api/auth/set-password] Error:', err);
    return NextResponse.json({ error: 'Không thể cập nhật mật khẩu lúc này.' }, { status: 500 });
  }
}
