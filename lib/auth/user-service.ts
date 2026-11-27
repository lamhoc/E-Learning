import 'server-only';

import { createHash } from 'node:crypto';
import { getDataSource, generateNextStudentCode } from '@/lib/db/data-source';
import {
  InvitationTokenSchema,
  ProfileSchema,
  TeacherApplicationSchema,
  UserRoleSchema,
  UserSchema,
  type AppRole,
} from '@/lib/db/entities';
import { hashPassword } from './password';

export type RegisterUserInput = {
  email: string;
  password: string;
  fullName: string;
  role: 'student' | 'teacher';
  invitationToken?: string;
};

/**
 * Tạo tài khoản mới hoàn chỉnh trong 1 transaction SQL Server:
 * - Kiểm tra email trùng
 * - Nếu đăng ký giảng viên có mã mời: khóa & xác thực invitation_tokens, gán role = 'teacher'
 * - Nếu đăng ký giảng viên không mã mời: tạo teacher_applications (pending), role tạm = 'student'
 * - Nếu sinh viên: sinh student_code từ SEQUENCE dbo.student_code_seq
 */
export async function registerUserAccount(
  input: RegisterUserInput,
): Promise<{ success: true; userId: string; assignedRole: AppRole } | { success: false; message: string }> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim() || normalizedEmail.split('@')[0] || 'Student';
  const invitationToken = input.invitationToken?.trim() || '';

  const ds = await getDataSource();
  const passwordHash = await hashPassword(input.password);

  try {
    const result = await ds.transaction(async (manager) => {
      const userRepo = manager.getRepository(UserSchema);
      const profileRepo = manager.getRepository(ProfileSchema);
      const roleRepo = manager.getRepository(UserRoleSchema);
      const inviteRepo = manager.getRepository(InvitationTokenSchema);
      const appRepo = manager.getRepository(TeacherApplicationSchema);

      const existing = await userRepo.findOne({ where: { email: normalizedEmail } });
      if (existing) {
        throw new Error('EMAIL_EXISTS');
      }

      let assignedRole: AppRole = 'student';
      let registrationSource: 'student' | 'teacher_invitation' | 'teacher_application' = 'student';
      let matchedInviteId: string | null = null;

      if (input.role === 'teacher') {
        if (invitationToken) {
          const tokenHash = createHash('sha256').update(invitationToken).digest('hex');
          const invite = await inviteRepo.findOne({
            where: { token_hash: tokenHash, email: normalizedEmail },
          });

          if (!invite || invite.used_at !== null || new Date(invite.expires_at).getTime() <= Date.now()) {
            throw new Error('INVALID_INVITATION');
          }
          matchedInviteId = invite.id;
          assignedRole = 'teacher';
          registrationSource = 'teacher_invitation';
        } else {
          assignedRole = 'student';
          registrationSource = 'teacher_application';
        }
      }

      const savedUser = await userRepo.save(
        userRepo.create({
          email: normalizedEmail,
          password_hash: passwordHash,
          email_confirmed_at: new Date().toISOString(),
          is_blocked: false,
          banned_until: null,
        }),
      );

      const isPureStudent = assignedRole === 'student' && registrationSource === 'student';
      const studentCode = isPureStudent ? await generateNextStudentCode(ds) : null;

      await profileRepo.save(
        profileRepo.create({
          id: savedUser.id,
          full_name: fullName,
          student_code: studentCode,
        }),
      );

      await roleRepo.save(
        roleRepo.create({
          user_id: savedUser.id,
          role: assignedRole,
        }),
      );

      if (matchedInviteId) {
        await inviteRepo.update(
          { id: matchedInviteId },
          { used_at: new Date().toISOString(), used_by: savedUser.id },
        );
      }

      if (registrationSource === 'teacher_application') {
        await appRepo.save(
          appRepo.create({
            user_id: savedUser.id,
            email: normalizedEmail,
            status: 'pending',
            reviewed_by: null,
            reviewed_at: null,
            review_note: null,
          }),
        );
      }

      return { userId: savedUser.id, assignedRole };
    });

    return { success: true, ...result };
  } catch (err: unknown) {
    const code = err instanceof Error ? err.message : '';
    if (code === 'EMAIL_EXISTS') {
      return {
        success: false,
        message: 'Email này đã có tài khoản. Hãy đăng nhập hoặc dùng tính năng Quên mật khẩu.',
      };
    }
    if (code === 'INVALID_INVITATION') {
      return {
        success: false,
        message: 'Link mời giảng viên không hợp lệ, đã hết hạn, đã dùng hoặc không khớp email.',
      };
    }
    console.error('[registerUserAccount] Error:', err);
    return {
      success: false,
      message: 'Không thể tạo tài khoản lúc này. Vui lòng thử lại.',
    };
  }
}

/**
 * Thay thế Postgres RPC `claim_teacher_invitation`:
 * Tài khoản đang đăng nhập nhận mã mời giảng viên gắn với chính email của họ.
 */
export async function claimTeacherInvitationForUser(
  userId: string,
  userEmail: string,
  tokenHash: string,
): Promise<{ success: boolean; message: string }> {
  if (!/^[0-9a-f]{64}$/i.test(tokenHash)) {
    return { success: false, message: 'Link mời không hợp lệ.' };
  }

  const normalizedEmail = userEmail.trim().toLowerCase();
  const ds = await getDataSource();

  try {
    await ds.transaction(async (manager) => {
      const roleRepo = manager.getRepository(UserRoleSchema);
      const inviteRepo = manager.getRepository(InvitationTokenSchema);
      const appRepo = manager.getRepository(TeacherApplicationSchema);
      const profileRepo = manager.getRepository(ProfileSchema);

      const roleRecord = await roleRepo.findOne({ where: { user_id: userId } });
      if (roleRecord?.role === 'teacher') {
        return;
      }

      const invite = await inviteRepo.findOne({
        where: { token_hash: tokenHash, email: normalizedEmail },
      });

      if (!invite || invite.used_at !== null || new Date(invite.expires_at).getTime() <= Date.now()) {
        throw new Error('INVALID_INVITATION');
      }

      const nowIso = new Date().toISOString();
      await inviteRepo.update({ id: invite.id }, { used_at: nowIso, used_by: userId });

      if (roleRecord) {
        await roleRepo.update({ user_id: userId }, { role: 'teacher' });
      } else {
        await roleRepo.save(roleRepo.create({ user_id: userId, role: 'teacher' }));
      }

      // Gỡ student_code nếu trước đó là sinh viên
      await profileRepo.update({ id: userId }, { student_code: null });

      // Nếu đang có đơn pending thì tự động duyệt
      await appRepo
        .createQueryBuilder()
        .update()
        .set({
          status: 'approved',
          reviewed_at: nowIso,
          review_note: 'Approved by email-bound invitation',
        })
        .where('user_id = :userId AND status = :status', { userId, status: 'pending' })
        .execute();
    });

    return { success: true, message: 'Đã xác nhận mã mời giảng viên.' };
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'INVALID_INVITATION') {
      return {
        success: false,
        message: 'Không thể nhận mã mời. Hãy kiểm tra email đăng nhập, hạn dùng và trạng thái của link.',
      };
    }
    console.error('[claimTeacherInvitationForUser] Error:', err);
    return {
      success: false,
      message: 'Không thể xác nhận mã mời lúc này.',
    };
  }
}
