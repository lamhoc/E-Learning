'use client';

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
import type { ExamScoreDistributionItem } from '@/lib/teacher-exam-analytics';

export function ExamScoreChart({
  distribution,
  totalGraded,
}: {
  distribution: ExamScoreDistributionItem[];
  totalGraded: number;
}) {
  if (totalGraded === 0) {
    return (
      <div className="flex h-72 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-500">
        <p className="font-semibold text-slate-700">Chưa có bài thi nào được công bố điểm</p>
        <p className="mt-1 text-slate-400">
          Khi giảng viên chấm xong và công bố kết quả (released), biểu đồ phổ điểm sẽ tự động hiển thị tại đây.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={distribution}
            margin={{ top: 15, right: 15, left: -10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="range"
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              tick={{ fill: '#475569', fontSize: 12, fontWeight: 500 }}
              tickFormatter={(val) => `${val} đ`}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#64748b', fontSize: 11 }}
            />
            <Tooltip
              cursor={{ fill: 'rgba(23, 55, 46, 0.05)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const data = payload[0].payload as ExamScoreDistributionItem;
                return (
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-md text-xs">
                    <p className="font-bold text-slate-900">{data.label}</p>
                    <div className="mt-1.5 space-y-1">
                      <p className="flex items-center justify-between gap-4 text-slate-600">
                        <span>Số sinh viên:</span>
                        <strong className="text-slate-900 font-bold">{data.count}</strong>
                      </p>
                      <p className="flex items-center justify-between gap-4 text-slate-600">
                        <span>Tỉ lệ:</span>
                        <strong className="text-emerald-700 font-bold">{data.percentage}%</strong>
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
            className="flex flex-col rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 text-center transition hover:bg-white hover:shadow-2xs"
          >
            <div className="flex items-center justify-center gap-1.5">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: item.fillColor }}
              />
              <span className="text-xs font-semibold text-slate-700">{item.range} đ</span>
            </div>
            <p className="mt-1 text-base font-bold text-slate-900">{item.count}</p>
            <p className="text-[11px] text-slate-500">{item.percentage}% thí sinh</p>
          </div>
        ))}
      </div>
    </div>
  );
}

