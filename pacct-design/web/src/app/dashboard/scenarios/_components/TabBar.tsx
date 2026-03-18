'use client';

export interface Tab {
  id: string;
  label: string;
  badge?: string | number;
}

interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  size?: 'sm' | 'md';
  sticky?: boolean;
}

export default function TabBar({ tabs, activeTab, onTabChange, size = 'md', sticky }: TabBarProps) {
  const isSm = size === 'sm';

  return (
    <div
      className={`flex gap-0 ${sticky ? 'sticky top-0 z-10' : ''}`}
      style={{
        background: isSm ? 'var(--rm-bg-raised)' : 'var(--rm-bg-surface)',
        borderBottom: '1px solid var(--rm-border)',
      }}
    >
      {tabs.map(tab => {
        const active = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`relative ${isSm ? 'text-[12px] px-3 py-2' : 'text-[13px] px-4 py-3'} font-medium transition-colors`}
            style={{
              color: active ? 'var(--rm-signal)' : 'var(--rm-text-muted)',
              borderBottom: active ? '2px solid var(--rm-signal)' : '2px solid transparent',
            }}
          >
            {tab.label}
            {tab.badge !== undefined && (
              <span
                className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full"
                style={{
                  background: 'var(--rm-signal-glow)',
                  color: 'var(--rm-signal)',
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
