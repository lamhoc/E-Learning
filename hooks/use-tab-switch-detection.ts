'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export const DEFAULT_MAX_TAB_SWITCHES = 3;

export type ProctorViolationReason = 'tab_switch' | 'fullscreen_exit' | 'camera_blocked';

export interface UseTabSwitchDetectionOptions {
  /**
   * Số lần vi phạm tối đa được phép trước khi bị tự động nộp bài.
   * Mặc định là 3 lần.
   */
  maxViolations?: number;

  /**
   * Callback được gọi ngay khi số lần vi phạm vượt ngưỡng cho phép (>= maxViolations).
   */
  onAutoSubmit: () => void | Promise<void>;

  /**
   * Callback ghi log vi phạm vào CSDL (Server Action).
   */
  onViolation?: (violationCount: number, reason: ProctorViolationReason) => void | Promise<void>;

  /**
   * Trạng thái kích hoạt giám thị. Nếu false, hook sẽ không đếm.
   */
  enabled?: boolean;

  /**
   * Số lần vi phạm khởi tạo (nếu sinh viên F5 tải lại trang).
   */
  initialCount?: number;

  /**
   * Khoảng thời gian chống đúp sự kiện (debounce window) tính bằng mili-giây.
   */
  debounceMs?: number;

  /**
   * Bật giám sát chế độ toàn màn hình (Fullscreen Lockdown).
   */
  enableFullscreenLockdown?: boolean;

  /**
   * Cờ đánh dấu thí sinh đã bấm vào phòng thi và kích hoạt toàn màn hình.
   */
  hasStartedFullscreen?: boolean;
}

export interface UseTabSwitchDetectionReturn {
  /**
   * Tổng số lần vi phạm (rời tab + thoát toàn màn hình).
   */
  tabSwitchCount: number;

  /**
   * Lý do vi phạm gần nhất ('tab_switch' | 'fullscreen_exit' | 'camera_blocked').
   */
  lastViolationReason: ProctorViolationReason;

  /**
   * Trạng thái mở của Alert Dialog cảnh báo vi phạm.
   */
  isWarningOpen: boolean;

  /**
   * Cờ đánh dấu bài thi đã bị đình chỉ do vượt quá số lần vi phạm.
   */
  isTerminated: boolean;

  /**
   * Số lần vi phạm còn lại trước khi bị nộp bài bắt buộc.
   */
  remainingChances: number;

  /**
   * Số lần vi phạm tối đa cho phép.
   */
  maxViolations: number;

  /**
   * Đóng hộp thoại cảnh báo và tiếp tục làm bài (có thể tự động gọi lại Fullscreen).
   */
  dismissWarning: () => void;

  /**
   * Yêu cầu trình duyệt bật lại chế độ toàn màn hình.
   */
  requestFullscreen: () => Promise<boolean>;

  /**
   * Reset lại số lần vi phạm nếu cần.
   */
  resetViolations: () => void;

  /**
   * Ghi nhận thủ công một vi phạm ngoài (ví dụ từ Camera Proctor).
   */
  triggerManualViolation: (reason: ProctorViolationReason) => void;
}

/**
 * React Hook giám sát toàn diện hành vi phòng thi trực tuyến:
 * - Rời tab hoặc mất focus trình duyệt
 * - Thoát khỏi chế độ toàn màn hình (Fullscreen Lockdown)
 * - Tiếp nhận cảnh báo camera AI bị che
 */
export function useTabSwitchDetection({
  maxViolations = DEFAULT_MAX_TAB_SWITCHES,
  onAutoSubmit,
  onViolation,
  enabled = true,
  initialCount = 0,
  debounceMs = 1500,
  enableFullscreenLockdown = true,
  hasStartedFullscreen = false,
}: UseTabSwitchDetectionOptions): UseTabSwitchDetectionReturn {
  const [tabSwitchCount, setTabSwitchCount] = useState<number>(initialCount);
  const [lastViolationReason, setLastViolationReason] = useState<ProctorViolationReason>('tab_switch');
  const [isWarningOpen, setIsWarningOpen] = useState<boolean>(false);
  const [isTerminated, setIsTerminated] = useState<boolean>(false);

  const lastViolationTimeRef = useRef<number>(0);
  const isTerminatedRef = useRef<boolean>(false);
  const tabSwitchCountRef = useRef<number>(initialCount);
  const onAutoSubmitRef = useRef(onAutoSubmit);
  const onViolationRef = useRef(onViolation);
  const hasStartedFullscreenRef = useRef<boolean>(hasStartedFullscreen);

  useEffect(() => {
    onAutoSubmitRef.current = onAutoSubmit;
  }, [onAutoSubmit]);

  useEffect(() => {
    onViolationRef.current = onViolation;
  }, [onViolation]);

  useEffect(() => {
    tabSwitchCountRef.current = tabSwitchCount;
  }, [tabSwitchCount]);

  useEffect(() => {
    hasStartedFullscreenRef.current = hasStartedFullscreen;
  }, [hasStartedFullscreen]);

  const handleViolation = useCallback(
    (reason: ProctorViolationReason = 'tab_switch') => {
      if (!enabled || isTerminatedRef.current) return;

      const now = Date.now();
      if (now - lastViolationTimeRef.current < debounceMs) {
        return;
      }
      lastViolationTimeRef.current = now;

      const newCount = tabSwitchCountRef.current + 1;
      tabSwitchCountRef.current = newCount;
      setTabSwitchCount(newCount);
      setLastViolationReason(reason);
      setIsWarningOpen(true);

      // Ghi log vào CSDL qua Server Action
      if (onViolationRef.current) {
        try {
          void onViolationRef.current(newCount, reason);
        } catch (err) {
          console.error('Failed to log exam violation:', err);
        }
      }

      // Nếu chạm hoặc vượt ngưỡng 3 lần vi phạm
      if (newCount >= maxViolations) {
        isTerminatedRef.current = true;
        setIsTerminated(true);
        void onAutoSubmitRef.current();
      }
    },
    [debounceMs, enabled, maxViolations]
  );

  // 1. Lắng nghe tab switch / window blur
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' || document.hidden) {
        handleViolation('tab_switch');
      }
    };

    const handleWindowBlur = () => {
      handleViolation('tab_switch');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [enabled, handleViolation]);

  // 2. Lắng nghe thoát chế độ toàn màn hình (Fullscreen Lockdown)
  useEffect(() => {
    if (!enabled || !enableFullscreenLockdown || typeof window === 'undefined') return;

    const handleFullscreenChange = () => {
      // Chỉ kiểm tra khi thí sinh đã chính thức bấm "Bắt đầu làm bài (Toàn màn hình)"
      if (hasStartedFullscreenRef.current && !document.fullscreenElement) {
        handleViolation('fullscreen_exit');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [enabled, enableFullscreenLockdown, handleViolation]);

  const requestFullscreen = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;
    try {
      if (!document.fullscreenElement) {
        const docEl = document.documentElement as HTMLElement & {
          webkitRequestFullscreen?: () => Promise<void>;
          mozRequestFullScreen?: () => Promise<void>;
          msRequestFullscreen?: () => Promise<void>;
        };

        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        } else if (docEl.mozRequestFullScreen) {
          await docEl.mozRequestFullScreen();
        }
      }
      return true;
    } catch (err) {
      console.warn('Cannot request fullscreen mode:', err);
      return false;
    }
  }, []);

  const dismissWarning = useCallback(() => {
    if (isTerminated) return;
    setIsWarningOpen(false);
    // Tự động yêu cầu quay lại toàn màn hình nếu đang bật lockdown
    if (enableFullscreenLockdown) {
      void requestFullscreen();
    }
  }, [enableFullscreenLockdown, isTerminated, requestFullscreen]);

  const resetViolations = useCallback(() => {
    tabSwitchCountRef.current = 0;
    lastViolationTimeRef.current = 0;
    isTerminatedRef.current = false;
    setTabSwitchCount(0);
    setIsWarningOpen(false);
    setIsTerminated(false);
  }, []);

  const remainingChances = Math.max(0, maxViolations - tabSwitchCount);

  return {
    tabSwitchCount,
    lastViolationReason,
    isWarningOpen,
    isTerminated,
    remainingChances,
    maxViolations,
    dismissWarning,
    requestFullscreen,
    resetViolations,
    triggerManualViolation: handleViolation,
  };
}
