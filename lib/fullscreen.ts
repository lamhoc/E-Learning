/**
 * Tiện ích quản lý chế độ Toàn màn hình (Fullscreen API) tương thích mọi trình duyệt
 */

type ExtendedDocument = Document & {
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
  mozCancelFullScreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
};

type ExtendedHTMLElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
};

/**
 * Kiểm tra xem trình duyệt hiện có đang ở chế độ toàn màn hình hay không
 */
export function isFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as ExtendedDocument;
  return Boolean(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement
  );
}

/**
 * Kích hoạt chế độ Toàn màn hình an toàn
 */
export async function enterFullscreenSafe(): Promise<boolean> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  try {
    if (!isFullscreen()) {
      const docEl = document.documentElement as ExtendedHTMLElement;
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen();
      } else if (docEl.mozRequestFullScreen) {
        await docEl.mozRequestFullScreen();
      } else if (docEl.msRequestFullscreen) {
        await docEl.msRequestFullscreen();
      }
    }
    return true;
  } catch (err) {
    console.warn('[Fullscreen] Không thể kích hoạt toàn màn hình:', err);
    return false;
  }
}

/**
 * Thoát khỏi chế độ Toàn màn hình an toàn
 */
export async function exitFullscreenSafe(): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  try {
    const doc = document as ExtendedDocument;
    if (isFullscreen()) {
      if (doc.exitFullscreen) {
        await doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        await doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        await doc.msExitFullscreen();
      }
    }
  } catch (err) {
    console.warn('[Fullscreen] Lỗi khi thoát toàn màn hình:', err);
  }
}
