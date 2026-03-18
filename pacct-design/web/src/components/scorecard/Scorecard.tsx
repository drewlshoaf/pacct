'use client';

import { Scorecard as ScorecardType } from '@/data/types';

interface ScorecardProps {
  scorecard: ScorecardType;
  policyMode?: string;
}

export default function Scorecard({ scorecard }: ScorecardProps) {
  const scoreColor = scorecard.overallScore >= 80 ? 'var(--rm-pass)' : scorecard.overallScore >= 60 ? 'var(--rm-caution)' : 'var(--rm-fail)';

  return (
    <div className="card">
      <h3 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--rm-text)' }}>Scorecard</h3>
      <div className="flex items-center gap-4 mb-4 pb-4" style={{ borderBottom: '1px solid var(--rm-border)' }}>
        <div className="w-16 h-16 rounded-xl flex items-center justify-center text-[24px] font-bold" style={{ background: scorecard.overallScore >= 80 ? 'var(--rm-signal-glow)' : scorecard.overallScore >= 60 ? 'rgba(217,164,65,0.08)' : 'rgba(211,93,93,0.08)', color: scoreColor }}>{scorecard.overallScore}</div>
        <div><div className="text-[13px] font-medium" style={{ color: 'var(--rm-text)' }}>Overall Score</div><div className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>Weighted composite</div></div>
      </div>
      <div className="space-y-3">
        {scorecard.categories.map(cat => {
          const c = cat.score >= 80 ? 'var(--rm-pass)' : cat.score >= 60 ? 'var(--rm-caution)' : 'var(--rm-fail)';
          return (
            <div key={cat.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[13px]" style={{ color: 'var(--rm-text-secondary)' }}>{cat.name}</span>
                <div className="flex items-center gap-2"><span className="text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>{Math.round(cat.weight * 100)}%</span><span className="text-[13px] font-semibold" style={{ color: c }}>{cat.score}</span></div>
              </div>
              <div className="h-1 rounded-full" style={{ background: 'var(--rm-border)' }}><div className="h-1 rounded-full" style={{ width: `${cat.score}%`, background: c }} /></div>
            </div>
          );
        })}
      </div>
      {scorecard.penalties.length > 0 && (
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--rm-border)' }}>
          <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--rm-text-muted)' }}>Penalties</h4>
          {scorecard.penalties.map((p, i) => (
            <div key={i} className="flex items-center justify-between py-1">
              <span className="text-[12px]" style={{ color: 'var(--rm-text-secondary)' }}>{p.reason}</span>
              <span className="text-[12px] font-semibold" style={{ color: 'var(--rm-fail)' }}>-{p.amount}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
