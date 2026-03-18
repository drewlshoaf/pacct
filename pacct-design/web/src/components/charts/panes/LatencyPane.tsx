'use client';

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { CHART_COLORS } from '../chartColors';

type LatencyKey = 'latencyP50' | 'latencyP95' | 'latencyP99';

export const LATENCY_LINES: { key: LatencyKey; label: string; color: string; width: number }[] = [
  { key: 'latencyP50', label: 'P50', color: CHART_COLORS.p50, width: 1 },
  { key: 'latencyP95', label: 'P95', color: CHART_COLORS.p95, width: 2.5 },
  { key: 'latencyP99', label: 'P99', color: CHART_COLORS.p99, width: 1.5 },
];

export type { LatencyKey };

interface TooltipEntry { dataKey: string; value: number }

function formatTime(t: number) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function LatencyTooltip({ active, payload, label, xLabel, visibleKeys }: { active?: boolean; payload?: TooltipEntry[]; label?: number; xLabel?: string; visibleKeys: Set<LatencyKey> }) {
  if (!active || !payload?.length || label === undefined) return null;
  return (
    <div style={{ background: 'var(--rm-bg-raised)', border: '1px solid var(--rm-border)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: 'var(--rm-text)' }}>
      <div style={{ color: 'var(--rm-text-muted)', marginBottom: 6 }}>{xLabel === 'bucket' ? `Bucket ${label}` : formatTime(label)}</div>
      {LATENCY_LINES.filter(l => visibleKeys.has(l.key)).map(l => {
        const entry = payload.find(p => p.dataKey === l.key);
        if (!entry) return null;
        return (
          <div key={l.key} className="flex items-center gap-2 mb-1">
            <span style={{ width: 8, height: 2, background: l.color, borderRadius: 1, display: 'inline-block' }} />
            <span>{l.label}</span>
            <span style={{ color: l.color, fontWeight: 600, marginLeft: 'auto' }}>{entry.value} ms</span>
          </div>
        );
      })}
    </div>
  );
}

interface EventBucket { id: string; severity: string; bucketIndex: number }

interface Props {
  data: readonly any[];
  xDataKey: string;
  visibleKeys: Set<LatencyKey>;
  height: number;
  syncId?: string;
  eventBuckets?: EventBucket[];
  hasComparison?: boolean;
  xTickFormatter?: (v: number) => string;
}

export default function LatencyPane({ data, xDataKey, visibleKeys, height, syncId, eventBuckets, hasComparison, xTickFormatter }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} syncId={syncId} margin={{ top: 10, right: 15, left: 5, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--rm-border)" />
        <XAxis dataKey={xDataKey} stroke="var(--rm-text-muted)" fontSize={11} tickLine={false} tickFormatter={xTickFormatter} />
        <YAxis stroke="var(--rm-text-muted)" fontSize={11} tickLine={false} width={45} label={{ value: 'ms', position: 'insideLeft', angle: -90, offset: 10, fill: 'var(--rm-text-muted)', fontSize: 11 }} />
        <Tooltip content={<LatencyTooltip visibleKeys={visibleKeys} xLabel={xDataKey} />} />
        {eventBuckets?.map(e => (
          <ReferenceLine key={e.id} x={e.bucketIndex} stroke={e.severity === 'critical' ? 'var(--rm-fail)' : 'var(--rm-caution)'} strokeDasharray="4 4" strokeWidth={1} />
        ))}
        {LATENCY_LINES.filter(l => visibleKeys.has(l.key)).map(l => (
          <Line key={l.key} type="monotone" dataKey={l.key} stroke={l.color} strokeWidth={l.width} dot={false} isAnimationActive={false} />
        ))}
        {hasComparison && LATENCY_LINES.filter(l => visibleKeys.has(l.key)).map(l => (
          <Line key={`comp-${l.key}`} type="monotone" dataKey={`comp${l.key.charAt(0).toUpperCase() + l.key.slice(1)}`} stroke="var(--rm-text-muted)" strokeWidth={1.5} strokeDasharray="6 4" dot={false} isAnimationActive={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
