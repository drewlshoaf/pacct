'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { RunEvent } from '@/data/types';

const severityStyle: Record<string, { bg: string; text: string; dot: string }> = {
  info: { bg: 'var(--rm-signal-glow)', text: 'var(--rm-text-secondary)', dot: 'var(--rm-signal)' },
  warning: { bg: 'rgba(217,164,65,0.08)', text: 'var(--rm-caution)', dot: 'var(--rm-caution)' },
  critical: { bg: 'rgba(211,93,93,0.08)', text: 'var(--rm-fail)', dot: 'var(--rm-fail)' },
};

const typeLabels: Record<string, string> = {
  ramp: 'Ramp',
  saturation: 'Sat',
  'error-spike': 'Err',
  recovery: 'Rec',
  'threshold-breach': 'Breach',
  stabilization: 'Stable',
};

function formatBucket(bucket: number): string {
  return `B${bucket}`;
}

export default function LiveEventFeed({ events }: { events: RunEvent[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevCount = useRef(0);

  // Auto-scroll to top when new events arrive (newest first)
  useEffect(() => {
    if (events.length > prevCount.current && containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    prevCount.current = events.length;
  }, [events.length]);

  // Display newest events first
  const sortedEvents = [...events].reverse();

  return (
    <div className="card">
      <h3 className="text-[14px] font-semibold mb-3" style={{ color: 'var(--rm-text)' }}>Live Events</h3>
      <div ref={containerRef} className="space-y-1.5" style={{ maxHeight: '260px', overflowY: 'auto' }}>
        {events.length === 0 ? (
          <div className="text-[13px] py-6 text-center" style={{ color: 'var(--rm-text-muted)' }}>
            Waiting for events...
          </div>
        ) : (
          sortedEvents.map((event, i) => {
            const sev = severityStyle[event.severity] || severityStyle.info;
            const isNew = i === 0;
            return (
              <div
                key={event.id}
                className="flex items-start gap-3 px-3 py-2 rounded-lg transition-all"
                style={{
                  background: sev.bg,
                  animation: isNew ? 'fade-up 0.3s ease-out' : undefined,
                }}
              >
                {/* Dot */}
                <span className="w-[7px] h-[7px] rounded-full flex-shrink-0 mt-1.5" style={{ background: sev.dot }} />

                {/* Time */}
                <span className="text-[11px] font-mono flex-shrink-0 mt-0.5" style={{ color: 'var(--rm-text-muted)', minWidth: 36 }}>
                  {formatBucket(event.bucket)}
                </span>

                {/* Type badge */}
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
                  style={{ background: 'var(--rm-bg-raised)', color: sev.text }}
                >
                  {typeLabels[event.type] || event.type}
                </span>

                {/* Content */}
                <div className="min-w-0 flex items-center gap-2">
                  <span className="text-[12px] font-medium" style={{ color: sev.text }}>{event.title}</span>
                  <span className="text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>{event.description}</span>
                  {event.link && (
                    <Link
                      href={event.link.href}
                      className="text-[11px] font-medium px-2 py-0.5 rounded no-underline transition-colors"
                      style={{ background: 'var(--rm-signal)', color: 'var(--rm-bg-void)' }}
                    >
                      {event.link.label}
                    </Link>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
