import { DataSource, type EntitySchema, type ObjectLiteral, type Repository } from 'typeorm';
import { ALL_ENTITY_SCHEMAS } from './entities';

export function getSqlServerConfig() {
  const host = process.env.DB_HOST?.trim() || '127.0.0.1';
  const port = Number(process.env.DB_PORT?.trim() || '1433');
  const username = process.env.DB_USER?.trim() || 'sa';
  const password = process.env.DB_PASSWORD ?? '';
  const database = process.env.DB_NAME?.trim() || 'AutoBankELearning';
  const encrypt = process.env.DB_ENCRYPT === 'true';
  const trustServerCertificate = process.env.DB_TRUST_CERT !== 'false';

  return {
    host,
    port: Number.isFinite(port) ? port : 1433,
    username,
    password,
    database,
    encrypt,
    trustServerCertificate,
  };
}

declare global {
  var __autobankTypeOrmDataSource: DataSource | undefined;
  var __autobankTypeOrmInitPromise: Promise<DataSource> | undefined;
}

function createDataSource(): DataSource {
  const cfg = getSqlServerConfig();

  return new DataSource({
    type: 'mssql',
    host: cfg.host,
    port: cfg.port,
    username: cfg.username,
    password: cfg.password,
    database: cfg.database,
    entities: ALL_ENTITY_SCHEMAS,
    synchronize: false,
    logging: process.env.DB_LOGGING === 'true',
    options: {
      encrypt: cfg.encrypt,
      trustServerCertificate: cfg.trustServerCertificate,
      enableArithAbort: true,
    },
    pool: {
      max: 20,
      min: 2,
      idleTimeoutMillis: 30000,
    },
    connectionTimeout: 15000,
    requestTimeout: 30000,
  });
}

/**
 * Lấy singleton TypeORM DataSource (an toàn với Next.js HMR và concurrent requests).
 */
export async function getDataSource(): Promise<DataSource> {
  if (globalThis.__autobankTypeOrmDataSource?.isInitialized) {
    return globalThis.__autobankTypeOrmDataSource;
  }

  if (!globalThis.__autobankTypeOrmInitPromise) {
    const ds = globalThis.__autobankTypeOrmDataSource ?? createDataSource();
    globalThis.__autobankTypeOrmDataSource = ds;

    globalThis.__autobankTypeOrmInitPromise = ds
      .initialize()
      .then((initialized) => {
        return initialized;
      })
      .catch((err) => {
        globalThis.__autobankTypeOrmInitPromise = undefined;
        globalThis.__autobankTypeOrmDataSource = undefined;
        throw err;
      });
  }

  return globalThis.__autobankTypeOrmInitPromise;
}

/**
 * Shortcut lấy TypeORM Repository cho một EntitySchema.
 */
export async function getRepo<T extends ObjectLiteral>(
  schema: EntitySchema<T>,
): Promise<Repository<T>> {
  const ds = await getDataSource();
  return ds.getRepository(schema);
}

/**
 * Sinh mã sinh viên mới duy nhất (SV000001...) từ SEQUENCE dbo.student_code_seq.
 */
export async function generateNextStudentCode(ds?: DataSource): Promise<string> {
  const dataSource = ds ?? (await getDataSource());
  const rows = (await dataSource.query(
    'SELECT NEXT VALUE FOR dbo.student_code_seq AS next_val',
  )) as Array<{ next_val: string | number }>;
  const num = Number(rows?.[0]?.next_val ?? 1);
  return num < 1000000 ? `SV${String(num).padStart(6, '0')}` : `SV${num}`;
}
