'use client';

import { useState } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  ExternalLink,
  Info,
  Sparkles,
  X,
} from 'lucide-react';
import {
  type NotificationItem,
  useRealtimeNotifications,
} from '@/hooks/use-realtime-notifications';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
        className="relative grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
        aria-label="Thông báo hệ thống"
        aria-expanded={isOpen}
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-white animate-pulse">
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

          <div className="absolute right-0 top-full z-50 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Header Dropdown */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">Thông báo</span>
                {unreadCount > 0 && (
                  <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800 text-[11px] font-semibold">
                    {unreadCount} mới
                  </Badge>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => void markAllAsRead()}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 transition hover:underline"
                >
                  <CheckCheck className="size-3.5" /> Đánh dấu đã đọc
                </button>
              )}
            </div>

            {/* Danh sách thông báo */}
            <div className="mt-3 max-h-80 overflow-y-auto space-y-2 pr-1">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <Bell className="mx-auto size-8 text-slate-300 stroke-[1.5]" />
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
                          ? 'border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50/80'
                          : 'border border-transparent bg-slate-50/60 hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {isUnread && (
                              <span className="size-1.5 rounded-full bg-emerald-600 shrink-0" />
                            )}
                            <h4 className="font-bold text-slate-900 truncate">
                              {item.title}
                            </h4>
                          </div>
                          <p className="text-slate-600 line-clamp-2 leading-relaxed">
                            {item.message}
                          </p>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 pt-0.5">
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
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-emerald-700 transition"
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

      {/* Realtime Floating Toast Notification (Hiển thị góc màn hình khi có bản ghi INSERT mới) */}
      {toastNotification && (
        <div className="fixed top-5 right-5 z-50 w-80 sm:w-96 rounded-2xl border border-emerald-200 bg-white/95 p-4 shadow-2xl backdrop-blur-md animate-in slide-in-from-top-4 duration-300 ring-1 ring-emerald-500/20">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-800 shadow-2xs">
              <Sparkles className="size-4.5" />
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  Thông báo mới
                </span>
                <span className="text-[10px] text-slate-400">Vừa xong</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 truncate">
                {toastNotification.title}
              </h4>
              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                {toastNotification.message}
              </p>
            </div>
            <button
              type="button"
              onClick={dismissToast}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
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

