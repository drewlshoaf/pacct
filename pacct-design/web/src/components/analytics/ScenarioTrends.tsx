'use client';

import Link from 'next/link';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { StatsGrid, StatCard } from '@/components/layout/PortalLayout';
import type { ScenarioRunDataPoint } from '@/lib/api';

interface ScenarioTrendsProps {
  scenarioName: string;
  dataPoints: ScenarioRunDataPoint[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateFull(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

type Trend = 'improving' | 'declining' | 'stable';

/** Compare last N values against overall average. For "lower is better" metrics, invert. */
function computeTrend(values: number[], lowerIsBetter: boolean, recentCount = 3): Trend {
  if (values.length < recentCount + 1) return 'stable';
  const overall = avg(values);
  if (overall === 0) return 'stable';
  const recent = avg(values.slice(-recentCount));
  const changePct = ((recent - overall) / overall) * 100;
  if (Math.abs(changePct) < 5) return 'stable';
  const rising = changePct > 0;
  if (lowerIsBetter) return rising ? 'declining' : 'improving';
  return rising ? 'improving' : 'declining';
}

function trendLabel(trend: Trend): string {
  const labels: Record<Trend, string> = {
    improving: '↑ Improving',
    declining: '↓ Declining',
    stable:    '→ Stable',
  };
  return labels[trend];
}

function trendChangeType(trend: Trend): 'up' | 'down' | 'neutral' {
  if (trend === 'improving') return 'up';
  if (trend === 'declining') return 'down';
  return 'neutral';
}

const tooltipStyle = {
  contentStyle: {
    background: 'var(--rm-bg-raised)',
    border: '1px solid var(--rm-border)',
    borderRadius: '8px',
    fontSize: '12px',
    color: 'var(--rm-text)',
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ScenarioTrends({ scenarioName, dataPoints }: ScenarioTrendsProps) {
  if (dataPoints.length === 0) {
    return (
      <div className="card text-center py-12">
        <p style={{ color: 'var(--rm-text-secondary)', fontSize: '14px' }}>
          No run data found for &ldquo;{scenarioName}&rdquo;
        </p>
      </div>
    );
  }

  const chartData = dataPoints.map((d) => ({
    ...d,
    date: formatDate(d.created_at),
    dateFull: formatDateFull(d.created_at),
  }));

  const avgP95 = Math.round(avg(dataPoints.map((d) => d.avg_p95)));
  const avgThroughput = Math.round(avg(dataPoints.map((d) => d.avg_throughput)));
  const avgErrorRate = +(avg(dataPoints.map((d) => d.avg_error_rate))).toFixed(2);
  const avgStability = Math.round(avg(dataPoints.map((d) => d.stability_score)));

  const p95Trend = computeTrend(dataPoints.map((d) => d.avg_p95), true);
  const throughputTrend = computeTrend(dataPoints.map((d) => d.avg_throughput), false);
  const errorTrend = computeTrend(dataPoints.map((d) => d.avg_error_rate), true);
  const stabilityTrend = computeTrend(dataPoints.map((d) => d.stability_score), false);

  const notEnoughData = dataPoints.length < 3;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Aggregate Stats */}
      <StatsGrid>
        <StatCard label="Avg P95 Latency" value={`${avgP95} ms`} change={trendLabel(p95Trend)} changeType={trendChangeType(p95Trend)} />
        <StatCard label="Avg Throughput" value={`${avgThroughput} rps`} change={trendLabel(throughputTrend)} changeType={trendChangeType(throughputTrend)} />
        <StatCard label="Avg Error Rate" value={`${avgErrorRate}%`} change={trendLabel(errorTrend)} changeType={trendChangeType(errorTrend)} />
        <StatCard label="Avg Stability" value={`${avgStability}/100`} change={trendLabel(stabilityTrend)} changeType={trendChangeType(stabilityTrend)} />
      </StatsGrid>

      {notEnoughData && (
        <div style={{ padding: '12px 16px', background: 'var(--rm-bg-raised)', borderRadius: '8px', border: '1px solid var(--rm-border)' }}>
          <p style={{ color: 'var(--rm-text-muted)', fontSize: '12px', margin: 0 }}>
            Only {dataPoints.length} run{dataPoints.length !== 1 ? 's' : ''} — trends require at least 3 runs.
          </p>
        </div>
      )}

      {/* Charts row 1: Latency + Throughput */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* P95 Latency Over Time */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ color: 'var(--rm-text)', fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>P95 Latency Over Time</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gradP95" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0AEFCF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0AEFCF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--rm-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--rm-text-muted)' }} stroke="var(--rm-border)" />
              <YAxis tick={{ fontSize: 11, fill: 'var(--rm-text-muted)' }} stroke="var(--rm-border)" unit=" ms" />
              <Tooltip {...tooltipStyle} labelFormatter={(_, payload) => payload?.[0]?.payload?.dateFull ?? ''} />
              <ReferenceLine y={avgP95} stroke="var(--rm-text-muted)" strokeDasharray="4 4" label={{ value: `avg ${avgP95}ms`, fill: 'var(--rm-text-muted)', fontSize: 10, position: 'insideTopRight' }} />
              <Area type="monotone" dataKey="avg_p95" name="P95 Latency (ms)" stroke="var(--rm-signal)" fill="url(#gradP95)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Throughput Over Time */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ color: 'var(--rm-text)', fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>Throughput Over Time</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--rm-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--rm-text-muted)' }} stroke="var(--rm-border)" />
              <YAxis tick={{ fontSize: 11, fill: 'var(--rm-text-muted)' }} stroke="var(--rm-border)" unit=" rps" />
              <Tooltip {...tooltipStyle} labelFormatter={(_, payload) => payload?.[0]?.payload?.dateFull ?? ''} />
              <Legend wrapperStyle={{ fontSize: '11px', color: 'var(--rm-text-muted)' }} />
              <Bar dataKey="avg_throughput" name="Avg RPS" fill="var(--rm-throughput)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="peak_throughput" name="Peak RPS" fill="var(--rm-signal)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2: Error Rate + Stability Score */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Error Rate Over Time */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ color: 'var(--rm-text)', fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>Error Rate Over Time</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gradError" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--rm-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--rm-text-muted)' }} stroke="var(--rm-border)" />
              <YAxis tick={{ fontSize: 11, fill: 'var(--rm-text-muted)' }} stroke="var(--rm-border)" unit="%" />
              <Tooltip {...tooltipStyle} labelFormatter={(_, payload) => payload?.[0]?.payload?.dateFull ?? ''} />
              <Area type="monotone" dataKey="avg_error_rate" name="Error Rate (%)" stroke="var(--rm-fail)" fill="url(#gradError)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Stability Score Trend */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ color: 'var(--rm-text)', fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>Stability Score Trend</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gradStability" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16A34A" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--rm-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--rm-text-muted)' }} stroke="var(--rm-border)" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--rm-text-muted)' }} stroke="var(--rm-border)" />
              <Tooltip {...tooltipStyle} labelFormatter={(_, payload) => payload?.[0]?.payload?.dateFull ?? ''} />
              <ReferenceLine y={80} stroke="var(--rm-pass)" strokeDasharray="4 4" label={{ value: 'Target', fill: 'var(--rm-pass)', fontSize: 10, position: 'insideTopRight' }} />
              <Area type="monotone" dataKey="stability_score" name="Stability Score" stroke="var(--rm-pass)" fill="url(#gradStability)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Run Summary Table */}
      <div className="card" style={{ padding: '20px' }}>
        <h3 style={{ color: 'var(--rm-text)', fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>Run Summary</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--rm-text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--rm-border)' }}>Date</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--rm-text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--rm-border)' }}>P95</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--rm-text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--rm-border)' }}>Throughput</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--rm-text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--rm-border)' }}>Error Rate</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--rm-text-muted)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--rm-border)' }}>Stability</th>
              </tr>
            </thead>
            <tbody>
              {dataPoints.map((d) => (
                <tr key={d.run_id} style={{ borderBottom: '1px solid var(--rm-border)' }}>
                  <td style={{ padding: '8px 12px' }}>
                    <Link href={`/dashboard/analytics?plan_id=${d.run_id}`} style={{ color: 'var(--rm-signal)', textDecoration: 'none', fontSize: '13px' }}>
                      {formatDateFull(d.created_at)}
                    </Link>
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--rm-text)', fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>
                    {d.avg_p95} ms
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--rm-text)', fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>
                    {d.avg_throughput} rps
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: '13px', fontVariantNumeric: 'tabular-nums', color: d.avg_error_rate > 1 ? 'var(--rm-fail)' : 'var(--rm-text)' }}>
                    {d.avg_error_rate}%
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: '13px', fontVariantNumeric: 'tabular-nums', color: d.stability_score >= 80 ? 'var(--rm-pass)' : d.stability_score >= 60 ? 'var(--rm-caution)' : 'var(--rm-fail)' }}>
                    {d.stability_score}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
