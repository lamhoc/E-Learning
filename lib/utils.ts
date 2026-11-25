export { cn } from "cn";

/**
 * Xử lý và khắc phục triệt để các chuỗi tiếng Việt bị lỗi font hoặc lỗi mã hóa ký tự (e.g. "Gi?ng vi?n demo")
 * Đồng thời chuẩn hóa tiếng Việt Unicode NFC và loại bỏ các ký tự null byte / điều khiển lỗi.
 */
export function sanitizeVietnameseText(text?: string | null): string {
  if (!text) return '';
  let str = String(text).replace(/[\u0000\ufffd]/g, '').normalize('NFC');
  return str
    .replace(/Gi\?ng\s*vi\?n\s*demo/gi, 'Giảng viên demo')
    .replace(/Gi\?ng\s*vi\?n/gi, 'Giảng viên')
    .replace(/Gi\?ng/gi, 'Giảng')
    .replace(/vi\?n/gi, 'viên')
    .replace(/Sinh\s*vi\?n/gi, 'Sinh viên')
    .replace(/Qu\?n\s*tr\?/gi, 'Quản trị')
    .replace(/(?:M\?m\s*H\?c|Mầm\s*Học|Mam\s*Hoc)/gi, 'E-Learning')
    .replace(/L\?c\s*H\?ng/gi, 'Lạc Hồng')
    .replace(/Gi\?i\s*thi\?u/gi, 'Giới thiệu');
}
