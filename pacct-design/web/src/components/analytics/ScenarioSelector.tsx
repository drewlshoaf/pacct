'use client';

import { useState, useRef, useEffect } from 'react';
import type { ScenarioNameEntry } from '@/lib/api';

interface ScenarioSelectorProps {
  scenarios: ScenarioNameEntry[];
  selected: string | null;
  onSelect: (name: string | null) => void;
  loading: boolean;
}

export default function ScenarioSelector({ scenarios, selected, onSelect, loading }: ScenarioSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const label = selected ?? 'All Runs';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 14px',
          background: 'var(--rm-bg-raised)',
          border: '1px solid var(--rm-border)',
          borderRadius: '8px',
          color: selected ? 'var(--rm-text)' : 'var(--rm-text-secondary)',
          fontSize: '13px',
          cursor: loading ? 'default' : 'pointer',
          opacity: loading ? 0.5 : 1,
          whiteSpace: 'nowrap',
          maxWidth: '260px',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '4px',
            minWidth: '240px',
            maxHeight: '360px',
            overflowY: 'auto',
            background: 'var(--rm-bg-raised)',
            border: '1px solid var(--rm-border)',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            zIndex: 50,
            padding: '4px 0',
          }}
        >
          {/* All Runs option */}
          <button
            onClick={() => { onSelect(null); setOpen(false); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '8px 14px',
              background: selected === null ? 'var(--rm-signal-glow)' : 'transparent',
              border: 'none',
              color: selected === null ? 'var(--rm-signal)' : 'var(--rm-text)',
              fontSize: '13px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => { if (selected !== null) e.currentTarget.style.background = 'var(--rm-bg-hover)'; }}
            onMouseLeave={(e) => { if (selected !== null) e.currentTarget.style.background = 'transparent'; }}
          >
            <span>All Runs</span>
            {selected === null && (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 7L6 10L11 4" stroke="var(--rm-signal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>

          {/* Divider */}
          <div style={{ height: '1px', background: 'var(--rm-border)', margin: '4px 0' }} />

          {/* Scenario list */}
          {scenarios.length === 0 ? (
            <div style={{ padding: '12px 14px', color: 'var(--rm-text-muted)', fontSize: '12px' }}>
              No scenarios with runs
            </div>
          ) : (
            scenarios.map((s) => (
              <button
                key={s.name}
                onClick={() => { onSelect(s.name); setOpen(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '8px 14px',
                  background: selected === s.name ? 'var(--rm-signal-glow)' : 'transparent',
                  border: 'none',
                  color: selected === s.name ? 'var(--rm-signal)' : 'var(--rm-text)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  gap: '8px',
                }}
                onMouseEnter={(e) => { if (selected !== s.name) e.currentTarget.style.background = 'var(--rm-bg-hover)'; }}
                onMouseLeave={(e) => { if (selected !== s.name) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{s.name}</span>
                <span style={{ color: 'var(--rm-text-muted)', fontSize: '11px', flexShrink: 0 }}>
                  {s.run_count} run{s.run_count !== 1 ? 's' : ''}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
