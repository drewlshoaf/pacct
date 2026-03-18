'use client';

import { RunEvent } from '@/data/types';

const sevColors: Record<string, { bg: string; text: string; dot: string }> = {
  info: { bg: 'var(--rm-signal-glow)', text: 'var(--rm-text-secondary)', dot: 'var(--rm-signal)' },
  warning: { bg: 'rgba(217,164,65,0.08)', text: 'var(--rm-caution)', dot: 'var(--rm-caution)' },
  critical: { bg: 'rgba(211,93,93,0.08)', text: 'var(--rm-fail)', dot: 'var(--rm-fail)' },
};

const typeLabels: Record<string, string> = { ramp: 'Ramp', saturation: 'Sat', 'error-spike': 'Err', recovery: 'Rec', 'threshold-breach': 'Breach', stabilization: 'Stable' };

export default function EventTimeline({ events, onEventClick }: { events: RunEvent[]; onEventClick: (t: number) => void }) {
  return (
    <div className="space-y-2">
      {events.map(e => {
        const c = sevColors[e.severity] || sevColors.info;
        return (
          <button key={e.id} onClick={() => onEventClick(e.timestamp)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left" style={{ background: c.bg }}>
            <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
            <span className="text-[12px] font-mono flex-shrink-0 w-12" style={{ color: 'var(--rm-text-muted)' }}>B{e.bucket}</span>
            <span className="text-[11px] font-medium px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: 'var(--rm-signal-glow)', color: c.text }}>{typeLabels[e.type] || e.type}</span>
            <span className="text-[13px] font-medium flex-1 truncate" style={{ color: 'var(--rm-text)' }}>{e.title}</span>
            <span className="text-[12px] hidden xl:block truncate max-w-[300px]" style={{ color: 'var(--rm-text-muted)' }}>{e.description}</span>
          </button>
        );
      })}
    </div>
  );
}
