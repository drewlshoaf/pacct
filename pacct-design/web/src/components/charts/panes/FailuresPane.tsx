'use client';

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { CHART_COLORS } from '../chartColors';

interface TooltipEntry { dataKey: string; value: number }

function formatTime(t: number) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function FailuresTooltip({ active, payload, label, xLabel, showErrors, showTimeouts }: { active?: boolean; payload?: TooltipEntry[]; label?: number; xLabel?: string; showErrors: boolean; showTimeouts: boolean }) {
  if (!active || !payload?.length || label === undefined) return null;
  const err = payload.find(p => p.dataKey === 'errorRate');
  const to = payload.find(p => p.dataKey === 'timeoutRate');
  return (
    <div style={{ background: 'var(--rm-bg-raised)', border: '1px solid var(--rm-border)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: 'var(--rm-text)' }}>
      <div style={{ color: 'var(--rm-text-muted)', marginBottom: 6 }}>{xLabel === 'bucket' ? `Bucket ${label}` : formatTime(label)}</div>
      {showErrors && err && (
        <div className="flex items-center gap-2 mb-1">
          <span style={{ width: 8, height: 2, background: CHART_COLORS.errors, borderRadius: 1, display: 'inline-block' }} />
          <span>Error Rate</span>
          <span style={{ color: CHART_COLORS.errors, fontWeight: 600, marginLeft: 'auto' }}>{err.value === 0 ? '0' : err.value < 0.01 ? err.value.toPrecision(2) : err.value.toFixed(2)}%</span>
        </div>
      )}
      {showTimeouts && to && (
        <div className="flex items-center gap-2">
          <span style={{ width: 8, height: 2, background: CHART_COLORS.timeouts, borderRadius: 1, display: 'inline-block' }} />
          <span>Timeout Rate</span>
          <span style={{ color: CHART_COLORS.timeouts, fontWeight: 600, marginLeft: 'auto' }}>{to.value === 0 ? '0' : to.value < 0.01 ? to.value.toPrecision(2) : to.value.toFixed(2)}%</span>
        </div>
      )}
    </div>
  );
}

interface EventBucket { id: string; severity: string; bucketIndex: number }

interface Props {
  data: readonly any[];
  xDataKey: string;
  showErrors: boolean;
  showTimeouts: boolean;
  height: number;
  syncId?: string;
  eventBuckets?: EventBucket[];
  xTickFormatter?: (v: number) => string;
}

export default function FailuresPane({ data, xDataKey, showErrors, showTimeouts, height, syncId, eventBuckets, xTickFormatter }: Props) {
  const allTimeoutsZero = data.every(d => (d.timeoutRate ?? 0) === 0);
  const allErrorsZero = data.every(d => (d.errorRate ?? 0) === 0);

  return (
    <div style={{ position: 'relative' }}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} syncId={syncId} margin={{ top: 10, right: 15, left: 5, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--rm-border)" />
          <XAxis dataKey={xDataKey} stroke="var(--rm-text-muted)" fontSize={11} tickLine={false} tickFormatter={xTickFormatter} />
          <YAxis stroke="var(--rm-text-muted)" fontSize={11} tickLine={false} width={45} label={{ value: '%', position: 'insideLeft', angle: -90, offset: 10, fill: 'var(--rm-text-muted)', fontSize: 11 }} />
          <Tooltip content={<FailuresTooltip showErrors={showErrors} showTimeouts={showTimeouts} xLabel={xDataKey} />} />
          {eventBuckets?.map(e => (
            <ReferenceLine key={e.id} x={e.bucketIndex} stroke={e.severity === 'critical' ? 'var(--rm-fail)' : 'var(--rm-caution)'} strokeDasharray="4 4" strokeWidth={1} />
          ))}
          {showErrors && (
            <Line type="monotone" dataKey="errorRate" stroke={CHART_COLORS.errors} strokeWidth={2} dot={false} isAnimationActive={false} />
          )}
          {showTimeouts && (
            <Line type="monotone" dataKey="timeoutRate" stroke={CHART_COLORS.timeouts} strokeWidth={1.5} strokeDasharray="5 3" dot={false} isAnimationActive={false} />
          )}
        </LineChart>
      </ResponsiveContainer>
      {/* Zero-state annotations */}
      {(showTimeouts && allTimeoutsZero || showErrors && allErrorsZero) && (
        <div className="flex items-center gap-3 px-3 pb-1" style={{ marginTop: -8 }}>
          {showTimeouts && allTimeoutsZero && (
            <span className="text-[10px] flex items-center gap-1.5" style={{ color: 'var(--rm-text-muted)' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M8 12l3 3 5-5" /></svg>
              No timeouts recorded
            </span>
          )}
          {showErrors && allErrorsZero && (
            <span className="text-[10px] flex items-center gap-1.5" style={{ color: 'var(--rm-text-muted)' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M8 12l3 3 5-5" /></svg>
              No errors recorded
            </span>
          )}
        </div>
      )}
    </div>
  );
}
