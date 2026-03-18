'use client';

import { useMemo, useState, useCallback, type ReactNode } from 'react';
import { MetricPoint, RunEvent } from '@/data/types';
import { CHART_COLORS, PANE_TITLES, type ChartPaneId } from '@/components/charts/chartColors';
import { usePaneLayout } from '@/hooks/usePaneLayout';
import DraggableChartStack from '@/components/charts/DraggableChartStack';
import ThroughputPane from '@/components/charts/panes/ThroughputPane';
import LatencyPane, { type LatencyKey, LATENCY_LINES } from '@/components/charts/panes/LatencyPane';
import FailuresPane from '@/components/charts/panes/FailuresPane';
import VolumePane from '@/components/charts/panes/VolumePane';
import ChartExpandOverlay from '@/components/charts/ChartExpandOverlay';

// ─── Storage keys ─────────────────────────────────────────────────────────

const STORAGE_PREFIX = 'sv-primary';
const LATENCY_VIS_KEY = 'sv-chart-latency-vis';
const RPS_KEY = 'sv-chart-rps-vis';
const VU_KEY = 'sv-chart-vu-vis';
const ERRORS_KEY = 'sv-chart-errors-vis';
const TIMEOUTS_KEY = 'sv-chart-timeouts-vis';
const BYTES_RECV_KEY = 'sv-chart-bytes-recv-vis';
const BYTES_SENT_KEY = 'sv-chart-bytes-sent-vis';

// ─── Helpers ──────────────────────────────────────────────────────────────

function loadBool(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback;
  const v = localStorage.getItem(key);
  if (v === 'true') return true;
  if (v === 'false') return false;
  return fallback;
}

function loadLatencyVisibility(): Set<LatencyKey> {
  if (typeof window !== 'undefined') {
    const s = localStorage.getItem(LATENCY_VIS_KEY);
    if (s) try { return new Set(JSON.parse(s) as LatencyKey[]); } catch { /* ignore */ }
  }
  return new Set<LatencyKey>(['latencyP95']);
}

// ─── Bucketing ────────────────────────────────────────────────────────────

interface BucketPoint {
  bucket: number;
  timestamp: number;
  throughput: number;
  latencyP50: number;
  latencyP95: number;
  latencyP99: number;
  errorRate: number;
  timeoutRate: number;
  bytesReceived: number;
  bytesSent: number;
  concurrency: number;
  compThroughput?: number;
  compLatencyP50?: number;
  compLatencyP95?: number;
  compLatencyP99?: number;
  compErrorRate?: number;
  compTimeoutRate?: number;
  compBytesReceived?: number;
}

function bucketize(metrics: MetricPoint[], bucketCount: number): BucketPoint[] {
  if (metrics.length === 0) return [];
  const step = Math.max(1, Math.floor(metrics.length / bucketCount));
  const buckets: BucketPoint[] = [];
  for (let i = 0; i < bucketCount && i * step < metrics.length; i++) {
    const slice = metrics.slice(i * step, Math.min((i + 1) * step, metrics.length));
    const rawAvg = (key: keyof MetricPoint) => slice.reduce((s, m) => s + ((m[key] as number) ?? 0), 0) / slice.length;
    const avg = (key: keyof MetricPoint) => +rawAvg(key).toFixed(2);
    const errAvg = rawAvg('errorRate');
    const toAvg = rawAvg('timeoutRate');
    buckets.push({
      bucket: i,
      timestamp: slice[Math.floor(slice.length / 2)].timestamp,
      throughput: avg('throughput'),
      latencyP50: avg('latencyP50'),
      latencyP95: avg('latencyP95'),
      latencyP99: avg('latencyP99'),
      errorRate: errAvg < 0.01 && errAvg > 0 ? +errAvg.toPrecision(2) : +errAvg.toFixed(2),
      timeoutRate: toAvg < 0.01 && toAvg > 0 ? +toAvg.toPrecision(2) : +toAvg.toFixed(2),
      bytesReceived: +slice.reduce((s, m) => s + ((m.bytesReceived as number) ?? 0), 0).toFixed(0),
      bytesSent: +slice.reduce((s, m) => s + ((m.bytesSent as number) ?? 0), 0).toFixed(0),
      concurrency: avg('concurrency'),
    });
  }
  return buckets;
}

function mergeComparison(primary: BucketPoint[], comp: MetricPoint[], bucketCount: number): BucketPoint[] {
  const cBuckets = bucketize(comp, bucketCount);
  return primary.map((p, i) => ({
    ...p,
    compThroughput: cBuckets[i]?.throughput,
    compLatencyP50: cBuckets[i]?.latencyP50,
    compLatencyP95: cBuckets[i]?.latencyP95,
    compLatencyP99: cBuckets[i]?.latencyP99,
    compErrorRate: cBuckets[i]?.errorRate,
    compTimeoutRate: cBuckets[i]?.timeoutRate,
    compBytesReceived: cBuckets[i]?.bytesReceived,
  }));
}

// ─── Toggle Button ────────────────────────────────────────────────────────

function ToggleButton({ on, color, label, onClick, dashed }: { on: boolean; color: string; label: string; onClick: () => void; dashed?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium transition-colors"
      style={{
        background: on ? `${color}18` : 'transparent',
        color: on ? color : 'var(--rm-text-muted)',
        border: `1px solid ${on ? `${color}40` : 'var(--rm-border)'}`,
      }}
    >
      {dashed ? (
        <span style={{ width: 12, height: 1, borderTop: `2px dashed ${on ? color : 'var(--rm-text-muted)'}`, display: 'inline-block', opacity: on ? 0.8 : 0.3 }} />
      ) : (
        <span style={{ width: 8, height: 2, background: on ? color : 'var(--rm-text-muted)', borderRadius: 1, display: 'inline-block', opacity: on ? 1 : 0.4 }} />
      )}
      {label}
    </button>
  );
}

// ─── Event bucket mapping ─────────────────────────────────────────────────

interface EventBucket { id: string; severity: string; bucketIndex: number }

// ─── Component ────────────────────────────────────────────────────────────

const SYNC_ID = 'primary-metrics';

export default function PrimaryChart({ metrics, events, zoomRange, comparisonMetrics, onEventClick }: {
  metrics: MetricPoint[];
  events: RunEvent[];
  zoomRange: [number, number] | null;
  comparisonMetrics?: MetricPoint[];
  onEventClick: (t: number) => void;
}) {
  const { paneOrder, collapsedPanes, toggleCollapse, reorder } = usePaneLayout(STORAGE_PREFIX);

  // Throughput toggles
  const [showRps, setShowRps] = useState(() => loadBool(RPS_KEY, true));
  const [showVUs, setShowVUs] = useState(() => loadBool(VU_KEY, false));

  // Latency toggles
  const [visibleLatency, setVisibleLatency] = useState<Set<LatencyKey>>(loadLatencyVisibility);

  // Failures toggles
  const [showErrors, setShowErrors] = useState(() => loadBool(ERRORS_KEY, true));
  const [showTimeouts, setShowTimeouts] = useState(() => loadBool(TIMEOUTS_KEY, true));

  // Volume toggles
  const [showBytesRecv, setShowBytesRecv] = useState(() => loadBool(BYTES_RECV_KEY, true));
  const [showBytesSent, setShowBytesSent] = useState(() => loadBool(BYTES_SENT_KEY, true));

  const [expanded, setExpanded] = useState(false);

  const toggleRps = useCallback(() => {
    setShowRps(prev => { localStorage.setItem(RPS_KEY, String(!prev)); return !prev; });
  }, []);

  const toggleVUs = useCallback(() => {
    setShowVUs(prev => { localStorage.setItem(VU_KEY, String(!prev)); return !prev; });
  }, []);

  const toggleLatency = useCallback((key: LatencyKey) => {
    setVisibleLatency(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size <= 1) return prev;
        next.delete(key);
      } else {
        next.add(key);
      }
      localStorage.setItem(LATENCY_VIS_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const toggleErrors = useCallback(() => {
    setShowErrors(prev => { localStorage.setItem(ERRORS_KEY, String(!prev)); return !prev; });
  }, []);

  const toggleTimeouts = useCallback(() => {
    setShowTimeouts(prev => { localStorage.setItem(TIMEOUTS_KEY, String(!prev)); return !prev; });
  }, []);

  const toggleBytesRecv = useCallback(() => {
    setShowBytesRecv(prev => { localStorage.setItem(BYTES_RECV_KEY, String(!prev)); return !prev; });
  }, []);

  const toggleBytesSent = useCallback(() => {
    setShowBytesSent(prev => { localStorage.setItem(BYTES_SENT_KEY, String(!prev)); return !prev; });
  }, []);

  // ── Data processing ──

  const filtered = useMemo(() =>
    zoomRange ? metrics.filter(m => m.timestamp >= zoomRange[0] && m.timestamp <= zoomRange[1]) : metrics,
    [metrics, zoomRange],
  );

  const filteredComp = useMemo(() =>
    comparisonMetrics && zoomRange ? comparisonMetrics.filter(m => m.timestamp >= zoomRange[0] && m.timestamp <= zoomRange[1]) : comparisonMetrics,
    [comparisonMetrics, zoomRange],
  );

  const bucketCount = 30;
  const chartData = useMemo(() => {
    const primary = bucketize(filtered, bucketCount);
    if (filteredComp) return mergeComparison(primary, filteredComp, bucketCount);
    return primary;
  }, [filtered, filteredComp]);

  const eventBuckets: EventBucket[] = useMemo(() => {
    if (chartData.length === 0) return [];
    const evts = zoomRange ? events.filter(e => e.timestamp >= zoomRange[0] && e.timestamp <= zoomRange[1]) : events;
    return evts.filter(e => e.severity !== 'info').map(e => {
      let closest = 0;
      let minDist = Infinity;
      chartData.forEach((b, i) => {
        const dist = Math.abs(b.timestamp - e.timestamp);
        if (dist < minDist) { minDist = dist; closest = i; }
      });
      return { id: e.id, severity: e.severity, bucketIndex: closest };
    });
  }, [chartData, events, zoomRange]);

  const hasComparison = !!comparisonMetrics;

  // Always show Volume pane — VolumePane handles its own no-data state
  const visiblePaneOrder = paneOrder;

  // ── Render pane contents ──

  const renderPane = useCallback((id: ChartPaneId, height?: number) => {
    const h = height ?? (id === 'volume' ? 120 : id === 'latency' ? 200 : 180);
    switch (id) {
      case 'throughput':
        return <ThroughputPane data={chartData} xDataKey="bucket" showRps={showRps} showVUs={showVUs} height={h} syncId={SYNC_ID} eventBuckets={eventBuckets} hasComparison={hasComparison} />;
      case 'latency':
        return <LatencyPane data={chartData} xDataKey="bucket" visibleKeys={visibleLatency} height={h} syncId={SYNC_ID} eventBuckets={eventBuckets} hasComparison={hasComparison} />;
      case 'failures':
        return <FailuresPane data={chartData} xDataKey="bucket" showErrors={showErrors} showTimeouts={showTimeouts} height={h} syncId={SYNC_ID} eventBuckets={eventBuckets} />;
      case 'volume':
        return <VolumePane data={chartData} xDataKey="bucket" height={h} syncId={SYNC_ID} eventBuckets={eventBuckets} showReceived={showBytesRecv} showSent={showBytesSent} />;
    }
  }, [chartData, showRps, showVUs, visibleLatency, showErrors, showTimeouts, showBytesRecv, showBytesSent, eventBuckets, hasComparison]);

  // ── Render toggle buttons ──

  const renderToggles = useCallback((id: ChartPaneId): ReactNode => {
    switch (id) {
      case 'throughput':
        return (
          <>
            <ToggleButton on={showRps} color={CHART_COLORS.rps} label="RPS" onClick={toggleRps} />
            <ToggleButton on={showVUs} color={CHART_COLORS.vus} label="VUs" onClick={toggleVUs} />
          </>
        );
      case 'latency':
        return (
          <>
            {LATENCY_LINES.map(l => (
              <ToggleButton key={l.key} on={visibleLatency.has(l.key)} color={l.color} label={l.label} onClick={() => toggleLatency(l.key)} />
            ))}
          </>
        );
      case 'failures':
        return (
          <>
            <ToggleButton on={showErrors} color={CHART_COLORS.errors} label="Errors" onClick={toggleErrors} dashed />
            <ToggleButton on={showTimeouts} color={CHART_COLORS.timeouts} label="Timeouts" onClick={toggleTimeouts} dashed />
          </>
        );
      case 'volume': {
        const hasSentData = chartData.some(d => (d.bytesSent ?? 0) > 0);
        return (
          <>
            <ToggleButton on={showBytesRecv} color={CHART_COLORS.bytes} label="Received" onClick={toggleBytesRecv} />
            {hasSentData && <ToggleButton on={showBytesSent} color={CHART_COLORS.bytesSent} label="Sent" onClick={toggleBytesSent} dashed />}
          </>
        );
      }
    }
  }, [showRps, showVUs, visibleLatency, showErrors, showTimeouts, showBytesRecv, showBytesSent, chartData, toggleRps, toggleVUs, toggleLatency, toggleErrors, toggleTimeouts, toggleBytesRecv, toggleBytesSent]);

  return (
    <div className="space-y-3">
      {/* Expand button */}
      <div className="flex justify-end px-1">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium transition-colors"
          style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text-muted)', border: '1px solid var(--rm-border)' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
          </svg>
          Expand
        </button>
      </div>

      {/* Draggable pane chart stack */}
      <DraggableChartStack
        paneOrder={visiblePaneOrder}
        collapsedPanes={collapsedPanes}
        onToggleCollapse={toggleCollapse}
        onReorder={reorder}
        renderPane={(id) => renderPane(id)}
        renderToggles={renderToggles}
      />

      {/* Expand Overlay — visible panes at larger heights */}
      {expanded && (
        <ChartExpandOverlay title="Performance Metrics" onClose={() => setExpanded(false)}>
          <div className="space-y-6">
            {visiblePaneOrder.map(id => (
              <div key={id}>
                <div className="text-[12px] font-semibold mb-2 px-1" style={{ color: 'var(--rm-text-secondary)' }}>
                  {PANE_TITLES[id]}
                </div>
                <div className="flex items-center gap-1 mb-3 px-1">
                  {renderToggles(id)}
                </div>
                {renderPane(id, id === 'volume' ? 240 : 300)}
              </div>
            ))}
          </div>
        </ChartExpandOverlay>
      )}
    </div>
  );
}
