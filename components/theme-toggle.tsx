'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={`grid size-9 place-items-center rounded-xl border border-slate-200 bg-white/80 text-slate-400 opacity-60 dark:border-slate-800 dark:bg-slate-900/80 ${className}`}
        aria-hidden="true"
      >
        <Sun className="size-4" />
      </div>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={`relative grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-all hover:border-[#154C99]/30 hover:bg-slate-50 hover:text-[#154C99] dark:border-slate-800 dark:bg-[#111C2D] dark:text-amber-400 dark:hover:border-amber-400/30 dark:hover:bg-slate-800 dark:hover:text-amber-300 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#154C99] dark:focus:ring-amber-400 cursor-pointer ${className}`}
      title={isDark ? 'Chuyển sang chế độ Sáng (Light)' : 'Chuyển sang chế độ Tối (Dark)'}
      aria-label={isDark ? 'Chuyển sang chế độ Sáng' : 'Chuyển sang chế độ Tối'}
    >
      {isDark ? (
        <Sun className="size-4.5 transition-transform duration-200 rotate-0 scale-100 text-amber-400 hover:rotate-45" />
      ) : (
        <Moon className="size-4.5 transition-transform duration-200 rotate-0 scale-100 text-[#154C99] hover:-rotate-12" />
      )}
    </button>
  );
}

