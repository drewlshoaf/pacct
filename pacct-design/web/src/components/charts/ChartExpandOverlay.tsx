'use client';

import { useEffect, useCallback, type ReactNode } from 'react';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export default function ChartExpandOverlay({ title, onClose, children }: Props) {
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        overflow: 'auto',
        padding: '24px 0',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '90vw',
          maxWidth: 1400,
          background: 'var(--rm-bg-surface)',
          borderRadius: 16,
          border: '1px solid var(--rm-border)',
          padding: '24px 28px 20px',
          cursor: 'default',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-[14px] font-semibold" style={{ color: 'var(--rm-text)' }}>{title}</span>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
            style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text-muted)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
