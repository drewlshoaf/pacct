'use client';

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { CHART_COLORS } from '../chartColors';

interface TooltipEntry { dataKey: string; value: number }

function formatTime(t: number) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function ThroughputTooltip({ active, payload, label, xLabel, showVUs }: { active?: boolean; payload?: TooltipEntry[]; label?: number; xLabel?: string; showVUs?: boolean }) {
  if (!active || !payload?.length || label === undefined) return null;
  const entry = payload.find(p => p.dataKey === 'throughput');
  const vuEntry = payload.find(p => p.dataKey === 'concurrency');
  const comp = payload.find(p => p.dataKey === 'compThroughput');
  return (
    <div style={{ background: 'var(--rm-bg-raised)', border: '1px solid var(--rm-border)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: 'var(--rm-text)' }}>
      <div style={{ color: 'var(--rm-text-muted)', marginBottom: 6 }}>{xLabel === 'bucket' ? `Bucket ${label}` : formatTime(label)}</div>
      {entry && (
        <div className="flex items-center gap-2">
          <span style={{ width: 8, height: 2, background: CHART_COLORS.rps, borderRadius: 1, display: 'inline-block' }} />
          <span>Achieved RPS</span>
          <span style={{ color: CHART_COLORS.rps, fontWeight: 600, marginLeft: 'auto' }}>{entry.value} rps</span>
        </div>
      )}
      {showVUs && vuEntry && (
        <div className="flex items-center gap-2 mt-1">
          <span style={{ width: 8, height: 2, background: CHART_COLORS.vus, borderRadius: 1, display: 'inline-block' }} />
          <span>VUs</span>
          <span style={{ color: CHART_COLORS.vus, fontWeight: 600, marginLeft: 'auto' }}>{vuEntry.value}</span>
        </div>
      )}
      {comp && (
        <div className="flex items-center gap-2 mt-1" style={{ borderTop: '1px solid var(--rm-border)', paddingTop: 4 }}>
          <span style={{ width: 8, height: 2, background: 'var(--rm-text-muted)', borderRadius: 1, display: 'inline-block' }} />
          <span style={{ color: 'var(--rm-text-muted)' }}>Comparison</span>
          <span style={{ color: 'var(--rm-text-muted)', fontWeight: 600, marginLeft: 'auto' }}>{comp.value} rps</span>
        </div>
      )}
    </div>
  );
}

interface EventBucket { id: string; severity: string; bucketIndex: number }

interface Props {
  data: readonly any[];
  xDataKey: string;
  showRps: boolean;
  showVUs: boolean;
  height: number;
  syncId?: string;
  eventBuckets?: EventBucket[];
  hasComparison?: boolean;
  xTickFormatter?: (v: number) => string;
}

export default function ThroughputPane({ data, xDataKey, showRps, showVUs, height, syncId, eventBuckets, hasComparison, xTickFormatter }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} syncId={syncId} margin={{ top: 10, right: 55, left: 5, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--rm-border)" />
        <XAxis dataKey={xDataKey} stroke="var(--rm-text-muted)" fontSize={11} tickLine={false} tickFormatter={xTickFormatter} />
        <YAxis yAxisId="left" stroke="var(--rm-text-muted)" fontSize={11} tickLine={false} width={45} label={{ value: 'rps', position: 'insideLeft', angle: -90, offset: 10, fill: 'var(--rm-text-muted)', fontSize: 11 }} />
        <YAxis yAxisId="vu" orientation="right" stroke={showVUs ? CHART_COLORS.vus : 'transparent'} fontSize={10} tickLine={false} width={40} tick={showVUs ? undefined : { fill: 'transparent' }} label={showVUs ? { value: 'VUs', position: 'insideRight', angle: 90, offset: -5, fill: CHART_COLORS.vus, fontSize: 10 } : undefined} />
        <Tooltip content={<ThroughputTooltip showVUs={showVUs} xLabel={xDataKey} />} />
        {eventBuckets?.map(e => (
          <ReferenceLine key={e.id} yAxisId="left" x={e.bucketIndex} stroke={e.severity === 'critical' ? 'var(--rm-fail)' : 'var(--rm-caution)'} strokeDasharray="4 4" strokeWidth={1} />
        ))}
        {showRps && (
          <Line yAxisId="left" type="monotone" dataKey="throughput" stroke={CHART_COLORS.rps} strokeWidth={2} dot={false} isAnimationActive={false} />
        )}
        {showVUs && (
          <Line yAxisId="vu" type="monotone" dataKey="concurrency" stroke={CHART_COLORS.vus} strokeWidth={1} strokeOpacity={0.5} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
        )}
        {hasComparison && showRps && (
          <Line yAxisId="left" type="monotone" dataKey="compThroughput" stroke="var(--rm-text-muted)" strokeWidth={1.5} strokeDasharray="6 4" dot={false} isAnimationActive={false} />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
