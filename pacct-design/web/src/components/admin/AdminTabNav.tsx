'use client';

import type { ReactNode } from 'react';

export interface AdminTab {
  key: string;
  label: string;
  icon: ReactNode;
}

interface AdminTabNavProps {
  tabs: AdminTab[];
  activeTab: string;
  onTabChange: (key: string) => void;
}

export default function AdminTabNav({ tabs, activeTab, onTabChange }: AdminTabNavProps) {
  return (
    <div className="w-48 flex-shrink-0">
      <nav className="space-y-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-left transition-colors"
            style={
              activeTab === tab.key
                ? { background: 'var(--rm-signal-glow)', color: 'var(--rm-signal)' }
                : { color: 'var(--rm-text-secondary)' }
            }
          >
            <span style={{ opacity: activeTab === tab.key ? 1 : 0.6 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
