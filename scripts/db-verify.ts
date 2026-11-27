import fs from 'node:fs';
import path from 'node:path';
import { SignJWT, jwtVerify } from 'jose';

// Nạp .env.local trước khi khởi tạo TypeORM DataSource
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq > 0) {
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

import { getDataSource, getRepo } from '../lib/db/data-source';
import {
  ClassMembershipSchema,
  ClassSchema,
  ProfileSchema,
  SubjectSchema,
  UserRoleSchema,
  UserSchema,
} from '../lib/db/entities';
import { verifyPassword } from '../lib/auth/password';

async function main() {
  const ds = await getDataSource();
  const tables: Array<{ TABLE_NAME: string }> = await ds.query(
    "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_SCHEMA = 'dbo' ORDER BY TABLE_NAME",
  );
  console.log('TABLES_COUNT:', tables.length);
  if (tables.length < 29) {
    throw new Error(`Expected >= 29 tables, got ${tables.length}`);
  }

  const userRepo = await getRepo(UserSchema);
  const roleRepo = await getRepo(UserRoleSchema);
  const profileRepo = await getRepo(ProfileSchema);
  const subjectRepo = await getRepo(SubjectSchema);
  const classRepo = await getRepo(ClassSchema);
  const membershipRepo = await getRepo(ClassMembershipSchema);

  for (const email of ['admin@lhu.edu.vn', 'teacher@lhu.edu.vn', 'student@lhu.edu.vn']) {
    const user = await userRepo.findOne({ where: { email } });
    if (!user) throw new Error(`Missing seeded user: ${email}`);
    const valid = await verifyPassword('Admin@123456', user.password_hash);
    if (!valid) throw new Error(`Password verification failed for ${email}`);
    const role = await roleRepo.findOne({ where: { user_id: user.id } });
    const profile = await profileRepo.findOne({ where: { id: user.id } });
    console.log(
      `AUTH_OK: ${email} | role=${role?.role} | name=${profile?.full_name} | code=${profile?.student_code ?? '-'}`,
    );
  }

  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  const token = await new SignJWT({ email: 'admin@lhu.edu.vn', role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('00000000-0000-0000-0000-000000000001')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
  const { payload } = await jwtVerify(token, secret);
  if (payload.role !== 'admin') throw new Error('JWT verify mismatch');
  console.log('JWT_OK: HS256 sign/verify passed');

  const [subjects, classes, memberships] = await Promise.all([
    subjectRepo.count(),
    classRepo.count(),
    membershipRepo.count(),
  ]);
  console.log(`SEED_DATA_OK: subjects=${subjects}, classes=${classes}, memberships=${memberships}`);

  await ds.destroy();
  console.log('SMOKE_TEST_PASSED');
}

main().catch((err) => {
  console.error('SMOKE_TEST_FAILED:', err);
  process.exit(1);
});
