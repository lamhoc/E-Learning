'use server';

import { createHash, randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type InvitationState = {
  status: 'idle' | 'error' | 'success';
  message: string;
  invitationUrl?: string;
};

async function getAdminClient() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Vui lòng đăng nhập lại.', supabase: null };

  const { data: roleRecord, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();
  if (roleError || roleRecord?.role !== 'admin') {
    return { error: 'Chỉ admin mới được quản lý quyền giảng viên.', supabase: null };
  }

  return { error: null, supabase, user };
}

export async function createSubject(formData: FormData) {
  const code = String(formData.get('code') ?? '').trim().toUpperCase();
  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  if (!/^[A-Z0-9_-]{2,24}$/.test(code) || name.length < 2 || name.length > 120 || description.length > 1000) {
    redirect('/admin/teacher-access?error=subject-invalid');
  }

  const { error: adminError, supabase, user } = await getAdminClient();
  if (adminError || !supabase || !user) redirect('/admin/teacher-access?error=unauthorized');

  const { error } = await supabase.from('subjects').insert({
    code,
    name,
    description: description || null,
    created_by: user.id,
  });
  if (error) {
    console.error('Could not create subject:', error.code, error.message);
    redirect(`/admin/teacher-access?error=${error.code === '23505' ? 'subject-duplicate' : 'subject-create'}`);
  }

  revalidatePath('/admin/teacher-access');
  revalidatePath('/subjects');
  redirect('/admin/teacher-access?success=subject-created');
}

export async function assignTeacherSubject(formData: FormData) {
  const teacherId = String(formData.get('teacherId') ?? '');
  const subjectId = String(formData.get('subjectId') ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(teacherId) || !/^[0-9a-f-]{36}$/i.test(subjectId)) {
    redirect('/admin/teacher-access?error=assignment-invalid');
  }

  const { error: adminError, supabase, user } = await getAdminClient();
  if (adminError || !supabase || !user) redirect('/admin/teacher-access?error=unauthorized');

  const { error } = await supabase.from('teacher_subject_assignments').upsert({
    teacher_id: teacherId,
    subject_id: subjectId,
    assigned_by: user.id,
  }, { onConflict: 'teacher_id,subject_id', ignoreDuplicates: true });
  if (error) {
    console.error('Could not assign subject to teacher:', error.code, error.message);
    redirect('/admin/teacher-access?error=assignment-save');
  }

  revalidatePath('/admin/teacher-access');
  revalidatePath('/teacher/dashboard');
  revalidatePath('/subjects');
  redirect('/admin/teacher-access?success=assignment-saved');
}

export async function removeTeacherSubject(formData: FormData) {
  const teacherId = String(formData.get('teacherId') ?? '');
  const subjectId = String(formData.get('subjectId') ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(teacherId) || !/^[0-9a-f-]{36}$/i.test(subjectId)) {
    redirect('/admin/teacher-access?error=assignment-invalid');
  }

  const { error: adminError, supabase } = await getAdminClient();
  if (adminError || !supabase) redirect('/admin/teacher-access?error=unauthorized');

  const { error } = await supabase
    .from('teacher_subject_assignments')
    .delete()
    .eq('teacher_id', teacherId)
    .eq('subject_id', subjectId);
  if (error) {
    console.error('Could not remove teacher subject assignment:', error.code, error.message);
    redirect('/admin/teacher-access?error=assignment-remove');
  }

  revalidatePath('/admin/teacher-access');
  revalidatePath('/teacher/dashboard');
  revalidatePath('/subjects');
  redirect('/admin/teacher-access?success=assignment-removed');
}

export async function assignClassTeacher(formData: FormData) {
  const classId = String(formData.get('classId') ?? '');
  const teacherId = String(formData.get('teacherId') ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(classId) || !/^[0-9a-f-]{36}$/i.test(teacherId)) {
    redirect('/admin/teacher-access?error=class-assignment-invalid');
  }

  const { error: adminError, supabase } = await getAdminClient();
  if (adminError || !supabase) redirect('/admin/teacher-access?error=unauthorized');

  const { data: classRecord, error: classError } = await supabase
    .from('classes')
    .select('subject_id')
    .eq('id', classId)
    .maybeSingle();
  if (classError || !classRecord) redirect('/admin/teacher-access?error=class-assignment-failed');

  const { data: assignment, error: assignmentError } = await supabase
    .from('teacher_subject_assignments')
    .select('teacher_id')
    .eq('teacher_id', teacherId)
    .eq('subject_id', classRecord.subject_id)
    .maybeSingle();
  if (assignmentError || !assignment) redirect('/admin/teacher-access?error=class-assignment-subject');

  const { error } = await supabase.from('classes').update({ teacher_id: teacherId }).eq('id', classId);
  if (error) {
    console.error('Could not assign class to teacher:', error.code, error.message);
    redirect('/admin/teacher-access?error=class-assignment-failed');
  }

  revalidatePath('/admin/teacher-access');
  revalidatePath('/teacher/dashboard');
  revalidatePath('/subjects');
  redirect('/admin/teacher-access?success=class-assigned');
}

export async function createTeacherInvitation(
  _previousState: InvitationState,
  formData: FormData,
): Promise<InvitationState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: 'error', message: 'Nhập email giảng viên hợp lệ.' };
  }

  const { error: adminError, supabase, user } = await getAdminClient();
  if (adminError || !supabase || !user) {
    return { status: 'error', message: adminError ?? 'Không thể xác thực quyền admin.' };
  }

  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from('invitation_tokens').insert({
    email,
    token_hash: tokenHash,
    created_by: user.id,
    expires_at: expiresAt,
  });

  if (error) {
    console.error('Could not create teacher invitation:', error.message);
    return { status: 'error', message: 'Không thể tạo mã mời. Kiểm tra migration và quyền admin.' };
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const invitationUrl = new URL('/register/teacher', siteUrl);
  invitationUrl.searchParams.set('email', email);
  invitationUrl.searchParams.set('invite', token);

  return {
    status: 'success',
    message: 'Link mời có hiệu lực 24 giờ và chỉ dùng được một lần. Hãy sao chép ngay; token thô sẽ không được lưu lại.',
    invitationUrl: invitationUrl.toString(),
  };
}

export async function reviewTeacherApplication(formData: FormData) {
  const userId = String(formData.get('userId') ?? '');
  const decision = String(formData.get('decision') ?? '');
  const approve = decision === 'approve';
  const note = String(formData.get('note') ?? '').trim().slice(0, 500);
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !['approve', 'reject'].includes(decision)) {
    redirect('/admin/teacher-access?error=invalid');
  }

  const { error: adminError, supabase } = await getAdminClient();
  if (adminError || !supabase) redirect('/admin/teacher-access?error=unauthorized');

  const { error } = await supabase.rpc('review_teacher_application', {
    p_user_id: userId,
    p_approve: approve,
    p_note: note || null,
  });
  if (error) {
    console.error('Could not review teacher application:', error.message);
    redirect('/admin/teacher-access?error=review');
  }

  revalidatePath('/admin/teacher-access');
  revalidatePath('/register/teacher/pending');
  revalidatePath('/subjects');
  redirect(`/admin/teacher-access?success=${approve ? 'approved' : 'rejected'}`);
}
