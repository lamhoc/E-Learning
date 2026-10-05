'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type { SubmissionPoint } from '@/lib/teacher-dashboard';

const chartConfig = {
  submissions: {
    label: 'Bài nộp',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig;

export function SubmissionChart({ data }: { data: SubmissionPoint[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-[250px] w-full aspect-auto">
      <AreaChart accessibilityLayer data={data} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="submissionFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-submissions)" stopOpacity={0.24} />
            <stop offset="95%" stopColor="var(--color-submissions)" stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 5" />
        <XAxis
          dataKey="day"
          axisLine={false}
          tickLine={false}
          tickMargin={10}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
          tickMargin={8}
          tick={{ fontSize: 11 }}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
        <Area
          dataKey="submissions"
          type="monotone"
          stroke="var(--color-submissions)"
          strokeWidth={2.5}
          fill="url(#submissionFill)"
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ChartContainer>
  );
}
