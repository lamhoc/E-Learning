import type { ValueTransformer } from 'typeorm';

/**
 * Chuẩn hóa UNIQUEIDENTIFIER trả về từ SQL Server (tedious thường trả UPPERCASE)
 * sang chữ thường để khớp tuyệt đối với Map/Set/so sánh chuỗi trong TypeScript.
 */
export const uuidTransformer: ValueTransformer = {
  to(value: string | null | undefined): string | null | undefined {
    if (value == null) return value;
    return value.trim().toLowerCase();
  },
  from(value: string | null | undefined): string | null {
    if (value == null) return null;
    return String(value).trim().toLowerCase();
  },
};

/**
 * Chuyển đổi cột NVARCHAR(MAX) lưu JSON trong SQL Server sang object/array JS và ngược lại.
 */
export function createJsonTransformer<T>(fallback: T): ValueTransformer {
  return {
    to(value: T | string | null | undefined): string | null {
      if (value === null || value === undefined) {
        return fallback === null ? null : JSON.stringify(fallback);
      }
      if (typeof value === 'string') return value;
      return JSON.stringify(value);
    },
    from(value: string | T | null | undefined): T {
      if (value === null || value === undefined) return fallback;
      if (typeof value !== 'string') return value;
      try {
        return JSON.parse(value) as T;
      } catch {
        return fallback;
      }
    },
  };
}

/**
 * Chuyển đổi cột DECIMAL/NUMERIC từ SQL Server sang number chuẩn JS.
 */
export const decimalTransformer: ValueTransformer = {
  to(value: number | string | null | undefined): number | null | undefined {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  },
  from(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  },
};

/**
 * Chuyển đổi cột BIGINT từ SQL Server sang number.
 */
export const bigintTransformer: ValueTransformer = {
  to(value: number | string | null | undefined): number | null | undefined {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  },
  from(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  },
};

/**
 * Chuyển đổi DATETIMEOFFSET sang ISO string đồng nhất cho Server Components & Client Props.
 */
export const isoDateTransformer: ValueTransformer = {
  to(value: Date | string | null | undefined): Date | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (value instanceof Date) return value;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  },
  from(value: Date | string | null | undefined): string | null {
    if (value === null || value === undefined) return null;
    if (value instanceof Date) return value.toISOString();
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : d.toISOString();
  },
};
