'use client';

import { AiAnalysis } from '@/data/types';

const riskC: Record<string, { bg: string; text: string }> = {
  low: { bg: 'var(--rm-signal-glow)', text: 'var(--rm-pass)' }, medium: { bg: 'rgba(217,164,65,0.12)', text: 'var(--rm-caution)' },
  high: { bg: 'rgba(211,93,93,0.12)', text: 'var(--rm-fail)' }, critical: { bg: 'rgba(211,93,93,0.2)', text: 'var(--rm-fail)' },
};
const prioC: Record<string, string> = { high: 'var(--rm-fail)', medium: 'var(--rm-caution)', low: 'var(--rm-pass)' };

export default function AiPanel({ analysis, onClose, onEvidenceClick, embedded }: { analysis: AiAnalysis; onClose?: () => void; onEvidenceClick: (t: number) => void; embedded?: boolean }) {
  const risk = riskC[analysis.riskAssessment.level] || riskC.medium;
  const content = (
    <>
      {/* Header */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--rm-signal)" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
            <span className="text-[14px] font-semibold" style={{ color: 'var(--rm-text)' }}>AI Analysis</span>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-1 rounded transition-colors hover:bg-[var(--rm-bg-raised)]" style={{ color: 'var(--rm-text-muted)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          )}
        </div>
        <div className="flex gap-2 mb-4">
          <span className="text-[11px] font-semibold px-2 py-1 rounded" style={{ background: analysis.testGoalMet ? 'var(--rm-signal-glow)' : 'rgba(211,93,93,0.12)', color: analysis.testGoalMet ? 'var(--rm-pass)' : 'var(--rm-fail)' }}>
            {analysis.testGoalMet ? 'TEST GOAL MET' : 'TEST GOAL NOT MET'}
          </span>
          <span className="text-[11px] font-semibold px-2 py-1 rounded" style={{ background: analysis.actionRequired ? 'rgba(211,93,93,0.12)' : 'var(--rm-signal-glow)', color: analysis.actionRequired ? 'var(--rm-fail)' : 'var(--rm-pass)' }}>
            {analysis.actionRequired ? 'ACTION REQUIRED' : 'NO ACTION REQUIRED'}
          </span>
        </div>
        <div className="mb-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium" style={{ color: 'var(--rm-text-muted)' }}>CONFIDENCE</span>
            <span className="text-[13px] font-semibold" style={{ color: 'var(--rm-text)' }}>{analysis.confidence}%</span>
          </div>
          <div className="h-1.5 rounded-full" style={{ background: 'var(--rm-border)' }}>
            <div className="h-1.5 rounded-full transition-all" style={{ width: `${analysis.confidence}%`, background: analysis.confidence >= 80 ? 'var(--rm-pass)' : analysis.confidence >= 60 ? 'var(--rm-caution)' : 'var(--rm-fail)' }} />
          </div>
        </div>
      </div>

      {/* Primary Finding */}
      <div className="card">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--rm-text-muted)' }}>Primary Finding</h4>
        <p className="text-[13px] leading-relaxed" style={{ color: 'var(--rm-text)' }}>{analysis.primaryFinding}</p>
      </div>

      {/* Secondary Observations */}
      <div className="card">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--rm-text-muted)' }}>Secondary Observations</h4>
        <ul className="space-y-2">
          {analysis.secondaryObservations.map((obs, i) => (
            <li key={i} className="flex gap-2 text-[13px]" style={{ color: 'var(--rm-text-secondary)' }}><span style={{ color: 'var(--rm-signal)' }}>-</span><span>{obs}</span></li>
          ))}
        </ul>
      </div>

      {/* Risk Assessment */}
      <div className="card">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--rm-text-muted)' }}>Risk Assessment</h4>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded" style={{ background: risk.bg, color: risk.text }}>{analysis.riskAssessment.level}</span>
        </div>
        <p className="text-[13px]" style={{ color: 'var(--rm-text-secondary)' }}>{analysis.riskAssessment.summary}</p>
      </div>

      {/* Recommendations */}
      <div className="card">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--rm-text-muted)' }}>Recommendations</h4>
        <ul className="space-y-2">
          {analysis.recommendations.map((rec, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded mt-0.5 flex-shrink-0" style={{ color: prioC[rec.priority], background: rec.priority === 'high' ? 'rgba(211,93,93,0.08)' : rec.priority === 'medium' ? 'rgba(217,164,65,0.08)' : 'var(--rm-signal-glow)' }}>{rec.priority}</span>
              <span className="text-[13px]" style={{ color: 'var(--rm-text-secondary)' }}>{rec.text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Most Likely Constraint */}
      {analysis.mostLikelyConstraint && (
        <div className="card">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--rm-text-muted)' }}>Most Likely Constraint</h4>
          <p className="text-[13px] font-medium mb-2" style={{ color: 'var(--rm-caution)' }}>{analysis.mostLikelyConstraint.replace(/_/g, ' ')}</p>
          {analysis.mostLikelyConstraintEvidence && analysis.mostLikelyConstraintEvidence.length > 0 && (
            <ul className="space-y-1.5">
              {analysis.mostLikelyConstraintEvidence.map((ev, i) => (
                <li key={i} className="flex gap-2 text-[12px]" style={{ color: 'var(--rm-text-secondary)' }}>
                  <span className="mt-0.5 flex-shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--rm-caution)' }} />
                  <span>{ev}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Decision Spine */}
      <div className="card">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--rm-text-muted)' }}>Decision Spine</h4>
        <div className="space-y-3">
          {analysis.decisionSpine.map((item, i) => (
            <div key={i}>
              <p className="text-[13px] font-medium mb-1" style={{ color: 'var(--rm-text)' }}>{item.basis}</p>
              <ul className="space-y-0.5 ml-3">
                {item.evidencePointers.map((ptr, j) => (
                  <li key={j} className="text-[12px] flex items-center gap-1.5" style={{ color: 'var(--rm-text-muted)' }}><span style={{ color: 'var(--rm-signal)' }}>&#8226;</span>{ptr}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Evidence Links */}
      <div className="card">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--rm-text-muted)' }}>Evidence Links</h4>
        <div className="space-y-1">
          {analysis.evidenceLinks.map((link, i) => (
            <button key={i} onClick={() => link.timestamp && onEvidenceClick(link.timestamp)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-all hover:bg-[var(--rm-signal-glow)]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--rm-signal)" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <span className="text-[12px]" style={{ color: 'var(--rm-signal)' }}>{link.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );

  if (embedded) return <div className="space-y-4">{content}</div>;

  return (
    <div className="sticky top-14 space-y-4" style={{ maxHeight: 'calc(100vh - 80px)', overflowY: 'auto' }}>
      {content}
    </div>
  );
}
