export { cn } from "cn";

/**
 * Xử lý và khắc phục triệt để các chuỗi tiếng Việt bị lỗi font hoặc lỗi mã hóa ký tự (e.g. "Gi?ng vi?n demo")
 */
export function sanitizeVietnameseText(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/Gi\?ng\s*vi\?n\s*demo/gi, 'Giảng viên demo')
    .replace(/Gi\?ng\s*vi\?n/gi, 'Giảng viên')
    .replace(/Gi\?ng/gi, 'Giảng')
    .replace(/vi\?n/gi, 'viên')
    .replace(/Sinh\s*vi\?n/gi, 'Sinh viên')
    .replace(/Qu\?n\s*tr\?/gi, 'Quản trị')
    .replace(/M\?m\s*H\?c/gi, 'Mầm Học')
    .replace(/L\?c\s*H\?ng/gi, 'Lạc Hồng')
    .replace(/Gi\?i\s*thi\?u/gi, 'Giới thiệu');
}
