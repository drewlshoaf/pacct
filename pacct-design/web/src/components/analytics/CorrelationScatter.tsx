'use client';

import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ZAxis,
} from 'recharts';
import type { ScenarioAnalyticsResponse, TrendData } from './analytics-types';

// ---------------------------------------------------------------------------
// Metric options
// ---------------------------------------------------------------------------

const METRIC_OPTIONS = [
  { key: 'throughput', label: 'Throughput (rps)' },
  { key: 'p50', label: 'P50 Latency (ms)' },
  { key: 'p95', label: 'P95 Latency (ms)' },
  { key: 'p99', label: 'P99 Latency (ms)' },
  { key: 'error_rate', label: 'Error Rate (%)' },
  { key: 'timeout_rate', label: 'Timeout Rate (%)' },
  { key: 'bytes_received', label: 'Bytes Received' },
  { key: 'bytes_sent', label: 'Bytes Sent' },
  { key: 'duration', label: 'Duration (s)' },
] as const;

type MetricKey = (typeof METRIC_OPTIONS)[number]['key'];

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

function computeStats(values: number[]): { mean: number; stddev: number } {
  if (values.length === 0) return { mean: 0, stddev: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return { mean, stddev: Math.sqrt(variance) };
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

function ScatterTooltip({
  active,
  payload,
  xLabel,
  yLabel,
}: {
  active?: boolean;
  payload?: any[];
  xLabel: string;
  yLabel: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  const date = new Date(point.created_at);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

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
      <div style={{ color: 'var(--rm-text-muted)', fontSize: 10, marginBottom: 4 }}>
        {dateStr} &middot; {point.run_id?.slice(0, 8)}
      </div>
      <div>
        {xLabel}: <strong>{point.x?.toFixed(2)}</strong>
      </div>
      <div>
        {yLabel}: <strong>{point.y?.toFixed(2)}</strong>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Legend dot
// ---------------------------------------------------------------------------

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span
      style={{
        fontSize: 11,
        color: 'var(--rm-text-muted)',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: color,
          display: 'inline-block',
        }}
      />
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Select styling
// ---------------------------------------------------------------------------

const selectStyle: React.CSSProperties = {
  background: 'var(--rm-bg-raised)',
  border: '1px solid var(--rm-border)',
  borderRadius: 6,
  padding: '4px 8px',
  fontSize: 11,
  color: 'var(--rm-text)',
  outline: 'none',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CorrelationScatter({ data }: { data: ScenarioAnalyticsResponse }) {
  const [xMetric, setXMetric] = useState<MetricKey>('throughput');
  const [yMetric, setYMetric] = useState<MetricKey>('p95');

  const xLabel = METRIC_OPTIONS.find((o) => o.key === xMetric)?.label ?? xMetric;
  const yLabel = METRIC_OPTIONS.find((o) => o.key === yMetric)?.label ?? yMetric;

  // Merge two trend arrays by index
  const scatterData = useMemo(() => {
    const xPoints = data.trends[xMetric as keyof TrendData];
    const yPoints = data.trends[yMetric as keyof TrendData];
    if (!Array.isArray(xPoints) || !Array.isArray(yPoints)) return [];
    if (!xPoints.length || !yPoints.length) return [];

    const len = Math.min(xPoints.length, yPoints.length);
    return Array.from({ length: len }, (_, i) => ({
      x: xPoints[i].value,
      y: yPoints[i].value,
      run_id: xPoints[i].run_id,
      created_at: xPoints[i].created_at,
    }));
  }, [data.trends, xMetric, yMetric]);

  // Outlier detection
  const xStats = useMemo(() => computeStats(scatterData.map((d) => d.x)), [scatterData]);
  const yStats = useMemo(() => computeStats(scatterData.map((d) => d.y)), [scatterData]);

  const isOutlier = (point: { x: number; y: number }) =>
    (xStats.stddev > 0 && Math.abs(point.x - xStats.mean) > 2 * xStats.stddev) ||
    (yStats.stddev > 0 && Math.abs(point.y - yStats.mean) > 2 * yStats.stddev);

  // Empty state
  if (scatterData.length < 2) {
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
          Metric Correlation
        </h3>
        <p className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>
          Need at least 2 runs for correlation analysis.
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
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <h3 className="text-[14px] font-semibold" style={{ color: 'var(--rm-text)', margin: 0 }}>
          Metric Correlation
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--rm-text-muted)' }}>X:</span>
          <select
            value={xMetric}
            onChange={(e) => setXMetric(e.target.value as MetricKey)}
            style={selectStyle}
          >
            {METRIC_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
          <span style={{ fontSize: 11, color: 'var(--rm-text-muted)' }}>Y:</span>
          <select
            value={yMetric}
            onChange={(e) => setYMetric(e.target.value as MetricKey)}
            style={selectStyle}
          >
            {METRIC_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--rm-border)" />
          <XAxis
            type="number"
            dataKey="x"
            name={xLabel}
            stroke="var(--rm-text-muted)"
            fontSize={10}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={yLabel}
            stroke="var(--rm-text-muted)"
            fontSize={10}
            tickLine={false}
            axisLine={false}
          />
          <ZAxis range={[30, 30]} />
          <Tooltip
            content={<ScatterTooltip xLabel={xLabel} yLabel={yLabel} />}
          />
          <Scatter data={scatterData} isAnimationActive={false}>
            {scatterData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={isOutlier(entry) ? 'var(--rm-fail)' : 'var(--rm-signal)'}
                fillOpacity={isOutlier(entry) ? 0.9 : 0.6}
                stroke={isOutlier(entry) ? 'var(--rm-fail)' : 'none'}
                strokeWidth={isOutlier(entry) ? 1.5 : 0}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 8, justifyContent: 'center' }}>
        <LegendDot color="var(--rm-signal)" label="Normal" />
        <LegendDot color="var(--rm-fail)" label="Outlier (>2σ)" />
      </div>
    </div>
  );
}
