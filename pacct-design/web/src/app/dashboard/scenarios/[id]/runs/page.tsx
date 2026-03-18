'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import PortalLayout, { PageHeader } from '@/components/layout/PortalLayout';
import { useScenario } from '../../_store/scenarioStore';
import { fetchScenarioLongitudinal, type ScenarioRunDataPoint } from '@/lib/api';

const decisionStyles: Record<string, { color: string; bg: string }> = {
  pass: { color: 'var(--rm-pass)', bg: 'rgba(59,167,118,0.12)' },
  fail: { color: 'var(--rm-fail)', bg: 'rgba(211,47,47,0.12)' },
  warn: { color: 'var(--rm-caution)', bg: 'rgba(217,164,65,0.12)' },
};

export default function ScenarioRunsPage() {
  const { id } = useParams<{ id: string }>();
  const scenario = useScenario(id);
  const [runs, setRuns] = useState<ScenarioRunDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!scenario) return;
    let active = true;
    const load = async () => {
      const data = await fetchScenarioLongitudinal(scenario.metadata.name, 50);
      if (active) { setRuns(data); setLoading(false); }
    };
    load();
    return () => { active = false; };
  }, [scenario]);

  const formatDuration = (seconds: number | null | undefined) => {
    if (!seconds) return '\u2014';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleString();
  };

  return (
    <PortalLayout>
      <PageHeader
        title={scenario ? `${scenario.metadata.name} \u2014 Runs` : 'Scenario Runs'}
        description="History of scenario executions"
        actions={
          <Link href="/dashboard/scenarios" className="btn btn-ghost text-[13px]">Back</Link>
        }
      />

      {loading ? (
        <div className="text-center py-12" style={{ color: 'var(--rm-text-muted)' }}>Loading runs...</div>
      ) : runs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20" style={{ color: 'var(--rm-text-muted)' }}>
          <p className="text-[15px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>No runs yet</p>
          <p className="text-[13px] mb-4">Run this scenario to see results here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map(run => {
            const style = decisionStyles[run.decision] ?? decisionStyles.warn;
            return (
              <Link key={run.run_id} href={`/dashboard/analytics?plan_id=${run.run_id}`} className="card flex items-center gap-4 no-underline hover:border-[var(--rm-border-hover)] transition-colors">
                <span className="text-[12px] font-semibold px-2 py-0.5 rounded" style={{ background: style.bg, color: style.color }}>{run.decision}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium" style={{ color: 'var(--rm-text)' }}>
                    Score: {run.overall_score}/100
                    <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded" style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text-muted)' }}>
                      {run.stability_band}
                    </span>
                  </div>
                  <div className="text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>
                    {formatTime(run.created_at)} &middot; p50 {Math.round(run.avg_p50)}ms &middot; {Math.round(run.avg_throughput)} req/s &middot; {run.total_requests.toLocaleString()} reqs
                  </div>
                </div>
                <div className="text-right flex-shrink-0 space-y-0.5">
                  <div className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>{formatDuration(run.duration_seconds)}</div>
                  {run.avg_error_rate > 0 && (
                    <div className="text-[11px]" style={{ color: 'var(--rm-fail)' }}>{run.avg_error_rate.toFixed(1)}% errors</div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </PortalLayout>
  );
}
