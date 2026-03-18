'use client';

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import type { ScenarioSummary } from '@/lib/api';

const tooltipStyle = {
  background: 'var(--rm-bg-raised)',
  border: '1px solid var(--rm-border)',
  borderRadius: '8px',
  fontSize: '12px',
  color: 'var(--rm-text)',
};

function TrendChart({
  title,
  data,
  color,
  unit,
  gradientId,
}: {
  title: string;
  data: Array<{ date: string; value: number }>;
  color: string;
  unit: string;
  gradientId: string;
}) {
  if (data.length === 0) {
    return (
      <div className="card">
        <h4 className="text-[12px] font-semibold mb-2" style={{ color: 'var(--rm-text-muted)' }}>{title}</h4>
        <div className="h-[120px] flex items-center justify-center text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>
          —
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h4 className="text-[12px] font-semibold mb-2" style={{ color: 'var(--rm-text-muted)' }}>{title}</h4>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.2} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--rm-border)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            stroke="var(--rm-text-muted)" fontSize={9} tickLine={false}
          />
          <YAxis stroke="var(--rm-text-muted)" fontSize={9} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number | undefined) => [`${v ?? 0}${unit}`]} />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function ScenarioTrendsPanel({ data }: { data: ScenarioSummary }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <TrendChart
        title="P95 Latency"
        data={data.p95_trend}
        color="var(--rm-signal)"
        unit="ms"
        gradientId="scenP95Grad"
      />
      <TrendChart
        title="Error Rate"
        data={data.error_rate_trend}
        color="var(--rm-fail)"
        unit="%"
        gradientId="scenErrorGrad"
      />
      <TrendChart
        title="Stability"
        data={data.stability_trend ?? []}
        color="var(--rm-pass)"
        unit="%"
        gradientId="scenStabGrad"
      />
    </div>
  );
}
