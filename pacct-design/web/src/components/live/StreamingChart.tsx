'use client';

import { useState, useCallback, type ReactNode } from 'react';
import { MetricPoint } from '@/data/types';
import { CHART_COLORS, type ChartPaneId } from '@/components/charts/chartColors';
import { usePaneLayout } from '@/hooks/usePaneLayout';
import DraggableChartStack from '@/components/charts/DraggableChartStack';
import ThroughputPane from '@/components/charts/panes/ThroughputPane';
import LatencyPane, { type LatencyKey, LATENCY_LINES } from '@/components/charts/panes/LatencyPane';
import FailuresPane from '@/components/charts/panes/FailuresPane';
import VolumePane from '@/components/charts/panes/VolumePane';
import ChartExpandOverlay from '@/components/charts/ChartExpandOverlay';

// ─── Toggle storage keys ─────────────────────────────────────────────────

const STORAGE_PREFIX = 'sv-live';
const LATENCY_VIS_KEY = 'sv-live-latency-vis';
const RPS_KEY = 'sv-live-rps-vis';

const ERRORS_KEY = 'sv-live-errors-vis';
const TIMEOUTS_KEY = 'sv-live-timeouts-vis';
const BYTES_RECV_KEY = 'sv-live-bytes-recv-vis';
const BYTES_SENT_KEY = 'sv-live-bytes-sent-vis';

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
    const saved = localStorage.getItem(LATENCY_VIS_KEY);
    if (saved) try { return new Set(JSON.parse(saved) as LatencyKey[]); } catch { /* ignore */ }
  }
  return new Set<LatencyKey>(['latencyP95']);
}

function formatTime(t: number) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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

// ─── Component ────────────────────────────────────────────────────────────

const SYNC_ID = 'streaming-metrics';
const xTickFormatter = (t: number) => formatTime(t);

export default function StreamingChart({ metrics }: { metrics: MetricPoint[] }) {
  const { paneOrder, collapsedPanes, toggleCollapse, reorder } = usePaneLayout(STORAGE_PREFIX);

  // Throughput toggles
  const [showRps, setShowRps] = useState(() => loadBool(RPS_KEY, true));

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

  // ── Render pane contents ──

  const renderPane = useCallback((id: ChartPaneId, height?: number) => {
    const h = height ?? (id === 'volume' ? 120 : 160);
    switch (id) {
      case 'throughput':
        return <ThroughputPane data={metrics} xDataKey="timestamp" showRps={showRps} showVUs={false} height={h} syncId={SYNC_ID} xTickFormatter={xTickFormatter} />;
      case 'latency':
        return <LatencyPane data={metrics} xDataKey="timestamp" visibleKeys={visibleLatency} height={h} syncId={SYNC_ID} xTickFormatter={xTickFormatter} />;
      case 'failures':
        return <FailuresPane data={metrics} xDataKey="timestamp" showErrors={showErrors} showTimeouts={showTimeouts} height={h} syncId={SYNC_ID} xTickFormatter={xTickFormatter} />;
      case 'volume':
        return <VolumePane data={metrics} xDataKey="timestamp" height={h} syncId={SYNC_ID} xTickFormatter={xTickFormatter} showReceived={showBytesRecv} showSent={showBytesSent} live />;
    }
  }, [metrics, showRps, visibleLatency, showErrors, showTimeouts, showBytesRecv, showBytesSent]);

  // ── Render toggle buttons ──

  const renderToggles = useCallback((id: ChartPaneId): ReactNode => {
    switch (id) {
      case 'throughput':
        return (
          <ToggleButton on={showRps} color={CHART_COLORS.rps} label="RPS" onClick={toggleRps} />
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
        const hasSentData = metrics.some(m => (m.bytesSent ?? 0) > 0);
        return (
          <>
            <ToggleButton on={showBytesRecv} color={CHART_COLORS.bytes} label="Received" onClick={toggleBytesRecv} />
            {hasSentData && <ToggleButton on={showBytesSent} color={CHART_COLORS.bytesSent} label="Sent" onClick={toggleBytesSent} dashed />}
          </>
        );
      }
    }
  }, [showRps, visibleLatency, showErrors, showTimeouts, showBytesRecv, showBytesSent, metrics, toggleRps, toggleLatency, toggleErrors, toggleTimeouts, toggleBytesRecv, toggleBytesSent]);

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

      {/* Draggable 4-pane chart stack */}
      <DraggableChartStack
        paneOrder={paneOrder}
        collapsedPanes={collapsedPanes}
        onToggleCollapse={toggleCollapse}
        onReorder={reorder}
        renderPane={(id) => renderPane(id)}
        renderToggles={renderToggles}
      />

      {/* Expand Overlay — all 4 panes at larger heights */}
      {expanded && (
        <ChartExpandOverlay title="Streaming Metrics" onClose={() => setExpanded(false)}>
          <div className="space-y-6">
            {paneOrder.map(id => (
              <div key={id}>
                <div className="text-[12px] font-semibold mb-2 px-1" style={{ color: 'var(--rm-text-secondary)' }}>
                  {id === 'throughput' ? 'Throughput' : id === 'latency' ? 'Latency' : id === 'failures' ? 'Failures / Outcome' : 'Volume'}
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
