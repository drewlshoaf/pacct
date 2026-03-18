'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { CHART_COLORS } from '@/components/charts/chartColors';
import type { ScenarioAnalyticsResponse, TrendPoint } from './analytics-types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  data: ScenarioAnalyticsResponse;
}

interface BoxPlotStats {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outliers: number[];
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

function computeBoxPlot(values: number[]): BoxPlotStats | null {
  if (values.length < 3) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const q1Idx = Math.floor(n * 0.25);
  const medIdx = Math.floor(n * 0.5);
  const q3Idx = Math.floor(n * 0.75);
  const q1 = sorted[q1Idx];
  const median = sorted[medIdx];
  const q3 = sorted[q3Idx];
  const iqr = q3 - q1;
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;
  const min = sorted.find(v => v >= lower) ?? sorted[0];
  const max = [...sorted].reverse().find(v => v <= upper) ?? sorted[n - 1];
  const outliers = sorted.filter(v => v < lower || v > upper);
  return { min, q1, median, q3, max, outliers };
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function formatMs(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}s`;
  return `${Math.round(value)}ms`;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROW_HEIGHT = 40;
const ROW_GAP = 12;
const LABEL_WIDTH = 50;
const RIGHT_PAD = 20;
const TOP_PAD = 8;
const BOTTOM_PAD = 28; // space for x-axis labels
const BOX_HEIGHT = 18;
const WHISKER_CAP = 8;
const OUTLIER_RADIUS = 3;
const TICK_COUNT = 5;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LatencyBoxPlot({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Measure container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(el);
    // Set initial width
    setContainerWidth(el.getBoundingClientRect().width);

    return () => observer.disconnect();
  }, []);

  const metrics = useMemo(() => [
    { key: 'p50' as const, label: 'P50', color: CHART_COLORS.p50, data: data.trends.p50 },
    { key: 'p95' as const, label: 'P95', color: CHART_COLORS.p95, data: data.trends.p95 },
    { key: 'p99' as const, label: 'P99', color: CHART_COLORS.p99, data: data.trends.p99 },
  ], [data.trends.p50, data.trends.p95, data.trends.p99]);

  const boxPlots = useMemo(() => {
    return metrics.map(m => ({
      ...m,
      stats: computeBoxPlot(m.data.map((pt: TrendPoint) => pt.value)),
    }));
  }, [metrics]);

  const hasData = boxPlots.some(bp => bp.stats !== null);

  // Compute global scale across all metrics
  const { globalMin, globalMax, ticks } = useMemo(() => {
    if (!hasData) return { globalMin: 0, globalMax: 1, ticks: [] };

    const allValues: number[] = [];
    for (const bp of boxPlots) {
      if (!bp.stats) continue;
      allValues.push(bp.stats.min, bp.stats.max, ...bp.stats.outliers);
    }

    const gMin = Math.min(...allValues);
    const gMax = Math.max(...allValues);

    // Add 5% padding on each side
    const range = gMax - gMin || 1;
    const paddedMin = Math.max(0, gMin - range * 0.05);
    const paddedMax = gMax + range * 0.05;

    // Generate tick values
    const tickStep = (paddedMax - paddedMin) / (TICK_COUNT - 1);
    const generatedTicks: number[] = [];
    for (let i = 0; i < TICK_COUNT; i++) {
      generatedTicks.push(paddedMin + tickStep * i);
    }

    return { globalMin: paddedMin, globalMax: paddedMax, ticks: generatedTicks };
  }, [boxPlots, hasData]);

  const plotWidth = containerWidth - LABEL_WIDTH - RIGHT_PAD;
  const svgHeight = TOP_PAD + metrics.length * ROW_HEIGHT + (metrics.length - 1) * ROW_GAP + BOTTOM_PAD;

  const xScale = (value: number): number => {
    if (globalMax === globalMin) return LABEL_WIDTH + plotWidth / 2;
    return LABEL_WIDTH + ((value - globalMin) / (globalMax - globalMin)) * plotWidth;
  };

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
      <h3
        className="text-[14px] font-semibold mb-4"
        style={{ color: 'var(--rm-text)', margin: 0, marginBottom: 16 }}
      >
        Latency Distribution
      </h3>

      {!hasData ? (
        <p
          className="text-[13px]"
          style={{ color: 'var(--rm-text-muted)', margin: 0 }}
        >
          Need at least 3 runs to compute latency distribution.
        </p>
      ) : (
        <div ref={containerRef} style={{ width: '100%' }}>
          {containerWidth > 0 && (
            <svg
              width={containerWidth}
              height={svgHeight}
              style={{ display: 'block', overflow: 'visible' }}
            >
              {/* Rows */}
              {boxPlots.map((bp, rowIndex) => {
                if (!bp.stats) return null;
                const yCenter = TOP_PAD + rowIndex * (ROW_HEIGHT + ROW_GAP) + ROW_HEIGHT / 2;
                const { stats, color, label } = bp;

                const x1 = xScale(stats.min);
                const xQ1 = xScale(stats.q1);
                const xMed = xScale(stats.median);
                const xQ3 = xScale(stats.q3);
                const x2 = xScale(stats.max);

                return (
                  <g key={bp.key}>
                    {/* Label */}
                    <text
                      x={LABEL_WIDTH - 8}
                      y={yCenter}
                      textAnchor="end"
                      dominantBaseline="central"
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        fill: color,
                      }}
                    >
                      {label}
                    </text>

                    {/* Left whisker line (min to Q1) */}
                    <line
                      x1={x1}
                      y1={yCenter}
                      x2={xQ1}
                      y2={yCenter}
                      stroke={color}
                      strokeWidth={1.5}
                    />

                    {/* Left whisker cap */}
                    <line
                      x1={x1}
                      y1={yCenter - WHISKER_CAP / 2}
                      x2={x1}
                      y2={yCenter + WHISKER_CAP / 2}
                      stroke={color}
                      strokeWidth={1.5}
                    />

                    {/* Box (Q1 to Q3) */}
                    <rect
                      x={xQ1}
                      y={yCenter - BOX_HEIGHT / 2}
                      width={Math.max(xQ3 - xQ1, 1)}
                      height={BOX_HEIGHT}
                      fill={color}
                      fillOpacity={0.2}
                      stroke={color}
                      strokeWidth={1.5}
                      rx={3}
                      ry={3}
                    />

                    {/* Median line */}
                    <line
                      x1={xMed}
                      y1={yCenter - BOX_HEIGHT / 2}
                      x2={xMed}
                      y2={yCenter + BOX_HEIGHT / 2}
                      stroke={color}
                      strokeWidth={2}
                    />

                    {/* Right whisker line (Q3 to max) */}
                    <line
                      x1={xQ3}
                      y1={yCenter}
                      x2={x2}
                      y2={yCenter}
                      stroke={color}
                      strokeWidth={1.5}
                    />

                    {/* Right whisker cap */}
                    <line
                      x1={x2}
                      y1={yCenter - WHISKER_CAP / 2}
                      x2={x2}
                      y2={yCenter + WHISKER_CAP / 2}
                      stroke={color}
                      strokeWidth={1.5}
                    />

                    {/* Outlier dots */}
                    {stats.outliers.map((v, i) => (
                      <circle
                        key={i}
                        cx={xScale(v)}
                        cy={yCenter}
                        r={OUTLIER_RADIUS}
                        fill={color}
                        fillOpacity={0.6}
                        stroke={color}
                        strokeWidth={0.5}
                      />
                    ))}
                  </g>
                );
              })}

              {/* X-axis ticks */}
              {ticks.map((tick, i) => {
                const x = xScale(tick);
                const yBase = TOP_PAD + metrics.length * (ROW_HEIGHT + ROW_GAP) - ROW_GAP + 4;
                return (
                  <g key={i}>
                    <line
                      x1={x}
                      y1={yBase}
                      x2={x}
                      y2={yBase + 4}
                      stroke="var(--rm-text-muted)"
                      strokeWidth={1}
                      strokeOpacity={0.4}
                    />
                    <text
                      x={x}
                      y={yBase + 16}
                      textAnchor="middle"
                      style={{
                        fontSize: 10,
                        fill: 'var(--rm-text-muted)',
                      }}
                    >
                      {formatMs(tick)}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      )}
    </div>
  );
}
