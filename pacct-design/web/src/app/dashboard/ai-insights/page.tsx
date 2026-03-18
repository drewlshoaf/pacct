'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PortalLayout, { PageHeader } from '@/components/layout/PortalLayout';
import { fetchRuns, fetchRunDetail } from '@/lib/api';
import type { RunDetail } from '@/data/types';

const riskColors: Record<string, string> = {
  low: 'var(--rm-pass)',
  medium: 'var(--rm-caution)',
  high: 'var(--rm-fail)',
  critical: 'var(--rm-fail)',
};

const riskBg: Record<string, string> = {
  low: 'rgba(59,167,118,0.08)',
  medium: 'rgba(217,164,65,0.08)',
  high: 'rgba(211,93,93,0.08)',
  critical: 'rgba(211,93,93,0.12)',
};

const priorityColors: Record<string, string> = {
  high: 'var(--rm-fail)',
  medium: 'var(--rm-caution)',
  low: 'var(--rm-text-muted)',
};

export default function AiInsightsPage() {
  const [sortedDetails, setSortedDetails] = useState<RunDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { runs } = await fetchRuns();
      const details: RunDetail[] = [];
      await Promise.all(
        runs.slice(0, 10).map(async (run) => {
          const detail = await fetchRunDetail(run.id);
          if (detail) details.push(detail);
        })
      );
      details.sort((a, b) => {
        const order = { critical: 0, high: 1, medium: 2, low: 3 };
        return (order[a.aiAnalysis.riskAssessment.level] ?? 4) - (order[b.aiAnalysis.riskAssessment.level] ?? 4);
      });
      setSortedDetails(details);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <PortalLayout>
        <PageHeader title="AI Insights" description="AI-powered analysis across all runs" />
        <div className="card text-center py-12">
          <p className="text-[14px]" style={{ color: 'var(--rm-text-secondary)' }}>Loading insights...</p>
        </div>
      </PortalLayout>
    );
  }

  if (sortedDetails.length === 0) {
    return (
      <PortalLayout>
        <PageHeader title="AI Insights" description="AI-powered analysis across all runs" />
        <div className="card text-center py-12">
          <p className="text-[16px] mb-2" style={{ color: 'var(--rm-text-secondary)' }}>No AI insights available</p>
          <p className="text-[13px]" style={{ color: 'var(--rm-text-muted)' }}>Run an evaluation to see AI analysis here.</p>
        </div>
      </PortalLayout>
    );
  }

  // Aggregate stats
  const totalRecs = sortedDetails.reduce((s, d) => s + d.aiAnalysis.recommendations.length, 0);
  const highPriorityRecs = sortedDetails.reduce((s, d) => s + d.aiAnalysis.recommendations.filter(r => r.priority === 'high').length, 0);
  const actionRequiredCount = sortedDetails.filter(d => d.aiAnalysis.actionRequired).length;
  const avgConfidence = Math.round(sortedDetails.reduce((s, d) => s + d.aiAnalysis.confidence, 0) / sortedDetails.length);

  // All recommendations across runs
  const allRecommendations = sortedDetails.flatMap(d =>
    d.aiAnalysis.recommendations.map(r => ({
      ...r,
      runName: d.run.name,
      runId: d.run.id,
      stabilityScore: d.run.stabilityScore,
      riskLevel: d.aiAnalysis.riskAssessment.level,
    }))
  ).sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return (order[a.priority] ?? 3) - (order[b.priority] ?? 3);
  });

  return (
    <PortalLayout>
      <PageHeader title="AI Insights" description="AI-powered analysis across all runs" />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
        <div className="card">
          <div className="text-[12px] mb-2" style={{ color: 'var(--rm-text-muted)' }}>Action Required</div>
          <div className="text-[24px] font-semibold" style={{ color: actionRequiredCount > 0 ? 'var(--rm-fail)' : 'var(--rm-pass)' }}>{actionRequiredCount}</div>
          <div className="text-[11px] mt-1" style={{ color: 'var(--rm-text-muted)' }}>of {sortedDetails.length} runs</div>
        </div>
        <div className="card">
          <div className="text-[12px] mb-2" style={{ color: 'var(--rm-text-muted)' }}>Total Recommendations</div>
          <div className="text-[24px] font-semibold" style={{ color: 'var(--rm-text)' }}>{totalRecs}</div>
          <div className="text-[11px] mt-1" style={{ color: 'var(--rm-fail)' }}>{highPriorityRecs} high priority</div>
        </div>
        <div className="card">
          <div className="text-[12px] mb-2" style={{ color: 'var(--rm-text-muted)' }}>Avg Confidence</div>
          <div className="text-[24px] font-semibold" style={{ color: 'var(--rm-text)' }}>{avgConfidence}%</div>
          <div className="h-1.5 rounded-full mt-2" style={{ background: 'var(--rm-border)' }}>
            <div className="h-1.5 rounded-full" style={{ width: `${avgConfidence}%`, background: 'var(--rm-signal)' }} />
          </div>
        </div>
        <div className="card">
          <div className="text-[12px] mb-2" style={{ color: 'var(--rm-text-muted)' }}>Risk Distribution</div>
          <div className="flex items-center gap-2 mt-1">
            {(['critical', 'high', 'medium', 'low'] as const).map(level => {
              const count = sortedDetails.filter(d => d.aiAnalysis.riskAssessment.level === level).length;
              if (count === 0) return null;
              return (
                <div key={level} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: riskColors[level] }} />
                  <span className="text-[12px] font-medium" style={{ color: riskColors[level] }}>{count} {level}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Per-Run Analysis Cards */}
      <div className="space-y-5 mb-6">
        {sortedDetails.map(detail => {
          const ai = detail.aiAnalysis;
          const run = detail.run;
          return (
            <div key={run.id} className="card" style={{ borderLeft: `3px solid ${riskColors[ai.riskAssessment.level]}` }}>
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <Link href={`/dashboard/analytics?plan_id=${run.id}`} className="text-[16px] font-semibold hover:underline" style={{ color: 'var(--rm-text)' }}>{run.name}</Link>
                  {ai.actionRequired && (
                    <span className="text-[11px] px-2 py-0.5 rounded font-medium" style={{ background: 'rgba(211,93,93,0.12)', color: 'var(--rm-fail)' }}>Action Required</span>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-[11px] px-2 py-0.5 rounded font-medium" style={{ background: riskBg[ai.riskAssessment.level], color: riskColors[ai.riskAssessment.level] }}>{ai.riskAssessment.level} risk</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>Confidence</span>
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--rm-text)' }}>{ai.confidence}%</span>
                  </div>
                </div>
              </div>

              {/* Primary Finding */}
              <div className="px-4 py-3 rounded-lg mb-4" style={{ background: 'var(--rm-bg-raised)' }}>
                <div className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--rm-text-muted)' }}>Primary Finding</div>
                <p className="text-[13px] leading-relaxed" style={{ color: 'var(--rm-text)' }}>{ai.primaryFinding}</p>
              </div>

              {/* Two Column: Observations + Risk */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--rm-text-muted)' }}>Observations</div>
                  <ul className="space-y-1.5">
                    {ai.secondaryObservations.map((obs, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: 'var(--rm-signal)' }} />
                        <span className="text-[12px] leading-relaxed" style={{ color: 'var(--rm-text-secondary)' }}>{obs}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--rm-text-muted)' }}>Risk Assessment</div>
                  <div className="px-3 py-2.5 rounded-lg mb-3" style={{ background: riskBg[ai.riskAssessment.level], border: `1px solid ${riskColors[ai.riskAssessment.level]}25` }}>
                    <p className="text-[12px] leading-relaxed" style={{ color: 'var(--rm-text-secondary)' }}>{ai.riskAssessment.summary}</p>
                  </div>

                  <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--rm-text-muted)' }}>Decision Basis</div>
                  <div className="space-y-2">
                    {ai.decisionSpine.map((spine, i) => (
                      <div key={i} className="text-[12px]">
                        <div className="font-medium mb-0.5" style={{ color: 'var(--rm-text-secondary)' }}>{spine.basis}</div>
                        <div className="flex flex-wrap gap-1.5">
                          {spine.evidencePointers.map((ep, j) => (
                            <span key={j} className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text-muted)' }}>{ep}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div style={{ borderTop: '1px solid var(--rm-border)' }} className="pt-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--rm-text-muted)' }}>Recommendations</div>
                <div className="space-y-2">
                  {ai.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="text-[11px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 mt-0.5" style={{ background: `${priorityColors[rec.priority]}15`, color: priorityColors[rec.priority] }}>{rec.priority}</span>
                      <span className="text-[12px] leading-relaxed" style={{ color: 'var(--rm-text-secondary)' }}>{rec.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Evidence Links */}
              {ai.evidenceLinks.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--rm-border)' }}>
                  {ai.evidenceLinks.map((link, i) => (
                    <Link key={i} href={`/dashboard/analytics?plan_id=${run.id}`} className="text-[11px] px-2 py-1 rounded-md transition-colors hover:bg-[var(--rm-border)] flex items-center gap-1.5" style={{ background: 'rgba(46,139,62,0.08)', color: 'var(--rm-signal)' }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* All Recommendations Summary */}
      <div className="card">
        <h3 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--rm-text)' }}>All Recommendations</h3>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr><th>Priority</th><th>Recommendation</th><th>Run</th><th>Risk</th></tr>
            </thead>
            <tbody>
              {allRecommendations.map((rec, i) => (
                <tr key={i}>
                  <td>
                    <span className="text-[11px] px-2 py-0.5 rounded font-medium" style={{ background: `${priorityColors[rec.priority]}15`, color: priorityColors[rec.priority] }}>{rec.priority}</span>
                  </td>
                  <td><span className="text-[12px]" style={{ color: 'var(--rm-text-secondary)' }}>{rec.text}</span></td>
                  <td><Link href={`/dashboard/analytics?plan_id=${rec.runId}`} className="text-[12px] hover:underline" style={{ color: 'var(--rm-signal)' }}>{rec.runName.split(' ').slice(0, 3).join(' ')}</Link></td>
                  <td><span className="text-[11px]" style={{ color: riskColors[rec.riskLevel] }}>{rec.riskLevel}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PortalLayout>
  );
}
