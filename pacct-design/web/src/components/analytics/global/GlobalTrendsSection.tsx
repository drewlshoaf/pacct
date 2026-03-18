'use client';

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import type { GlobalAnalytics } from '@/lib/api';

export default function GlobalTrendsSection({ data }: { data: GlobalAnalytics }) {
  if (data.stability_over_time.length === 0) {
    return (
      <div className="card mb-5 text-center py-8">
        <p className="text-[13px]" style={{ color: 'var(--rm-text-muted)' }}>No stability trend data in this window.</p>
      </div>
    );
  }

  return (
    <div className="card mb-5">
      <h3 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--rm-text)' }}>Stability % Over Time</h3>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data.stability_over_time} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <defs>
            <linearGradient id="stabilityGradAn" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2E8B3E" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#2E8B3E" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--rm-border)" vertical={false} />
          <XAxis dataKey="date" stroke="var(--rm-text-muted)" fontSize={11} tickLine={false} />
          <YAxis stroke="var(--rm-text-muted)" fontSize={11} tickLine={false} domain={[0, 100]} unit="%" />
          <Tooltip
            contentStyle={{
              background: 'var(--rm-bg-raised)',
              border: '1px solid var(--rm-border)',
              borderRadius: '8px',
              fontSize: '12px',
              color: 'var(--rm-text)',
            }}
            formatter={(v: number | undefined) => [`${v ?? 0}%`, 'Stability']}
          />
          <Area
            type="monotone"
            dataKey="stability"
            stroke="var(--rm-pass)"
            strokeWidth={2}
            fill="url(#stabilityGradAn)"
            dot={{ r: 3, fill: '#2E8B3E', stroke: 'var(--rm-bg-surface)', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
