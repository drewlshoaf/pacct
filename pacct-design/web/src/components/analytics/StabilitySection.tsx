'use client';

import type { ScenarioAnalyticsResponse, StabilityStatus, VariancePanel } from './analytics-types';

// ---------------------------------------------------------------------------
// Status visual mapping
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<StabilityStatus, { label: string; bg: string; color: string }> = {
  stable:           { label: 'Stable',           bg: 'var(--rm-pass)',    color: '#fff' },
  mildly_unstable:  { label: 'Mildly unstable',  bg: 'var(--rm-caution)', color: '#fff' },
  highly_variable:  { label: 'Highly variable',  bg: 'var(--rm-fail)',    color: '#fff' },
  worsening:        { label: 'Worsening',        bg: 'var(--rm-fail)',    color: '#fff' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StabilitySection({ data }: { data: ScenarioAnalyticsResponse }) {
  const { variance } = data;

  if (!variance || variance.length === 0) {
    return (
      <div
        style={{
          background: 'var(--rm-bg-surface)',
          border: '1px solid var(--rm-border)',
          borderRadius: 12,
          padding: '20px 24px',
        }}
      >
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--rm-text)', margin: 0, marginBottom: 12 }}>
          Variance &amp; Stability
        </h3>
        <p style={{ fontSize: 12, color: 'var(--rm-text-muted)', margin: 0 }}>
          More run history needed to evaluate stability.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--rm-text)', margin: 0, marginBottom: 12 }}>
        Variance &amp; Stability
      </h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 12,
        }}
      >
        {variance.map((panel: VariancePanel) => {
          const cfg = STATUS_CONFIG[panel.status];
          return (
            <div
              key={panel.label}
              style={{
                background: 'var(--rm-bg-surface)',
                border: '1px solid var(--rm-border)',
                borderRadius: 12,
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {/* Title */}
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--rm-text-muted)',
                }}
              >
                {panel.label}
              </span>

              {/* Status badge */}
              <span
                style={{
                  display: 'inline-block',
                  alignSelf: 'flex-start',
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 10px',
                  borderRadius: 999,
                  background: cfg.bg,
                  color: cfg.color,
                  lineHeight: '18px',
                }}
              >
                {cfg.label}
              </span>

              {/* Description */}
              <span style={{ fontSize: 12, color: 'var(--rm-text-secondary)', lineHeight: 1.45 }}>
                {panel.description}
              </span>

              {/* CV value */}
              {panel.coefficient_of_variation != null && (
                <span style={{ fontSize: 11, color: 'var(--rm-text-muted)' }}>
                  CV: {panel.coefficient_of_variation.toFixed(1)}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
