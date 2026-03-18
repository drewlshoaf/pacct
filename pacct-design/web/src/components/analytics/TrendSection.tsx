'use client';

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea,
} from 'recharts';
import { CHART_COLORS } from '@/components/charts/chartColors';
import type { ScenarioAnalyticsResponse, TrendPoint } from './analytics-types';

// ─── Statistical helpers ─────────────────────────────────────────────────

function computeStats(points: TrendPoint[]): { mean: number; stddev: number } {
  if (points.length === 0) return { mean: 0, stddev: 0 };
  const vals = points.map(p => p.value);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const variance = vals.reduce((sum, v) => sum + (v - mean) ** 2, 0) / vals.length;
  return { mean, stddev: Math.sqrt(variance) };
}

// ─── Anomaly dot renderer ────────────────────────────────────────────────

function AnomalyDot(props: any, mean: number, stddev: number, dataKey: string) {
  const { cx, cy, payload } = props;
  const val = payload?.[dataKey] ?? 0;
  if (Math.abs(val - mean) > 2 * stddev && stddev > 0) {
    return <circle cx={cx} cy={cy} r={4} fill="var(--rm-fail)" stroke="#fff" strokeWidth={1.5} />;
  }
  return null;
}

interface Props {
  data: ScenarioAnalyticsResponse;
}

const SYNC_ID = 'analytics-trends';
const PANEL_HEIGHT = 180;

// ─── Date formatter for XAxis ────────────────────────────────────────────

function shortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ─── Merge multiple TrendPoint arrays into single Recharts data ─────────

function mergeTrendSeries(
  series: Record<string, TrendPoint[]>,
): Array<Record<string, unknown>> {
  const keys = Object.keys(series);
  if (keys.length === 0) return [];

  let baseKey = keys[0];
  for (const k of keys) {
    if (series[k].length > series[baseKey].length) baseKey = k;
  }

  const base = series[baseKey];
  return base.map((point, i) => {
    const merged: Record<string, unknown> = {
      date: point.created_at,
      run_id: point.run_id,
    };
    for (const key of keys) {
      merged[key] = series[key]?.[i]?.value ?? null;
    }
    return merged;
  });
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────

interface TooltipEntry {
  dataKey: string;
  value: number;
  color: string;
}

function ChartTooltip({
  active,
  payload,
  label,
  formatValue,
  labelMap,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
  formatValue: (value: number, key: string) => string;
  labelMap?: Record<string, string>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: 'var(--rm-bg-raised)',
        border: '1px solid var(--rm-border)',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 12,
        color: 'var(--rm-text)',
      }}
    >
      <div style={{ color: 'var(--rm-text-muted)', marginBottom: 6, fontSize: 10 }}>
        {label ? shortDate(label) : ''}
      </div>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 mb-0.5">
          <span
            style={{
              width: 8,
              height: 2,
              background: entry.color,
              borderRadius: 1,
              display: 'inline-block',
            }}
          />
          <span>{labelMap?.[entry.dataKey] ?? entry.dataKey}</span>
          <span style={{ color: entry.color, fontWeight: 600, marginLeft: 'auto' }}>
            {formatValue(entry.value, entry.dataKey)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Byte formatters ─────────────────────────────────────────────────────

function fmtBytesShort(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)}K`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(0)}M`;
  return `${(bytes / 1073741824).toFixed(1)}G`;
}

function fmtBytesLong(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

// ─── Component ───────────────────────────────────────────────────────────

export default function TrendSection({ data }: Props) {
  const { trends } = data;

  const throughputData = trends.throughput.map((p) => ({
    date: p.created_at,
    run_id: p.run_id,
    throughput: p.value,
  }));

  const latencyData = useMemo(
    () =>
      mergeTrendSeries({
        p50: trends.p50,
        p95: trends.p95,
        p99: trends.p99,
      }),
    [trends.p50, trends.p95, trends.p99],
  );

  const failuresData = trends.error_rate.map((p) => ({
    date: p.created_at,
    run_id: p.run_id,
    error_rate: p.value,
  }));

  const volumeData = useMemo(
    () =>
      mergeTrendSeries({
        bytes_received: trends.bytes_received,
        bytes_sent: trends.bytes_sent,
      }),
    [trends.bytes_received, trends.bytes_sent],
  );

  // ─── Baseline statistics for band overlays ─────────────────────────────
  const throughputStats = useMemo(() => computeStats(trends.throughput), [trends.throughput]);
  const p95Stats = useMemo(() => computeStats(trends.p95), [trends.p95]);
  const errorStats = useMemo(() => computeStats(trends.error_rate), [trends.error_rate]);
  const bytesStats = useMemo(() => computeStats(trends.bytes_received), [trends.bytes_received]);

  const hasData =
    throughputData.length > 0 ||
    latencyData.length > 0 ||
    failuresData.length > 0 ||
    volumeData.length > 0;

  if (!hasData) {
    return (
      <div
        style={{
          background: 'var(--rm-bg-surface)',
          border: '1px solid var(--rm-border)',
          borderRadius: 12,
          padding: '20px 24px',
        }}
      >
        <h3 className="text-[14px] font-semibold mb-1" style={{ color: 'var(--rm-text)' }}>
          Trend Analysis
        </h3>
        <p className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>
          Not enough data points for trend analysis.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'var(--rm-bg-surface)',
        border: '1px solid var(--rm-border)',
        borderRadius: 12,
        padding: '20px 24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <h3 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--rm-text)' }}>
        Trend Analysis
      </h3>

      <div className="space-y-4">
        {/* Panel 1: Throughput */}
        {throughputData.length > 0 && (
          <TrendPanel title="Throughput">
            <LineChart data={throughputData} syncId={SYNC_ID}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--rm-border)" />
              <XAxis dataKey="date" stroke="var(--rm-text-muted)" fontSize={10} tickFormatter={shortDate} axisLine={false} tickLine={false} />
              <YAxis stroke="var(--rm-text-muted)" fontSize={10} axisLine={false} tickLine={false} width={50} />
              <Tooltip
                content={
                  <ChartTooltip
                    formatValue={(v) => `${v.toFixed(1)} rps`}
                    labelMap={{ throughput: 'Throughput' }}
                  />
                }
              />
              <ReferenceArea
                y1={throughputStats.mean - throughputStats.stddev}
                y2={throughputStats.mean + throughputStats.stddev}
                fill="var(--rm-text-muted)"
                fillOpacity={0.06}
                strokeOpacity={0}
              />
              <Line
                type="monotone"
                dataKey="throughput"
                stroke={CHART_COLORS.rps}
                strokeWidth={2}
                dot={(props: any) => AnomalyDot(props, throughputStats.mean, throughputStats.stddev, 'throughput')}
                isAnimationActive={false}
              />
            </LineChart>
          </TrendPanel>
        )}

        {/* Panel 2: Latency */}
        {latencyData.length > 0 && (
          <TrendPanel title="Latency">
            <LineChart data={latencyData} syncId={SYNC_ID}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--rm-border)" />
              <XAxis dataKey="date" stroke="var(--rm-text-muted)" fontSize={10} tickFormatter={shortDate} axisLine={false} tickLine={false} />
              <YAxis stroke="var(--rm-text-muted)" fontSize={10} axisLine={false} tickLine={false} width={50} />
              <Tooltip
                content={
                  <ChartTooltip
                    formatValue={(v) => `${v.toFixed(0)} ms`}
                    labelMap={{ p50: 'P50', p95: 'P95', p99: 'P99' }}
                  />
                }
              />
              <ReferenceArea
                y1={p95Stats.mean - p95Stats.stddev}
                y2={p95Stats.mean + p95Stats.stddev}
                fill="var(--rm-text-muted)"
                fillOpacity={0.06}
                strokeOpacity={0}
              />
              <Line type="monotone" dataKey="p50" stroke={CHART_COLORS.p50} strokeWidth={1.5} dot={false} isAnimationActive={false} />
              <Line
                type="monotone"
                dataKey="p95"
                stroke={CHART_COLORS.p95}
                strokeWidth={2}
                dot={(props: any) => AnomalyDot(props, p95Stats.mean, p95Stats.stddev, 'p95')}
                isAnimationActive={false}
              />
              <Line type="monotone" dataKey="p99" stroke={CHART_COLORS.p99} strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </TrendPanel>
        )}

        {/* Panel 3: Failures */}
        {failuresData.length > 0 && (
          <TrendPanel title="Failures">
            <LineChart data={failuresData} syncId={SYNC_ID}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--rm-border)" />
              <XAxis dataKey="date" stroke="var(--rm-text-muted)" fontSize={10} tickFormatter={shortDate} axisLine={false} tickLine={false} />
              <YAxis stroke="var(--rm-text-muted)" fontSize={10} axisLine={false} tickLine={false} width={50} tickFormatter={(v: number) => `${v.toFixed(0)}%`} />
              <Tooltip
                content={
                  <ChartTooltip
                    formatValue={(v) => `${v.toFixed(2)}%`}
                    labelMap={{ error_rate: 'Error Rate' }}
                  />
                }
              />
              <ReferenceArea
                y1={errorStats.mean - errorStats.stddev}
                y2={errorStats.mean + errorStats.stddev}
                fill="var(--rm-text-muted)"
                fillOpacity={0.06}
                strokeOpacity={0}
              />
              <Line
                type="monotone"
                dataKey="error_rate"
                stroke={CHART_COLORS.errors}
                strokeWidth={2}
                dot={(props: any) => AnomalyDot(props, errorStats.mean, errorStats.stddev, 'error_rate')}
                isAnimationActive={false}
              />
            </LineChart>
          </TrendPanel>
        )}

        {/* Panel 4: Volume */}
        {volumeData.length > 0 && (
          <TrendPanel title="Volume">
            <LineChart data={volumeData} syncId={SYNC_ID}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--rm-border)" />
              <XAxis dataKey="date" stroke="var(--rm-text-muted)" fontSize={10} tickFormatter={shortDate} axisLine={false} tickLine={false} />
              <YAxis stroke="var(--rm-text-muted)" fontSize={10} axisLine={false} tickLine={false} width={60} tickFormatter={fmtBytesShort} />
              <Tooltip
                content={
                  <ChartTooltip
                    formatValue={(v) => fmtBytesLong(v)}
                    labelMap={{ bytes_received: 'Received', bytes_sent: 'Sent' }}
                  />
                }
              />
              <ReferenceArea
                y1={bytesStats.mean - bytesStats.stddev}
                y2={bytesStats.mean + bytesStats.stddev}
                fill="var(--rm-text-muted)"
                fillOpacity={0.06}
                strokeOpacity={0}
              />
              <Line
                type="monotone"
                dataKey="bytes_received"
                stroke={CHART_COLORS.bytes}
                strokeWidth={2}
                dot={(props: any) => AnomalyDot(props, bytesStats.mean, bytesStats.stddev, 'bytes_received')}
                isAnimationActive={false}
              />
              <Line type="monotone" dataKey="bytes_sent" stroke={CHART_COLORS.bytesSent} strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </TrendPanel>
        )}
      </div>
    </div>
  );
}

// ─── TrendPanel wrapper ──────────────────────────────────────────────────

function TrendPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        className="text-[11px] font-semibold uppercase tracking-wide mb-2"
        style={{ color: 'var(--rm-text-muted)' }}
      >
        {title}
      </div>
      <ResponsiveContainer width="100%" height={PANEL_HEIGHT}>
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
}
