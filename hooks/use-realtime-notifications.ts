'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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
  userId?: string | null;
  initialNotifications?: NotificationItem[];
  channelName?: string;
  onNewNotification?: (notification: NotificationItem) => void;
  toastDurationMs?: number;
}

export interface UseRealtimeNotificationsReturn {
  notifications: NotificationItem[];
  unreadCount: number;
  toastNotification: NotificationItem | null;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismissToast: () => void;
  refreshNotifications: () => Promise<void>;
}

const POLL_INTERVAL_MS = 15000;

/**
 * Custom Hook nạp và cập nhật thông báo định kỳ qua API nội bộ (/api/notifications)
 * chạy trên SQL Server 2019 + TypeORM.
 */
export function useRealtimeNotifications({
  userId,
  initialNotifications = [],
  onNewNotification,
  toastDurationMs = 5000,
}: UseRealtimeNotificationsOptions): UseRealtimeNotificationsReturn {
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState<number>(() =>
    initialNotifications.filter((n) => !n.read_at).length,
  );
  const [toastNotification, setToastNotification] = useState<NotificationItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const onNewNotificationRef = useRef(onNewNotification);
  const seenIdsRef = useRef<Set<string>>(new Set(initialNotifications.map((n) => n.id)));
  const initializedRef = useRef<boolean>(initialNotifications.length > 0);

  useEffect(() => {
    onNewNotificationRef.current = onNewNotification;
  }, [onNewNotification]);

  useEffect(() => {
    if (initialNotifications.length > 0) {
      setNotifications(initialNotifications);
      setUnreadCount(initialNotifications.filter((n) => !n.read_at).length);
      for (const n of initialNotifications) {
        seenIdsRef.current.add(n.id);
      }
      initializedRef.current = true;
    }
  }, [initialNotifications]);

  useEffect(() => {
    if (!toastNotification) return;
    const timer = setTimeout(() => {
      setToastNotification(null);
    }, toastDurationMs);
    return () => clearTimeout(timer);
  }, [toastNotification, toastDurationMs]);

  const fetchNotifications = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const res = await fetch('/api/notifications', { cache: 'no-store' });
      if (!res.ok) return;
      const json = (await res.json()) as { notifications?: NotificationItem[] };
      const items = Array.isArray(json.notifications) ? json.notifications : [];

      if (initializedRef.current) {
        const newlyArrived = items.filter((item) => !seenIdsRef.current.has(item.id));
        if (newlyArrived.length > 0) {
          const newest = newlyArrived[0];
          setToastNotification(newest);
          if (onNewNotificationRef.current) {
            try {
              onNewNotificationRef.current(newest);
            } catch (err) {
              console.error('Error in onNewNotification callback:', err);
            }
          }
        }
      }

      for (const item of items) {
        seenIdsRef.current.add(item.id);
      }
      initializedRef.current = true;

      setNotifications(items);
      setUnreadCount(items.filter((n) => !n.read_at).length);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    await fetchNotifications(false);
  }, [fetchNotifications]);

  // Nạp lần đầu & tự động polling nhẹ khi tab đang mở
  useEffect(() => {
    if (userId === null) return;

    void fetchNotifications(true);
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void fetchNotifications(true);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [userId, fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    const nowIso = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: n.read_at || nowIso } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const nowIso = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || nowIso })));
    setUnreadCount(0);

    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  }, []);

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
