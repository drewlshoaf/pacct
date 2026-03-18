'use client';

import { useState, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { fetchEvidenceData } from '@/lib/api';
import type { EvidenceResult } from '@/lib/api';

const tooltipStyle = {
  background: 'var(--rm-bg-raised)',
  border: '1px solid var(--rm-border)',
  borderRadius: '8px',
  fontSize: '12px',
  color: 'var(--rm-text)',
};

function P95Evidence({ data }: { data: EvidenceResult }) {
  return (
    <div className="space-y-4">
      {data.p95_over_time && data.p95_over_time.length > 0 && (
        <div>
          <h4 className="text-[12px] font-semibold mb-2" style={{ color: 'var(--rm-text-muted)' }}>P95 Over Time</h4>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={data.p95_over_time} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--rm-border)" vertical={false} />
              <XAxis dataKey="time" tickFormatter={(t: string) => new Date(t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} stroke="var(--rm-text-muted)" fontSize={10} tickLine={false} />
              <YAxis stroke="var(--rm-text-muted)" fontSize={10} tickLine={false} unit="ms" />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number | undefined) => [`${v ?? 0}ms`, 'P95']} />
              <Area type="monotone" dataKey="value" stroke="var(--rm-signal)" strokeWidth={2} fill="rgba(232,185,49,0.1)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      {data.latency_distribution && (
        <div>
          <h4 className="text-[12px] font-semibold mb-2" style={{ color: 'var(--rm-text-muted)' }}>Latency Distribution</h4>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={data.latency_distribution} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--rm-border)" vertical={false} />
              <XAxis dataKey="bucket_ms" stroke="var(--rm-text-muted)" fontSize={9} tickLine={false} />
              <YAxis stroke="var(--rm-text-muted)" fontSize={10} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="var(--rm-signal)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function ErrorEvidence({ data }: { data: EvidenceResult }) {
  return (
    <div className="space-y-4">
      {data.error_rate_over_time && data.error_rate_over_time.length > 0 && (
        <div>
          <h4 className="text-[12px] font-semibold mb-2" style={{ color: 'var(--rm-text-muted)' }}>Error Rate Over Time</h4>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={data.error_rate_over_time} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--rm-border)" vertical={false} />
              <XAxis dataKey="time" tickFormatter={(t: string) => new Date(t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} stroke="var(--rm-text-muted)" fontSize={10} tickLine={false} />
              <YAxis stroke="var(--rm-text-muted)" fontSize={10} tickLine={false} unit="%" />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number | undefined) => [`${v ?? 0}%`, 'Error Rate']} />
              <Area type="monotone" dataKey="rate" stroke="var(--rm-fail)" strokeWidth={2} fill="rgba(220,53,69,0.1)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      {data.error_breakdown && (
        <div>
          <h4 className="text-[12px] font-semibold mb-2" style={{ color: 'var(--rm-text-muted)' }}>Error Breakdown</h4>
          <div className="flex items-center gap-4 text-[12px]" style={{ color: 'var(--rm-text-secondary)' }}>
            <span>Total errors: <strong>{data.error_breakdown.total_errors}</strong></span>
            <span>Total requests: <strong>{data.error_breakdown.total_requests}</strong></span>
          </div>
          <div className="text-[11px] mt-1" style={{ color: 'var(--rm-text-muted)' }}>
            4xx | 5xx | timeouts | network
          </div>
        </div>
      )}
    </div>
  );
}

function StabilityEvidence({ data }: { data: EvidenceResult }) {
  return (
    <div className="space-y-3">
      <div className="text-[13px]" style={{ color: 'var(--rm-text)' }}>
        Stability: {data.stability_score != null ? `${data.stability_score}%` : '—'}
      </div>
      {data.penalties && data.penalties.length > 0 && (
        <div>
          <h4 className="text-[12px] font-semibold mb-2" style={{ color: 'var(--rm-text-muted)' }}>Stability Drivers</h4>
          <div className="space-y-1.5">
            {data.penalties.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-[12px]">
                <span style={{ color: 'var(--rm-text-secondary)' }}>{p.reason}</span>
                <span className="font-mono" style={{ color: 'var(--rm-fail)' }}>-{p.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RunFailedEvidence({ data }: { data: EvidenceResult }) {
  return (
    <div className="space-y-2">
      <div className="text-[13px]" style={{ color: 'var(--rm-fail)' }}>Execution Failed</div>
      {data.failure_reason && (
        <div className="text-[12px]" style={{ color: 'var(--rm-text-secondary)' }}>
          Reason: {data.failure_reason}
        </div>
      )}
      {data.stop_time && (
        <div className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>
          Stopped at: {new Date(data.stop_time).toLocaleString()}
        </div>
      )}
    </div>
  );
}

export default function EvidencePanel({
  planRunId,
  scenarioId,
  assertionType,
  runId,
}: {
  planRunId?: string;
  scenarioId?: string | null;
  assertionType?: string | null;
  runId?: string | null;
}) {
  const [data, setData] = useState<EvidenceResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!assertionType) {
      setData(null);
      return;
    }

    setLoading(true);
    fetchEvidenceData({
      runId: runId ?? undefined,
      planRunId: planRunId,
      scenarioId: scenarioId ?? undefined,
      type: assertionType,
    }).then(d => {
      setData(d);
      setLoading(false);
    });
  }, [planRunId, scenarioId, assertionType, runId]);

  if (!assertionType) {
    return (
      <div className="card text-center py-12 sticky top-20">
        <p className="text-[13px] font-medium" style={{ color: 'var(--rm-text-muted)' }}>
          Select an assertion to view evidence.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card text-center py-12 sticky top-20">
        <p className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>Loading evidence...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card text-center py-12 sticky top-20">
        <p className="text-[13px]" style={{ color: 'var(--rm-text-muted)' }}>No evidence data available.</p>
      </div>
    );
  }

  return (
    <div className="card sticky top-20">
      <h3 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--rm-text)' }}>Evidence</h3>
      {data.type === 'p95' && <P95Evidence data={data} />}
      {data.type === 'error' && <ErrorEvidence data={data} />}
      {data.type === 'stability' && <StabilityEvidence data={data} />}
      {data.type === 'run_failed' && <RunFailedEvidence data={data} />}
    </div>
  );
}
