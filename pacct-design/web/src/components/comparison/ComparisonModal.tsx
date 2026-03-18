'use client';

import { useState, useEffect } from 'react';
import { fetchRuns } from '@/lib/api';
import type { Run } from '@/data/types';

export default function ComparisonModal({ currentRunId, onSelect, onClose }: { currentRunId: string; onSelect: (id: string) => void; onClose: () => void }) {
  const [available, setAvailable] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRuns().then(result => {
      setAvailable(result.runs.filter(r => r.id !== currentRunId));
      setLoading(false);
    });
  }, [currentRunId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-lg rounded-xl p-6" style={{ background: 'var(--rm-bg-surface)', border: '1px solid var(--rm-border)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-semibold" style={{ color: 'var(--rm-text)' }}>Compare Run</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--rm-bg-raised)]" style={{ color: 'var(--rm-text-muted)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <p className="text-[13px] mb-4" style={{ color: 'var(--rm-text-muted)' }}>Select a run to overlay as a dashed comparison line.</p>
        {loading ? (
          <p className="text-[13px] text-center py-4" style={{ color: 'var(--rm-text-muted)' }}>Loading runs...</p>
        ) : available.length === 0 ? (
          <p className="text-[13px] text-center py-4" style={{ color: 'var(--rm-text-muted)' }}>No other runs available for comparison.</p>
        ) : (
          <div className="space-y-2">
            {available.map(run => (
              <button key={run.id} onClick={() => onSelect(run.id)} className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-all hover:bg-[var(--rm-signal-glow)]" style={{ border: '1px solid var(--rm-border)' }}>
                <div>
                  <div className="text-[14px] font-medium" style={{ color: 'var(--rm-text)' }}>{run.name}</div>
                  <div className="text-[12px] mt-0.5" style={{ color: 'var(--rm-text-muted)' }}>{run.planName} &middot; {run.environment} &middot; Stability: {run.stabilityScore}</div>
                </div>
                <span className="text-[12px] font-medium tabular-nums" style={{ color: run.stabilityScore >= 80 ? 'var(--rm-pass)' : run.stabilityScore >= 60 ? 'var(--rm-caution)' : 'var(--rm-fail)' }}>{run.stabilityScore}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
