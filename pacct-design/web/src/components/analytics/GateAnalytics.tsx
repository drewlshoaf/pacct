'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { ScenarioAnalyticsResponse } from './analytics-types';

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const tooltipStyle = {
  background: 'var(--rm-bg-raised)',
  border: '1px solid var(--rm-border)',
  borderRadius: '8px',
  fontSize: '12px',
  color: 'var(--rm-text)',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--rm-bg-surface)',
  border: '1px solid var(--rm-border)',
  borderRadius: 12,
  padding: '20px 24px',
};

const thStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--rm-text-muted)',
  textAlign: 'left',
  padding: '6px 10px',
  borderBottom: '1px solid var(--rm-border)',
};

const tdStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--rm-text)',
  padding: '8px 10px',
  borderBottom: '1px solid var(--rm-border)',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GateAnalytics({ data }: { data: ScenarioAnalyticsResponse }) {
  const gate = data.gates;

  if (!gate || (gate.trend.length === 0 && gate.most_failing.length === 0 && gate.newly_failing.length === 0)) {
    return (
      <div style={cardStyle}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--rm-text)', margin: 0, marginBottom: 12 }}>
          Gate Analytics
        </h3>
        <p style={{ fontSize: 12, color: 'var(--rm-text-muted)', margin: 0 }}>
          No gate history available
        </p>
      </div>
    );
  }

  // Prepare trend data with short date labels
  const trendData = gate.trend.map((t) => ({
    ...t,
    run_label: shortDate(t.created_at),
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--rm-text)', margin: 0 }}>
        Gate Analytics
      </h3>

      {/* Gate Pass / Fail Trend */}
      {trendData.length > 0 && (
        <div style={cardStyle}>
          <h4
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--rm-text-muted)',
              margin: 0,
              marginBottom: 12,
            }}
          >
            Gate Pass / Fail Trend
          </h4>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--rm-border)" vertical={false} />
              <XAxis
                dataKey="run_label"
                stroke="var(--rm-text-muted)"
                fontSize={9}
                tickLine={false}
              />
              <YAxis stroke="var(--rm-text-muted)" fontSize={9} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend
                wrapperStyle={{ fontSize: 11, color: 'var(--rm-text-secondary)' }}
              />
              <Bar dataKey="passed" stackId="gates" fill="var(--rm-pass)" name="Passed" radius={[0, 0, 0, 0]} />
              <Bar dataKey="failed" stackId="gates" fill="var(--rm-fail)" name="Failed" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Most Frequently Failing */}
      {gate.most_failing.length > 0 && (
        <div style={cardStyle}>
          <h4
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--rm-text-muted)',
              margin: 0,
              marginBottom: 12,
            }}
          >
            Most Frequently Failing
          </h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Gate Name</th>
                  <th style={thStyle}>Fail Count</th>
                  <th style={thStyle}>Last Failed</th>
                </tr>
              </thead>
              <tbody>
                {gate.most_failing.map((g) => (
                  <tr key={g.gate_id}>
                    <td style={tdStyle}>{g.gate_name}</td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: 'inline-block',
                          background: 'rgba(220,38,38,0.12)',
                          color: 'var(--rm-fail)',
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '1px 8px',
                          borderRadius: 999,
                        }}
                      >
                        {g.fail_count}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--rm-text-secondary)' }}>{formatDate(g.last_failed)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Newly Failing */}
      {gate.newly_failing.length > 0 && (
        <div style={cardStyle}>
          <h4
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--rm-text-muted)',
              margin: 0,
              marginBottom: 12,
            }}
          >
            Newly Failing
          </h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Gate Name</th>
                  <th style={thStyle}>Fail Count</th>
                  <th style={thStyle}>Last Failed</th>
                </tr>
              </thead>
              <tbody>
                {gate.newly_failing.map((g) => (
                  <tr key={g.gate_id}>
                    <td style={tdStyle}>{g.gate_name}</td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: 'inline-block',
                          background: 'rgba(220,38,38,0.12)',
                          color: 'var(--rm-fail)',
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '1px 8px',
                          borderRadius: 999,
                        }}
                      >
                        {g.fail_count}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--rm-text-secondary)' }}>{formatDate(g.last_failed)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
