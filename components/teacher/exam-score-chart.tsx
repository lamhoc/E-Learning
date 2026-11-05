'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CheckCircle2, Flame, TrendingUp } from 'lucide-react';
import type { ExamScoreDistributionItem } from '@/lib/teacher-exam-analytics';

export function ExamScoreChart({
  distribution,
  totalGraded,
  averageScore,
  medianScore,
  highestScore,
  passRate,
}: {
  distribution: ExamScoreDistributionItem[];
  totalGraded: number;
  averageScore?: number;
  medianScore?: number;
  highestScore?: number;
  passRate?: number;
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === 'dark';

  if (totalGraded === 0) {
    return (
      <div className="flex h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#111C2D]/50 p-6 text-center text-xs text-slate-500 dark:text-slate-400">
        <p className="font-semibold text-slate-700 dark:text-slate-300">Chưa có bài thi nào nộp hoặc công bố kết quả</p>
        <p className="mt-1 text-slate-400 dark:text-slate-500 max-w-md">
          Khi sinh viên làm bài và nộp bài thi, biểu đồ phân phối phổ điểm histogram và các chỉ số đo lường giáo dục sẽ tự động hiển thị tại đây.
        </p>
      </div>
    );
  }

  const gridColor = isDark ? '#1E293B' : '#E2E8F0';
  const axisTextColor = isDark ? '#94A3B8' : '#64748B';

  return (
    <div className="space-y-4">
      {/* Mini Statistical Badges Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-100/60 dark:bg-[#0E1726] px-4 py-2 text-xs">
        <div className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-400">
          <TrendingUp className="size-3.5 text-blue-600 dark:text-blue-400" />
          <span>Điểm trung bình (Mean):</span>
          <strong className="text-slate-900 dark:text-white font-bold">{averageScore?.toFixed(2) ?? '—'} đ</strong>
        </div>

        <div className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-400">
          <span className="size-2 rounded-full bg-indigo-500" />
          <span>Điểm trung vị (Median):</span>
          <strong className="text-slate-900 dark:text-white font-bold">{medianScore?.toFixed(2) ?? '—'} đ</strong>
        </div>

        <div className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-400">
          <Flame className="size-3.5 text-amber-500" />
          <span>Điểm cao nhất (Max):</span>
          <strong className="text-amber-700 dark:text-amber-400 font-bold">{highestScore?.toFixed(2) ?? '—'} đ</strong>
        </div>

        <div className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-400">
          <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Tỷ lệ Đạt (≥ 5.0):</span>
          <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{passRate ?? 0}%</strong>
        </div>
      </div>

      {/* Main Histogram Bar Chart */}
      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={distribution}
            margin={{ top: 15, right: 15, left: -10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
            <XAxis
              dataKey="range"
              tickLine={false}
              axisLine={{ stroke: gridColor }}
              tick={{ fill: axisTextColor, fontSize: 12, fontWeight: 500 }}
              tickFormatter={(val) => `${val} đ`}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fill: axisTextColor, fontSize: 11 }}
            />
            <Tooltip
              cursor={{ fill: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(21, 76, 153, 0.05)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const data = payload[0].payload as ExamScoreDistributionItem;
                return (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2D] text-slate-900 dark:text-slate-100 p-3 shadow-lg text-xs">
                    <p className="font-bold text-slate-900 dark:text-white">{data.label}</p>
                    <div className="mt-1.5 space-y-1">
                      <p className="flex items-center justify-between gap-4 text-slate-600 dark:text-slate-400">
                        <span>Số bài thi:</span>
                        <strong className="text-slate-900 dark:text-white font-bold">{data.count} bài</strong>
                      </p>
                      <p className="flex items-center justify-between gap-4 text-slate-600 dark:text-slate-400">
                        <span>Tỉ lệ phổ điểm:</span>
                        <strong className="text-blue-600 dark:text-blue-400 font-bold">{data.percentage}%</strong>
                      </p>
                    </div>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="count"
              radius={[6, 6, 0, 0]}
              maxBarSize={55}
            >
              {distribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fillColor} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Breakdown Pills */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 pt-2">
        {distribution.map((item) => (
          <div
            key={item.range}
            className="flex flex-col rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-[#111C2D]/70 p-2.5 text-center transition hover:bg-white dark:hover:bg-[#152338] hover:shadow-2xs"
          >
            <div className="flex items-center justify-center gap-1.5">
              <span
                className="size-2.5 rounded-full shadow-2xs"
                style={{ backgroundColor: item.fillColor }}
              />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{item.range} đ</span>
            </div>
            <p className="mt-1 text-base font-bold text-slate-900 dark:text-white tabular-nums">{item.count}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.percentage}% thí sinh</p>
          </div>
        ))}
      </div>
    </div>
  );
}
