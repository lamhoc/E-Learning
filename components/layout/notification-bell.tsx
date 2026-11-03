'use client';

import { useState } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  Sparkles,
  X,
} from 'lucide-react';
import {
  type NotificationItem,
  useRealtimeNotifications,
} from '@/hooks/use-realtime-notifications';
import { Badge } from '@/components/ui/badge';

export interface NotificationBellProps {
  userId?: string | null;
  initialNotifications?: NotificationItem[];
  className?: string;
}

function formatRelativeTime(dateString: string) {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Vừa xong';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function NotificationBell({
  userId,
  initialNotifications = [],
  className = '',
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);

  const {
    notifications,
    unreadCount,
    toastNotification,
    markAsRead,
    markAllAsRead,
    dismissToast,
  } = useRealtimeNotifications({
    userId,
    initialNotifications,
    toastDurationMs: 6000,
  });

  return (
    <div className={`relative ${className}`}>
      {/* Nút Chuông Thông Báo */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-[#154C99]/40 hover:bg-slate-50 hover:text-[#154C99] dark:border-slate-800 dark:bg-[#111C2D] dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#154C99] dark:focus:ring-[#3B82F6]"
        aria-label="Thông báo hệ thống"
        aria-expanded={isOpen}
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-[#111C2D] animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu Danh Sách Thông Báo */}
      {isOpen && (
        <>
          {/* Backdrop để đóng khi click ngoài */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div className="absolute right-0 top-full z-50 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-[#111C2D] animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Header Dropdown */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">Thông báo</span>
                {unreadCount > 0 && (
                  <Badge className="border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300 text-[11px] font-semibold">
                    {unreadCount} mới
                  </Badge>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => void markAllAsRead()}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#154C99] hover:text-[#0A275C] dark:text-[#3B82F6] dark:hover:text-blue-400 transition hover:underline"
                >
                  <CheckCheck className="size-3.5" /> Đánh dấu đã đọc
                </button>
              )}
            </div>

            {/* Danh sách thông báo */}
            <div className="mt-3 max-h-80 overflow-y-auto space-y-2 pr-1">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                  <Bell className="mx-auto size-8 text-slate-300 dark:text-slate-600 stroke-[1.5]" />
                  <p className="mt-2 font-medium">Chưa có thông báo nào</p>
                </div>
              ) : (
                notifications.map((item) => {
                  const isUnread = !item.read_at;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (isUnread) void markAsRead(item.id);
                      }}
                      className={`group relative rounded-xl p-3 text-xs transition cursor-pointer ${
                        isUnread
                          ? 'border border-blue-100 bg-blue-50/50 hover:bg-blue-50/80 dark:border-blue-900/40 dark:bg-blue-950/30 dark:hover:bg-blue-950/50'
                          : 'border border-transparent bg-slate-50/60 hover:bg-slate-100/70 dark:bg-slate-800/40 dark:hover:bg-slate-800/80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {isUnread && (
                              <span className="size-1.5 rounded-full bg-[#154C99] dark:bg-[#3B82F6] shrink-0" />
                            )}
                            <h4 className="font-bold text-slate-900 dark:text-slate-100 truncate">
                              {item.title}
                            </h4>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                            {item.message}
                          </p>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 pt-0.5">
                            <Clock className="size-3" />
                            <span>{formatRelativeTime(item.created_at)}</span>
                          </div>
                        </div>

                        {isUnread && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void markAsRead(item.id);
                            }}
                            title="Đánh dấu đã đọc"
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-[#154C99] dark:hover:text-blue-400 transition"
                          >
                            <Check className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* Realtime Floating Toast Notification */}
      {toastNotification && (
        <div className="fixed top-5 right-5 z-50 w-80 sm:w-96 rounded-2xl border border-blue-200 bg-white/95 p-4 shadow-2xl dark:border-blue-900/50 dark:bg-[#111C2D]/95 backdrop-blur-md animate-in slide-in-from-top-4 duration-300 ring-1 ring-blue-500/20">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#154C99] dark:bg-blue-950 dark:text-blue-300 shadow-2xs">
              <Sparkles className="size-4.5 text-[#FACC15]" />
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#154C99] dark:text-blue-400">
                  Thông báo mới
                </span>
                <span className="text-[10px] text-slate-400">Vừa xong</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {toastNotification.title}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                {toastNotification.message}
              </p>
            </div>
            <button
              type="button"
              onClick={dismissToast}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition"
              aria-label="Đóng thông báo"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
