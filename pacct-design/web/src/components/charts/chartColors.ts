/** Unified color system for all metric charts. No purple. */
export const CHART_COLORS = {
  // Throughput pane
  rps: '#D97706',
  vus: '#7DA8D4',           // muted blue — secondary to RPS

  // Latency pane — semantic hierarchy: P50 quiet → P95 prominent → P99 urgent
  p50: '#9B9390',           // warm gray — quietest baseline
  p95: '#E5A832',           // strong gold — main operational signal
  p99: '#EF4444',           // hot red — most visually urgent

  // Failures pane — errors primary red, timeouts distinct amber
  errors: '#DC2626',
  timeouts: '#F59E0B',      // amber — clearly failure-family but distinct from red

  // Volume pane
  bytes: '#3B82F6',         // blue — bytes received (primary)
  bytesSent: '#8B5CF6',     // violet — bytes sent (secondary)

  // Comparison overlay
  comparison: 'var(--rm-text-muted)',
} as const;

export type ChartPaneId = 'throughput' | 'latency' | 'failures' | 'volume';

export const DEFAULT_PANE_ORDER: ChartPaneId[] = [
  'throughput', 'latency', 'failures', 'volume',
];

export const PANE_TITLES: Record<ChartPaneId, string> = {
  throughput: 'Throughput',
  latency: 'Latency',
  failures: 'Failures / Outcome',
  volume: 'Volume',
};

export const PANE_SUBTITLES: Record<ChartPaneId, string> = {
  throughput: 'Completed work over time',
  latency: 'Percentile response times',
  failures: 'Errors and timeouts',
  volume: 'Payload / transfer volume',
};
