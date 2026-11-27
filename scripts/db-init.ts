import fs from 'node:fs';
import path from 'node:path';
import sql from 'mssql';
import bcrypt from 'bcryptjs';
import { getDataSource, getSqlServerConfig, generateNextStudentCode } from '../lib/db/data-source';
import {
  ProfileSchema,
  UserRoleSchema,
  UserSchema,
  SubjectSchema,
  TeacherSubjectAssignmentSchema,
  ClassSchema,
  ClassMembershipSchema,
} from '../lib/db/entities';

// Nạp .env.local nếu tồn tại
function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex <= 0) continue;
    const key = line.slice(0, eqIndex).trim();
    let val = line.slice(eqIndex + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

async function main() {
  loadEnvFile(path.resolve(process.cwd(), '.env.local'));
  loadEnvFile(path.resolve(process.cwd(), '.env'));

  const cfg = getSqlServerConfig();
  console.log(`[DB-INIT] Đang kết nối SQL Server ${cfg.host}:${cfg.port} (user: ${cfg.username})...`);

  // 1. Kết nối tới master để tạo database nếu chưa có
  const masterPool = await sql.connect({
    server: cfg.host,
    port: cfg.port,
    user: cfg.username,
    password: cfg.password,
    database: 'master',
    options: {
      encrypt: cfg.encrypt,
      trustServerCertificate: cfg.trustServerCertificate,
    },
  });

  const safeDbName = cfg.database.replace(/[^a-zA-Z0-9_]/g, '');
  if (!safeDbName) throw new Error('Tên database DB_NAME không hợp lệ.');

  await masterPool.request().query(`
    IF DB_ID(N'${safeDbName}') IS NULL
    BEGIN
      CREATE DATABASE [${safeDbName}];
    END
  `);
  await masterPool.close();
  console.log(`[DB-INIT] Database [${safeDbName}] đã sẵn sàng.`);

  // 2. Chạy script DDL 001_init_sqlserver2019.sql theo từng batch GO
  const dbPool = await sql.connect({
    server: cfg.host,
    port: cfg.port,
    user: cfg.username,
    password: cfg.password,
    database: safeDbName,
    options: {
      encrypt: cfg.encrypt,
      trustServerCertificate: cfg.trustServerCertificate,
    },
  });

  const sqlPath = path.resolve(process.cwd(), 'sql', '001_init_sqlserver2019.sql');
  const ddl = fs.readFileSync(sqlPath, 'utf8');
  const batches = ddl
    .split(/^\s*GO\s*$/im)
    .map((b) => b.trim())
    .filter(Boolean);

  for (const batch of batches) {
    await dbPool.request().batch(batch);
  }
  await dbPool.close();
  console.log(`[DB-INIT] Đã thực thi xong ${batches.length} batch DDL (29 bảng + indexes).`);

  // 3. Kiểm tra kết nối TypeORM DataSource và seed dữ liệu mẫu nếu chưa có tài khoản nào
  const ds = await getDataSource();
  const userRepo = ds.getRepository(UserSchema);
  const profileRepo = ds.getRepository(ProfileSchema);
  const roleRepo = ds.getRepository(UserRoleSchema);

  const existingUsers = await userRepo.count();
  if (existingUsers === 0) {
    console.log('[DB-INIT] Đang seed tài khoản mẫu (Admin / Giảng viên / Sinh viên)...');
    const defaultPasswordHash = await bcrypt.hash('Admin@123456', 10);

    const createAccount = async (
      email: string,
      fullName: string,
      role: 'admin' | 'teacher' | 'student',
    ) => {
      const user = userRepo.create({
        email: email.toLowerCase(),
        password_hash: defaultPasswordHash,
        email_confirmed_at: new Date().toISOString(),
        is_blocked: false,
        banned_until: null,
      });
      const savedUser = await userRepo.save(user);

      const studentCode = role === 'student' ? await generateNextStudentCode(ds) : null;
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
          role,
        }),
      );
      return savedUser;
    };

    const admin = await createAccount('admin@lhu.edu.vn', 'Quản trị viên Hệ thống', 'admin');
    const teacher = await createAccount('teacher@lhu.edu.vn', 'Giảng viên Demo', 'teacher');
    const student = await createAccount('student@lhu.edu.vn', 'Sinh viên Demo', 'student');

    // Seed môn học & lớp học mẫu
    const subjectRepo = ds.getRepository(SubjectSchema);
    const subject = await subjectRepo.save(
      subjectRepo.create({
        code: 'CS101',
        name: 'Nhập môn Lập trình',
        description: 'Môn học cơ sở ngành Công nghệ Thông tin Đại học Lạc Hồng',
        created_by: admin.id,
        archived_at: null,
      }),
    );

    const tsaRepo = ds.getRepository(TeacherSubjectAssignmentSchema);
    await tsaRepo.save(
      tsaRepo.create({
        teacher_id: teacher.id,
        subject_id: subject.id,
        assigned_by: admin.id,
      }),
    );

    const classRepo = ds.getRepository(ClassSchema);
    const cls = await classRepo.save(
      classRepo.create({
        subject_id: subject.id,
        teacher_id: teacher.id,
        class_code: '24CT111-CS101',
        name: 'Nhập môn Lập trình - Nhóm 01',
        academic_year: '2026-2027',
        archived_at: null,
      }),
    );

    const cmRepo = ds.getRepository(ClassMembershipSchema);
    await cmRepo.save(
      cmRepo.create({
        class_id: cls.id,
        student_id: student.id,
      }),
    );

    console.log('[DB-INIT] Seed hoàn tất:');
    console.log('  - Admin:      admin@lhu.edu.vn   / Admin@123456');
    console.log('  - Giảng viên: teacher@lhu.edu.vn / Admin@123456');
    console.log('  - Sinh viên:  student@lhu.edu.vn / Admin@123456');
  } else {
    console.log(`[DB-INIT] CSDL đã có ${existingUsers} tài khoản, bỏ qua seed.`);
  }

  await ds.destroy();
  console.log('[DB-INIT] Hoàn tất 100%!');
}

main().catch((err) => {
  console.error('[DB-INIT] Lỗi:', err);
  process.exit(1);
});
