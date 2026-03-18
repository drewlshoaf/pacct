'use client';

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { CHART_COLORS } from '../chartColors';

interface TooltipEntry { dataKey: string; value: number }

function formatTime(t: number) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function VolumeTooltip({ active, payload, label, xLabel, showReceived, showSent }: {
  active?: boolean; payload?: TooltipEntry[]; label?: number; xLabel?: string;
  showReceived: boolean; showSent: boolean;
}) {
  if (!active || !payload?.length || label === undefined) return null;
  const received = payload.find(p => p.dataKey === 'bytesReceived');
  const sent = payload.find(p => p.dataKey === 'bytesSent');
  if (!received && !sent) return null;
  return (
    <div style={{ background: 'var(--rm-bg-raised)', border: '1px solid var(--rm-border)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: 'var(--rm-text)' }}>
      <div style={{ color: 'var(--rm-text-muted)', marginBottom: 6 }}>{xLabel === 'bucket' ? `Bucket ${label}` : formatTime(label)}</div>
      {showReceived && received && (
        <div className="flex items-center gap-2">
          <span style={{ width: 8, height: 2, background: CHART_COLORS.bytes, borderRadius: 1, display: 'inline-block' }} />
          <span>Bytes Received</span>
          <span style={{ color: CHART_COLORS.bytes, fontWeight: 600, marginLeft: 'auto' }}>{formatBytes(received.value)}</span>
        </div>
      )}
      {showSent && sent && sent.value > 0 && (
        <div className="flex items-center gap-2 mt-1">
          <span style={{ width: 8, height: 2, background: CHART_COLORS.bytesSent, borderRadius: 1, display: 'inline-block' }} />
          <span>Bytes Sent</span>
          <span style={{ color: CHART_COLORS.bytesSent, fontWeight: 600, marginLeft: 'auto' }}>{formatBytes(sent.value)}</span>
        </div>
      )}
    </div>
  );
}

interface EventBucket { id: string; severity: string; bucketIndex: number }

interface Props {
  data: readonly any[];
  xDataKey: string;
  height: number;
  syncId?: string;
  eventBuckets?: EventBucket[];
  xTickFormatter?: (v: number) => string;
  showReceived?: boolean;
  showSent?: boolean;
  /** When true, always render the chart (no empty state) — used during live streaming */
  live?: boolean;
}

export default function VolumePane({ data, xDataKey, height, syncId, eventBuckets, xTickFormatter, showReceived = true, showSent = true, live = false }: Props) {
  const hasReceived = data.some(d => (d.bytesReceived ?? 0) > 0);
  const hasSent = data.some(d => (d.bytesSent ?? 0) > 0);
  const hasData = hasReceived || hasSent;

  if (!hasData && !live) {
    return (
      <div
        className="flex items-center justify-center gap-2 rounded-lg"
        style={{ height: 48, color: 'var(--rm-text-muted)', background: 'var(--rm-bg-card)', border: '1px solid var(--rm-border)' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <span className="text-[12px]">Volume metrics not available for this run</span>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} syncId={syncId} margin={{ top: 10, right: 15, left: 5, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--rm-border)" />
        <XAxis dataKey={xDataKey} stroke="var(--rm-text-muted)" fontSize={11} tickLine={false} tickFormatter={xTickFormatter} />
        <YAxis stroke="var(--rm-text-muted)" fontSize={11} tickLine={false} width={55} tickFormatter={(v: number) => formatBytes(v)} />
        <Tooltip content={<VolumeTooltip xLabel={xDataKey} showReceived={showReceived} showSent={showSent} />} />
        {eventBuckets?.map(e => (
          <ReferenceLine key={e.id} x={e.bucketIndex} stroke={e.severity === 'critical' ? 'var(--rm-fail)' : 'var(--rm-caution)'} strokeDasharray="4 4" strokeWidth={1} />
        ))}
        {showReceived && <Line type="monotone" dataKey="bytesReceived" stroke={CHART_COLORS.bytes} strokeWidth={2} dot={false} isAnimationActive={false} />}
        {showSent && hasSent && <Line type="monotone" dataKey="bytesSent" stroke={CHART_COLORS.bytesSent} strokeWidth={1.5} dot={false} isAnimationActive={false} strokeDasharray="4 3" />}
      </LineChart>
    </ResponsiveContainer>
  );
}
