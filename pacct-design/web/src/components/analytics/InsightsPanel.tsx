'use client';

import type { ScenarioAnalyticsResponse } from './analytics-types';

export default function InsightsPanel({ data }: { data: ScenarioAnalyticsResponse }) {
  const insights = data.insights;

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
        Insights
      </h3>

      {(!insights || insights.length === 0) ? (
        <p style={{ fontSize: 12, color: 'var(--rm-text-muted)', margin: 0 }}>
          No summary insights available for the selected scope
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {insights.map((insight, i) => (
            <div
              key={i}
              style={{
                borderLeft: '2px solid var(--rm-signal)',
                paddingLeft: 12,
                paddingTop: 4,
                paddingBottom: 4,
                fontSize: 13,
                color: 'var(--rm-text)',
                lineHeight: 1.5,
              }}
            >
              {insight}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
