'use client';

import type { ReactNode } from 'react';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { PANE_TITLES, PANE_SUBTITLES, type ChartPaneId } from './chartColors';

interface Props {
  id: ChartPaneId;
  collapsed: boolean;
  onToggleCollapse: () => void;
  toggleButtons?: ReactNode;
  dragHandleProps?: SyntheticListenerMap;
  children: ReactNode;
}

export default function CollapsibleChartPane({
  id,
  collapsed,
  onToggleCollapse,
  toggleButtons,
  dragHandleProps,
  children,
}: Props) {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: '1px solid var(--rm-border)', background: 'var(--rm-bg-surface)' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ borderBottom: collapsed ? 'none' : '1px solid var(--rm-border)', background: 'var(--rm-bg-raised)' }}
      >
        {/* Drag handle */}
        <button
          type="button"
          className="flex-shrink-0 cursor-grab active:cursor-grabbing p-0.5 rounded transition-colors hover:bg-white/5"
          style={{ color: 'var(--rm-text-muted)' }}
          {...dragHandleProps}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="8" cy="4" r="2" /><circle cx="16" cy="4" r="2" />
            <circle cx="8" cy="12" r="2" /><circle cx="16" cy="12" r="2" />
            <circle cx="8" cy="20" r="2" /><circle cx="16" cy="20" r="2" />
          </svg>
        </button>

        {/* Title + subtitle */}
        <span className="text-[12px] font-semibold" style={{ color: 'var(--rm-text-secondary)' }}>
          {PANE_TITLES[id]}
        </span>
        <span className="text-[10px]" style={{ color: 'var(--rm-text-muted)', opacity: 0.7 }}>
          {PANE_SUBTITLES[id]}
        </span>

        {/* Toggle buttons */}
        {!collapsed && toggleButtons && (
          <div className="flex items-center gap-1 ml-2">
            {toggleButtons}
          </div>
        )}

        <div className="flex-1" />

        {/* Collapse chevron */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex-shrink-0 p-1 rounded transition-colors hover:bg-white/5"
          style={{ color: 'var(--rm-text-muted)' }}
        >
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            className="transition-transform"
            style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {/* Chart body */}
      {!collapsed && (
        <div className="px-3 py-2">
          {children}
        </div>
      )}
    </div>
  );
}
