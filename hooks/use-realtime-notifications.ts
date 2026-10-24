'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type NotificationItem = {
  id: string;
  user_id?: string;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
  created_at: string;
  read_at: string | null;
};

export interface UseRealtimeNotificationsOptions {
  /**
   * User ID của người dùng đang đăng nhập để lọc thông báo Realtime.
   */
  userId?: string | null;

  /**
   * Danh sách thông báo khởi tạo từ Server Component (nếu có).
   */
  initialNotifications?: NotificationItem[];

  /**
   * Tên channel Realtime tùy biến. Mặc định: 'realtime:notifications:{userId}'
   */
  channelName?: string;

  /**
   * Callback được kích hoạt mỗi khi có thông báo mới INSERT vào CSDL.
   */
  onNewNotification?: (notification: NotificationItem) => void;

  /**
   * Thời gian hiển thị Toast popup tính bằng mili-giây (Mặc định: 5000ms = 5 giây).
   */
  toastDurationMs?: number;
}

export interface UseRealtimeNotificationsReturn {
  /**
   * Danh sách toàn bộ thông báo (sắp xếp mới nhất lên đầu).
   */
  notifications: NotificationItem[];

  /**
   * Số lượng thông báo chưa đọc (để hiển thị badge).
   */
  unreadCount: number;

  /**
   * Bản ghi thông báo mới nhất vừa nhận (dùng để render Toast notification nổi).
   */
  toastNotification: NotificationItem | null;

  /**
   * Trạng thái đang tải danh sách thông báo.
   */
  isLoading: boolean;

  /**
   * Đánh dấu một thông báo cụ thể là đã đọc.
   */
  markAsRead: (id: string) => Promise<void>;

  /**
   * Đánh dấu toàn bộ thông báo là đã đọc.
   */
  markAllAsRead: () => Promise<void>;

  /**
   * Tắt Toast notification nổi tức thì.
   */
  dismissToast: () => void;

  /**
   * Làm mới danh sách thông báo từ CSDL.
   */
  refreshNotifications: () => Promise<void>;
}

/**
 * Custom Hook kết nối Supabase Realtime Channels để nhận thông báo tức thời
 * theo thời gian thực mà không cần người dùng tải lại trang (F5).
 */
export function useRealtimeNotifications({
  userId,
  initialNotifications = [],
  channelName,
  onNewNotification,
  toastDurationMs = 5000,
}: UseRealtimeNotificationsOptions): UseRealtimeNotificationsReturn {
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState<number>(() => {
    return initialNotifications.filter((n) => !n.read_at).length;
  });
  const [toastNotification, setToastNotification] = useState<NotificationItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const onNewNotificationRef = useRef(onNewNotification);
  useEffect(() => {
    onNewNotificationRef.current = onNewNotification;
  }, [onNewNotification]);

  // Cập nhật khi initialNotifications thay đổi từ SSR props
  useEffect(() => {
    if (initialNotifications.length > 0) {
      setNotifications(initialNotifications);
      setUnreadCount(initialNotifications.filter((n) => !n.read_at).length);
    }
  }, [initialNotifications]);

  // Tự động ẩn Toast notification sau khoảng thời gian toastDurationMs
  useEffect(() => {
    if (!toastNotification) return;

    const timer = setTimeout(() => {
      setToastNotification(null);
    }, toastDurationMs);

    return () => clearTimeout(timer);
  }, [toastNotification, toastDurationMs]);

  // Fetch danh sách thông báo ban đầu nếu chưa có
  const refreshNotifications = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from('notifications')
        .select('id, user_id, title, message, data, created_at, read_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        const items = data as NotificationItem[];
        setNotifications(items);
        setUnreadCount(items.filter((n) => !n.read_at).length);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Thiết lập Supabase Realtime Channel
  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    const effectiveChannelName = channelName || `realtime:notifications:${userId}`;

    // Khởi tạo channel và lắng nghe sự kiện INSERT trên bảng 'notifications'
    const channel = supabase
      .channel(effectiveChannelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as NotificationItem;
          if (!newNotif || !newNotif.id) return;

          // 1. Thêm bản ghi mới vào đầu danh sách (ngăn trùng lặp ID)
          setNotifications((prev) => {
            if (prev.some((item) => item.id === newNotif.id)) return prev;
            return [newNotif, ...prev];
          });

          // 2. Tự động tăng bộ đếm thông báo chưa đọc (badge)
          setUnreadCount((prev) => prev + 1);

          // 3. Kích hoạt Toast notification nổi ở góc màn hình
          setToastNotification(newNotif);

          // 4. Kích hoạt callback tùy chọn của ứng dụng
          if (onNewNotificationRef.current) {
            try {
              onNewNotificationRef.current(newNotif);
            } catch (err) {
              console.error('Error in onNewNotification callback:', err);
            }
          }
        }
      )
      .subscribe((status, error) => {
        if (error) {
          console.error(`[Realtime Notifications] Channel error (${status}):`, error);
        }
      });

    // Clean up (unsubscribe) channel khi component unmount để tránh rò rỉ bộ nhớ
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, channelName]);

  // Đánh dấu một thông báo là đã đọc
  const markAsRead = useCallback(async (id: string) => {
    // Cập nhật lạc quan (Optimistic update)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      const supabase = createClient();
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, []);

  // Đánh dấu toàn bộ thông báo là đã đọc
  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    const now = new Date().toISOString();
    // Cập nhật lạc quan (Optimistic update)
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || now })));
    setUnreadCount(0);

    try {
      const supabase = createClient();
      await supabase
        .from('notifications')
        .update({ read_at: now })
        .eq('user_id', userId)
        .is('read_at', null);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  }, [userId]);

  const dismissToast = useCallback(() => {
    setToastNotification(null);
  }, []);

  return {
    notifications,
    unreadCount,
    toastNotification,
    isLoading,
    markAsRead,
    markAllAsRead,
    dismissToast,
    refreshNotifications,
  };
}
