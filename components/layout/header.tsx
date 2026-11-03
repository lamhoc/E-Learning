'use client';

import React from 'react';
import Link from 'next/link';
import { NotificationBell } from './notification-bell';
import { ThemeToggle } from '@/components/theme-toggle';
import { BrandLogo } from '@/components/ui/brand-logo';
import type { NotificationItem } from '@/hooks/use-realtime-notifications';

export interface HeaderProps {
  userId?: string | null;
  userName?: string | null;
  userRole?: 'student' | 'teacher' | 'admin' | null;
  initialNotifications?: NotificationItem[];
  title?: string;
  showBrandOnMobile?: boolean;
  children?: React.ReactNode;
}

export function Header({
  userId,
  userName = 'Người dùng',
  userRole = 'student',
  initialNotifications = [],
  title,
  showBrandOnMobile = true,
  children,
}: HeaderProps) {
  const initials = (userName || 'ND')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase())
    .join('');

  const today = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  const getRoleBadgeLabel = () => {
    switch (userRole) {
      case 'admin':
        return 'Quản trị viên';
      case 'teacher':
        return 'Giảng viên';
      default:
        return 'Sinh viên';
    }
  };

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/95 px-5 py-3 backdrop-blur dark:bg-[#111C2D]/95 sm:px-8 lg:px-10 transition-colors duration-200">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
        {/* Left: Mobile Brand / Page Title */}
        <div className="flex items-center gap-3">
          {showBrandOnMobile && (
            <div className="lg:hidden">
              <BrandLogo href="/" size="sm" variant="framed" />
            </div>
          )}

          {title && (
            <h1 className="text-sm font-bold text-foreground sm:text-base hidden sm:block">
              {title}
            </h1>
          )}

          <p className="hidden text-xs font-medium capitalize text-muted-foreground md:block">
            {today}
          </p>
        </div>

        {/* Center: Extra Navigation or Children */}
        {children && <div className="flex items-center gap-2">{children}</div>}

        {/* Right: Actions, Realtime Notification Bell, ThemeToggle & User Profile */}
        <div className="ml-auto flex items-center gap-3">
          {/* Nút chuyển đổi Sáng / Tối */}
          <ThemeToggle />

          {/* Realtime Notification Bell */}
          <NotificationBell
            userId={userId}
            initialNotifications={initialNotifications}
          />

          {/* User Profile Avatar */}
          <div className="flex items-center gap-2.5 pl-1 border-l border-border">
            <span
              className="grid size-9 place-items-center rounded-full bg-[#FACC15] text-xs font-bold text-[#0A275C] shadow-2xs"
              aria-label={`Tài khoản ${userName}`}
              title={`${userName} (${getRoleBadgeLabel()})`}
            >
              {initials || 'ND'}
            </span>
            <div className="hidden text-left xl:block">
              <span className="block truncate text-xs font-bold text-foreground max-w-[140px]">
                {userName}
              </span>
              <span className="block text-[10px] text-muted-foreground">
                {getRoleBadgeLabel()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
