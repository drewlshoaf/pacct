'use client';

import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import type { ScenarioAnalyticsResponse } from './analytics-types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TimelineEvent {
  id: string;
  timestamp: string; // ISO date
  type: 'gate_failure' | 'anomaly' | 'positive';
  label: string;
  color: string;
  shape: 'circle' | 'triangle';
}

interface Props {
  data: ScenarioAnalyticsResponse;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NEGATIVE_CATEGORIES = new Set([
  'most_anomalous',
  'biggest_regression',
  'highest_error',
  'latest_failed',
  'slowest',
]);

const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 56;
const TIMELINE_Y = 30;
const MARKER_Y = 18;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTickDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function computeTicks(minMs: number, maxMs: number, count: number): { x: number; label: string }[] {
  const ticks: { x: number; label: string }[] = [];
  const span = maxMs - minMs;
  if (span <= 0) return ticks;

  for (let i = 0; i <= count; i++) {
    const t = minMs + (span * i) / count;
    const pct = (t - minMs) / span;
    ticks.push({
      x: pct * VIEWBOX_WIDTH,
      label: formatTickDate(new Date(t).toISOString()),
    });
  }
  return ticks;
}

// ---------------------------------------------------------------------------
// Legend Item
// ---------------------------------------------------------------------------

function LegendItem({ color, shape, label }: { color: string; shape: 'circle' | 'triangle'; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <svg width={10} height={10} viewBox="0 0 10 10">
        {shape === 'circle' ? (
          <circle cx={5} cy={5} r={4} fill={color} />
        ) : (
          <polygon points="5,1 1,9 9,9" fill={color} />
        )}
      </svg>
      <span style={{ fontSize: 10, color: 'var(--rm-text-muted)' }}>{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EventRail({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<TimelineEvent | null>(null);
  const [hoveredX, setHoveredX] = useState<number>(0);

  // Build unified event list
  const events = useMemo<TimelineEvent[]>(() => {
    const list: TimelineEvent[] = [];

    // Gate failures
    if (data.gates?.trend) {
      for (const g of data.gates.trend) {
        if (g.failed > 0) {
          list.push({
            id: `gate-${g.run_id}`,
            timestamp: g.created_at,
            type: 'gate_failure',
            label: `${g.failed} gate${g.failed > 1 ? 's' : ''} failed`,
            color: 'var(--rm-fail)',
            shape: 'circle',
          });
        }
      }
    }

    // Notable negative runs
    if (data.notable_runs) {
      for (const r of data.notable_runs) {
        if (NEGATIVE_CATEGORIES.has(r.category)) {
          list.push({
            id: `notable-${r.run_id}-${r.category}`,
            timestamp: r.created_at,
            type: 'anomaly',
            label: r.label,
            color: 'var(--rm-caution)',
            shape: 'triangle',
          });
        }
      }

      // Notable positive runs
      for (const r of data.notable_runs) {
        if (r.category === 'latest_passed') {
          list.push({
            id: `notable-${r.run_id}-${r.category}`,
            timestamp: r.created_at,
            type: 'positive',
            label: r.label,
            color: 'var(--rm-pass)',
            shape: 'circle',
          });
        }
      }
    }

    // Sort chronologically
    list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return list;
  }, [data]);

  // Derive time range from throughput trend data
  const timeRange = useMemo(() => {
    const throughput = data.trends?.throughput;
    if (!throughput || throughput.length === 0) return null;

    const min = new Date(throughput[0].created_at).getTime();
    const max = new Date(throughput[throughput.length - 1].created_at).getTime();
    return { min, max };
  }, [data.trends?.throughput]);

  // Compute tick marks (4 divisions = 5 ticks)
  const ticks = useMemo(() => {
    if (!timeRange || timeRange.max === timeRange.min) return [];
    return computeTicks(timeRange.min, timeRange.max, 4);
  }, [timeRange]);

  // Map timestamp to viewBox X coordinate
  const timeToX = useCallback(
    (iso: string): number => {
      if (!timeRange || timeRange.max === timeRange.min) return VIEWBOX_WIDTH / 2;
      const t = new Date(iso).getTime();
      const pct = (t - timeRange.min) / (timeRange.max - timeRange.min);
      // Clamp to valid range
      const clamped = Math.max(0, Math.min(1, pct));
      return clamped * VIEWBOX_WIDTH;
    },
    [timeRange],
  );

  // Track container width for tooltip positioning
  const [containerWidth, setContainerWidth] = useState(0);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Convert viewBox X to pixel X for tooltip
  const viewBoxToPixel = useCallback(
    (vx: number): number => {
      if (containerWidth === 0) return 0;
      return (vx / VIEWBOX_WIDTH) * containerWidth;
    },
    [containerWidth],
  );

  // Empty state
  if (events.length === 0 || !timeRange) {
    return (
      <div
        style={{
          background: 'var(--rm-bg-surface)',
          border: '1px solid var(--rm-border)',
          borderRadius: 12,
          padding: '16px 24px',
        }}
      >
        <h3
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--rm-text-muted)',
            margin: 0,
            marginBottom: 8,
          }}
        >
          Event Timeline
        </h3>
        <p style={{ fontSize: 12, color: 'var(--rm-text-muted)', margin: 0 }}>
          No events in selected scope
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
        padding: '16px 24px',
      }}
    >
      <h3
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--rm-text-muted)',
          margin: 0,
          marginBottom: 8,
        }}
      >
        Event Timeline
      </h3>

      {/* Timeline SVG */}
      <div ref={containerRef} style={{ position: 'relative' }}>
        <svg
          width="100%"
          height={VIEWBOX_HEIGHT}
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          preserveAspectRatio="none"
          style={{ overflow: 'visible', display: 'block' }}
        >
          {/* Timeline base line */}
          <line
            x1={0}
            y1={TIMELINE_Y}
            x2={VIEWBOX_WIDTH}
            y2={TIMELINE_Y}
            stroke="var(--rm-border)"
            strokeWidth={1}
          />

          {/* Date tick marks */}
          {ticks.map((tick) => (
            <g key={tick.label + tick.x}>
              <line
                x1={tick.x}
                y1={TIMELINE_Y - 2}
                x2={tick.x}
                y2={TIMELINE_Y + 2}
                stroke="var(--rm-text-muted)"
                strokeWidth={1}
              />
              <text
                x={tick.x}
                y={TIMELINE_Y + 16}
                textAnchor="middle"
                fontSize={9}
                fill="var(--rm-text-muted)"
                style={{ fontFamily: 'inherit' }}
              >
                {tick.label}
              </text>
            </g>
          ))}

          {/* Event markers */}
          {events.map((evt) => {
            const x = timeToX(evt.timestamp);
            if (evt.shape === 'circle') {
              return (
                <circle
                  key={evt.id}
                  cx={x}
                  cy={MARKER_Y}
                  r={4}
                  fill={evt.color}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => {
                    setHovered(evt);
                    setHoveredX(x);
                  }}
                  onMouseLeave={() => setHovered(null)}
                />
              );
            }
            // Triangle (pointing up)
            return (
              <polygon
                key={evt.id}
                points={`${x},${MARKER_Y - 6} ${x - 4},${MARKER_Y + 4} ${x + 4},${MARKER_Y + 4}`}
                fill={evt.color}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => {
                  setHovered(evt);
                  setHoveredX(x);
                }}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}
        </svg>

        {/* Hover tooltip */}
        {hovered && (
          <div
            style={{
              position: 'absolute',
              left: viewBoxToPixel(hoveredX),
              bottom: VIEWBOX_HEIGHT - 4,
              transform: 'translateX(-50%)',
              background: 'var(--rm-bg-raised)',
              border: '1px solid var(--rm-border)',
              borderRadius: 8,
              padding: '6px 10px',
              fontSize: 11,
              color: 'var(--rm-text)',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            {hovered.label}
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
        <LegendItem color="var(--rm-fail)" shape="circle" label="Gate failure" />
        <LegendItem color="var(--rm-caution)" shape="triangle" label="Anomaly" />
        <LegendItem color="var(--rm-pass)" shape="circle" label="Passed" />
      </div>
    </div>
  );
}
