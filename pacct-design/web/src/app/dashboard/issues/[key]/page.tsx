'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import PortalLayout, { PageHeader } from '@/components/layout/PortalLayout';
import { fetchDashboardData } from '@/lib/api';
import type { IssueSignature, DashboardGateResult, DashboardData, TimeWindow } from '@/data/types';

export default function IssueDetailPage() {
  const params = useParams<{ key: string }>();
  const searchParams = useSearchParams();
  const issueKey = decodeURIComponent(params.key);
  const window: TimeWindow = (searchParams.get('window') as TimeWindow) || '24h';

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const result = await fetchDashboardData(window);
    setData(result);
    setLoading(false);
  }, [window]);

  useEffect(() => {
    load();
  }, [load]);

  // Find the matching issue
  const issue: IssueSignature | undefined = data?.issues.find(i => i.key === issueKey);

  // For gate failures, also find the gate result
  const gateResult: DashboardGateResult | undefined =
    issue?.failure_type === 'gate_failed'
      ? data?.gates.failed_gates.find(g => issueKey === `gate::${g.gate_id}::gate_failed`)
      : undefined;

  // Derive timestamps from occurrences
  const sortedOccurrences = issue
    ? [...issue.occurrences].sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    : [];
  const latestOccurrence = sortedOccurrences[0] ?? null;
  const oldestOccurrence = sortedOccurrences[sortedOccurrences.length - 1] ?? null;

  const breadcrumb = (
    <div className="flex items-center gap-1.5 text-[12px] mb-2" style={{ color: 'var(--rm-text-muted)' }}>
      <Link href="/dashboard" className="no-underline hover:underline" style={{ color: 'var(--rm-text-muted)' }}>
        Dashboard
      </Link>
      <span>/</span>
      <span style={{ color: 'var(--rm-text-secondary)' }}>Issue</span>
    </div>
  );

  if (loading || !data) {
    return (
      <PortalLayout>
        {breadcrumb}
        <PageHeader title="Issue Detail" />
        <div className="card text-center py-12">
          <p className="text-[14px]" style={{ color: 'var(--rm-text-secondary)' }}>Loading...</p>
        </div>
      </PortalLayout>
    );
  }

  if (!issue) {
    return (
      <PortalLayout>
        {breadcrumb}
        <PageHeader title="Issue Not Found" />
        <div className="card text-center py-12">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3" style={{ color: 'var(--rm-text-muted)', opacity: 0.4 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <p className="text-[14px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>
            This issue may have resolved
          </p>
          <p className="text-[12px] mb-4" style={{ color: 'var(--rm-text-muted)' }}>
            No matching issue found in the current {window} window.
          </p>
          <Link
            href="/dashboard"
            className="text-[12px] font-semibold no-underline"
            style={{ color: 'var(--rm-signal)' }}
          >
            Back to Dashboard
          </Link>
        </div>
      </PortalLayout>
    );
  }

  const isGate = issue.failure_type === 'gate_failed';

  return (
    <PortalLayout>
      {breadcrumb}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start gap-3">
          <h1 className="text-[20px] font-bold" style={{ color: 'var(--rm-text)' }}>
            {issue.primary_line}
          </h1>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded uppercase mt-1 flex-shrink-0"
            style={{
              background: isGate ? 'var(--rm-fail)' : 'var(--rm-signal-glow)',
              color: isGate ? '#fff' : 'var(--rm-signal)',
            }}
          >
            {isGate ? 'Gate' : 'Run'}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>
          <span>Target: {issue.scenario_name}</span>
          {issue.scenario_id && (
            <Link
              href={`/dashboard/scenarios/${issue.scenario_id}/edit`}
              className="text-[11px] font-semibold no-underline"
              style={{ color: 'var(--rm-signal)' }}
            >
              View Scenario
            </Link>
          )}
        </div>
      </div>

      {/* Latest Occurrence */}
      {latestOccurrence && (
        <div className="mb-5">
          <h2 className="text-[14px] font-semibold mb-2" style={{ color: 'var(--rm-text)' }}>Latest Occurrence</h2>
          <div
            className="rounded-lg px-4 py-3"
            style={{ border: '1px solid var(--rm-border)', background: 'var(--rm-bg-raised)' }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] font-medium" style={{ color: 'var(--rm-text)' }}>
                {new Date(latestOccurrence.timestamp).toLocaleDateString('en-US', {
                  weekday: 'short', month: 'short', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
              {latestOccurrence.plan_run_id && (
                <Link
                  href={`/dashboard/analytics?plan_id=${latestOccurrence.plan_run_id}`}
                  className="text-[11px] font-semibold no-underline"
                  style={{ color: 'var(--rm-signal)' }}
                >
                  View Analytics
                </Link>
              )}
            </div>
            <div className="text-[12px] mb-1" style={{ color: 'var(--rm-text-secondary)' }}>
              Plan: {latestOccurrence.plan_name}
            </div>
            {latestOccurrence.detail && (
              <div className="text-[11px] font-mono mt-1" style={{ color: 'var(--rm-fail)' }}>
                {latestOccurrence.detail}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Evidence — gate failures only */}
      {isGate && gateResult && (
        <div className="mb-5">
          <h2 className="text-[14px] font-semibold mb-2" style={{ color: 'var(--rm-text)' }}>Evidence</h2>
          <div
            className="rounded-lg px-4 py-3"
            style={{ border: '1px solid var(--rm-border)', background: 'var(--rm-bg-raised)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[13px] font-semibold" style={{ color: 'var(--rm-text)' }}>
                {gateResult.gate_name}
              </span>
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                style={{ background: 'var(--rm-signal-glow)', color: 'var(--rm-signal)' }}
              >
                {gateResult.entity_type}
              </span>
            </div>
            <div className="text-[12px] mb-2" style={{ color: 'var(--rm-text-secondary)' }}>
              Entity: {gateResult.entity_name || gateResult.entity_id}
            </div>
            {gateResult.failed_conditions.length > 0 && (
              <div className="space-y-1 mb-2">
                <div className="text-[11px] font-semibold" style={{ color: 'var(--rm-text-muted)' }}>
                  Failed Conditions
                </div>
                {gateResult.failed_conditions.map((cond, i) => (
                  <div key={i} className="text-[12px] font-mono" style={{ color: 'var(--rm-fail)' }}>
                    {cond}
                  </div>
                ))}
              </div>
            )}
            <div className="text-[10px]" style={{ color: 'var(--rm-text-muted)' }}>
              Last evaluated: {new Date(gateResult.last_evaluated_at).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </div>
          </div>
        </div>
      )}

      {/* Pattern Summary */}
      <div className="mb-5">
        <h2 className="text-[14px] font-semibold mb-2" style={{ color: 'var(--rm-text)' }}>Pattern</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Occurrences" value={String(issue.occurrence_count)} />
          <StatCard label="Plans Affected" value={String(issue.plan_names.length)} />
          <StatCard
            label="First Seen"
            value={oldestOccurrence
              ? new Date(oldestOccurrence.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : '—'}
          />
          <StatCard
            label="Last Seen"
            value={latestOccurrence
              ? new Date(latestOccurrence.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : '—'}
          />
        </div>
        {issue.plan_names.length > 0 && (
          <div className="mt-2 text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>
            Plans: {issue.plan_names.join(', ')}
          </div>
        )}
      </div>

      {/* Occurrence Timeline */}
      <div className="mb-5">
        <h2 className="text-[14px] font-semibold mb-2" style={{ color: 'var(--rm-text)' }}>
          Timeline ({sortedOccurrences.length})
        </h2>
        {sortedOccurrences.length === 0 ? (
          <div className="card text-center py-6">
            <p className="text-[13px]" style={{ color: 'var(--rm-text-muted)' }}>No occurrences recorded.</p>
          </div>
        ) : (
          <div style={{ border: '1px solid var(--rm-border)' }} className="rounded-lg overflow-hidden">
            {sortedOccurrences.map((occ, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-3 text-[12px]"
                style={{
                  borderTop: i > 0 ? '1px solid var(--rm-border)' : undefined,
                  background: i % 2 === 0 ? 'transparent' : 'var(--rm-bg-raised)',
                }}
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <span className="flex-shrink-0" style={{ color: 'var(--rm-text-muted)' }}>
                    {new Date(occ.timestamp).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                  <span className="truncate" style={{ color: 'var(--rm-text-secondary)' }}>
                    {occ.plan_name}
                  </span>
                  {occ.detail && (
                    <span className="truncate text-[11px] font-mono" style={{ color: 'var(--rm-text-muted)' }}>
                      {occ.detail}
                    </span>
                  )}
                </div>
                {occ.plan_run_id && (
                  <Link
                    href={`/dashboard/analytics?plan_id=${occ.plan_run_id}`}
                    className="text-[11px] font-semibold no-underline flex-shrink-0 ml-3"
                    style={{ color: 'var(--rm-signal)' }}
                  >
                    View Analytics
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <div
        className="flex items-center gap-4 px-4 py-3 rounded-lg"
        style={{ border: '1px solid var(--rm-border)', background: 'var(--rm-bg-raised)' }}
      >
        <Link
          href={`/dashboard/analytics?scope=scenario&scenarioId=${issue.scenario_id}`}
          className="text-[12px] font-semibold no-underline"
          style={{ color: 'var(--rm-signal)' }}
        >
          View in Analytics
        </Link>
        {issue.scenario_id && (
          <Link
            href={`/dashboard/scenarios/${issue.scenario_id}/edit`}
            className="text-[12px] font-semibold no-underline"
            style={{ color: 'var(--rm-signal)' }}
          >
            View Scenario
          </Link>
        )}
        <Link
          href="/dashboard"
          className="text-[12px] font-semibold no-underline"
          style={{ color: 'var(--rm-text-muted)' }}
        >
          Back to Dashboard
        </Link>
      </div>
    </PortalLayout>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-lg px-3 py-2.5"
      style={{ border: '1px solid var(--rm-border)', background: 'var(--rm-bg-raised)' }}
    >
      <div className="text-[10px] font-semibold mb-0.5" style={{ color: 'var(--rm-text-muted)' }}>
        {label}
      </div>
      <div className="text-[16px] font-bold" style={{ color: 'var(--rm-text)' }}>
        {value}
      </div>
    </div>
  );
}
