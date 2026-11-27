import { NextResponse } from 'next/server';
import { getCurrentUserWithRole } from '@/lib/auth-cache';
import { getRepo } from '@/lib/db/data-source';
import { ProfileSchema } from '@/lib/db/entities';
import { sanitizeVietnameseText } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { user, role } = await getCurrentUserWithRole();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const profileRepo = await getRepo(ProfileSchema);
  const profile = await profileRepo.findOne({ where: { id: user.id } });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      role,
      fullName: sanitizeVietnameseText(profile?.full_name) || user.email || null,
      studentCode: profile?.student_code ?? null,
    },
  });
}
