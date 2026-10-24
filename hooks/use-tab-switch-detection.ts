'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export const DEFAULT_MAX_TAB_SWITCHES = 3;

export interface UseTabSwitchDetectionOptions {
  /**
   * Số lần chuyển tab tối đa được phép trước khi bị tự động nộp bài.
   * Mặc định là 3 lần.
   */
  maxViolations?: number;

  /**
   * Callback được gọi ngay khi số lần vi phạm vượt ngưỡng cho phép (>= maxViolations).
   */
  onAutoSubmit: () => void | Promise<void>;

  /**
   * Callback tùy chọn để ghi log vi phạm vào CSDL (Server Action).
   */
  onViolation?: (violationCount: number) => void | Promise<void>;

  /**
   * Trạng thái kích hoạt giám thị. Nếu false (vd: khi đã nộp bài xong hoặc đang xem kết quả), hook sẽ không đếm.
   */
  enabled?: boolean;

  /**
   * Số lần vi phạm khởi tạo (nếu sinh viên F5 tải lại trang).
   */
  initialCount?: number;

  /**
   * Khoảng thời gian chống đúp sự kiện (debounce window) tính bằng mili-giây.
   * Ngăn chặn việc cả 'blur' và 'visibilitychange' cùng kích hoạt trong 1 lần chuyển tab.
   */
  debounceMs?: number;
}

export interface UseTabSwitchDetectionReturn {
  /**
   * Số lần sinh viên đã rời khỏi tab bài thi.
   */
  tabSwitchCount: number;

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
   * Đóng hộp thoại cảnh báo để sinh viên tiếp tục làm bài.
   */
  dismissWarning: () => void;

  /**
   * Reset lại số lần vi phạm nếu cần.
   */
  resetViolations: () => void;
}

/**
 * React Hook giám sát hành vi rời khỏi tab (Tab switch / blur) của sinh viên trong phòng thi.
 */
export function useTabSwitchDetection({
  maxViolations = DEFAULT_MAX_TAB_SWITCHES,
  onAutoSubmit,
  onViolation,
  enabled = true,
  initialCount = 0,
  debounceMs = 1500,
}: UseTabSwitchDetectionOptions): UseTabSwitchDetectionReturn {
  const [tabSwitchCount, setTabSwitchCount] = useState<number>(initialCount);
  const [isWarningOpen, setIsWarningOpen] = useState<boolean>(false);
  const [isTerminated, setIsTerminated] = useState<boolean>(false);

  // Refs để lưu trữ các giá trị mới nhất trong event listeners mà không gây re-subscribe liên tục
  const lastViolationTimeRef = useRef<number>(0);
  const isTerminatedRef = useRef<boolean>(false);
  const tabSwitchCountRef = useRef<number>(initialCount);
  const onAutoSubmitRef = useRef(onAutoSubmit);
  const onViolationRef = useRef(onViolation);

  // Đồng bộ refs với props
  useEffect(() => {
    onAutoSubmitRef.current = onAutoSubmit;
  }, [onAutoSubmit]);

  useEffect(() => {
    onViolationRef.current = onViolation;
  }, [onViolation]);

  useEffect(() => {
    tabSwitchCountRef.current = tabSwitchCount;
  }, [tabSwitchCount]);

  const handleViolation = useCallback(() => {
    if (!enabled || isTerminatedRef.current) return;

    const now = Date.now();
    // Chống ghi nhận trùng lặp nếu cả blur và visibilitychange cùng kích hoạt đồng thời
    if (now - lastViolationTimeRef.current < debounceMs) {
      return;
    }
    lastViolationTimeRef.current = now;

    const newCount = tabSwitchCountRef.current + 1;
    tabSwitchCountRef.current = newCount;
    setTabSwitchCount(newCount);
    setIsWarningOpen(true);

    // Ghi log vào cơ sở dữ liệu qua Server Action (nếu được truyền vào)
    if (onViolationRef.current) {
      try {
        void onViolationRef.current(newCount);
      } catch (err) {
        console.error('Failed to log exam violation:', err);
      }
    }

    // Nếu số lần vi phạm chạm hoặc vượt quá ngưỡng cho phép
    if (newCount >= maxViolations) {
      isTerminatedRef.current = true;
      setIsTerminated(true);
      // Kích hoạt nộp bài thi bắt buộc ngay lập tức
      void onAutoSubmitRef.current();
    }
  }, [debounceMs, enabled, maxViolations]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // 1. Lắng nghe sự kiện chuyển đổi trạng thái hiển thị của tab/trang web
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' || document.hidden) {
        handleViolation();
      }
    };

    // 2. Lắng nghe sự kiện cửa sổ trình duyệt mất tiêu điểm (chuyển sang cửa sổ khác)
    const handleWindowBlur = () => {
      handleViolation();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [enabled, handleViolation]);

  const dismissWarning = useCallback(() => {
    if (isTerminated) return;
    setIsWarningOpen(false);
  }, [isTerminated]);

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
    isWarningOpen,
    isTerminated,
    remainingChances,
    maxViolations,
    dismissWarning,
    resetViolations,
  };
}

