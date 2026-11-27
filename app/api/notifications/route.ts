import { NextRequest, NextResponse } from 'next/server';
import { IsNull } from 'typeorm';
import { getCurrentUser } from '@/lib/auth-cache';
import { getRepo } from '@/lib/db/data-source';
import { NotificationSchema } from '@/lib/db/entities';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { user } = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ notifications: [] }, { status: 401 });
  }

  try {
    const repo = await getRepo(NotificationSchema);
    const rows = await repo.find({
      where: { user_id: user.id },
      order: { created_at: 'DESC' },
      take: 20,
    });

    return NextResponse.json({ notifications: rows });
  } catch (err) {
    console.error('GET /api/notifications error:', err);
    return NextResponse.json({ error: 'Không thể tải thông báo.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { user } = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { id?: string; markAll?: boolean };
    const repo = await getRepo(NotificationSchema);
    const nowIso = new Date().toISOString();

    if (body.markAll) {
      await repo.update(
        { user_id: user.id, read_at: IsNull() },
        { read_at: nowIso },
      );
      return NextResponse.json({ ok: true });
    }

    if (typeof body.id === 'string' && /^[0-9a-f-]{36}$/i.test(body.id)) {
      await repo.update(
        { id: body.id, user_id: user.id },
        { read_at: nowIso },
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Thiếu tham số hợp lệ.' }, { status: 400 });
  } catch (err) {
    console.error('PATCH /api/notifications error:', err);
    return NextResponse.json({ error: 'Không thể cập nhật thông báo.' }, { status: 500 });
  }
}
