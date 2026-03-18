'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts';
import type { ScenarioAnalyticsResponse, MetricComparison } from './analytics-types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  data: ScenarioAnalyticsResponse;
}

// ---------------------------------------------------------------------------
// Metric classification
// ---------------------------------------------------------------------------

const LOWER_IS_BETTER = new Set([
  'P50 Latency', 'P95 Latency', 'P99 Latency',
  'Error Rate', 'Timeout Rate', 'Duration', 'Gate Failures',
]);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const cardStyle: React.CSSProperties = {
  background: 'var(--rm-bg-surface)',
  border: '1px solid var(--rm-border)',
  borderRadius: 12,
  padding: '20px 24px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

const tooltipStyle: React.CSSProperties = {
  background: 'var(--rm-bg-raised)',
  border: '1px solid var(--rm-border)',
  borderRadius: '8px',
  fontSize: '12px',
  color: 'var(--rm-text)',
};

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

interface TooltipPayloadEntry {
  payload?: {
    metric?: string;
    percent_delta?: number;
    isRegression?: boolean;
  };
}

function DeltaTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0]?.payload;
  if (!entry) return null;

  const sign = (entry.percent_delta ?? 0) > 0 ? '+' : '';
  const formatted = `${sign}${(entry.percent_delta ?? 0).toFixed(1)}%`;
  const color = entry.isRegression ? 'var(--rm-fail)' : 'var(--rm-pass)';

  return (
    <div style={{ ...tooltipStyle, padding: '8px 12px' }}>
      <p style={{ margin: 0, fontWeight: 600, marginBottom: 4 }}>{entry.metric}</p>
      <p style={{ margin: 0, color }}>
        {formatted}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DeltaBarChart({ data }: Props) {
  const { comparison } = data;

  if (comparison.length === 0) {
    return (
      <div style={cardStyle}>
        <h3 className="text-[14px] font-semibold mb-1" style={{ color: 'var(--rm-text)' }}>
          Metric Deltas
        </h3>
        <p className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>
          Not enough runs for delta analysis.
        </p>
      </div>
    );
  }

  // Transform comparison data for the chart
  const chartData = comparison.map((m: MetricComparison) => {
    const lowerBetter = LOWER_IS_BETTER.has(m.metric);
    const isRegression = lowerBetter ? m.percent_delta > 0 : m.percent_delta < 0;
    return {
      metric: m.metric,
      percent_delta: m.percent_delta,
      isRegression,
      anomaly: m.anomaly,
    };
  });

  // Compute a symmetrical domain around 0
  const maxAbs = Math.max(
    ...chartData.map((d) => Math.abs(d.percent_delta)),
    1, // minimum so we never get [0, 0]
  );
  const domainBound = Math.ceil(maxAbs * 1.15); // add 15% padding

  const chartHeight = Math.max(180, comparison.length * 32);

  return (
    <div style={cardStyle}>
      <h3 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--rm-text)' }}>
        Metric Deltas
      </h3>

      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
        >
          <CartesianGrid
            horizontal={false}
            strokeDasharray="3 3"
            stroke="var(--rm-border)"
          />

          <XAxis
            type="number"
            domain={[-domainBound, domainBound]}
            tickFormatter={(value: number) => `${value}%`}
            tick={{ fontSize: 10, fill: 'var(--rm-text-muted)' }}
            stroke="var(--rm-border)"
          />

          <YAxis
            type="category"
            dataKey="metric"
            width={120}
            tick={{ fontSize: 11, fill: 'var(--rm-text-secondary)' }}
            stroke="var(--rm-border)"
          />

          <ReferenceLine
            x={0}
            stroke="var(--rm-text-muted)"
            strokeWidth={1}
          />

          <Tooltip
            content={<DeltaTooltip />}
            cursor={{ fill: 'var(--rm-bg-hover)', opacity: 0.5 }}
          />

          <Bar dataKey="percent_delta" isAnimationActive={false} radius={[3, 3, 3, 3]}>
            {chartData.map((entry) => (
              <Cell
                key={entry.metric}
                fill={entry.isRegression ? 'var(--rm-fail)' : 'var(--rm-pass)'}
                fillOpacity={entry.anomaly ? 1 : 0.7}
                stroke={entry.anomaly ? 'var(--rm-fail)' : 'none'}
                strokeWidth={entry.anomaly ? 1.5 : 0}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
