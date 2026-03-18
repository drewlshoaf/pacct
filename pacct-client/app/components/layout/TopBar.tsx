'use client';

import { ThemeToggle } from '@/app/contexts/ThemeContext';
import { config } from '@/app/config';

export default function TopBar({ title }: { title?: string }) {
  return (
    <header
      className="sticky top-0 z-40 h-14 px-6 flex items-center justify-between backdrop-blur-md"
      style={{ background: 'var(--pacct-chrome-bg)', borderBottom: '1px solid var(--pacct-border)' }}
    >
      <div className="flex items-center gap-3">
        {title && (
          <h1 className="text-[16px] font-semibold" style={{ color: 'var(--pacct-text)' }}>
            {title}
          </h1>
        )}
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle size="sm" />
        <span className="text-[12px]" style={{ color: 'var(--pacct-text-muted)' }}>
          v{config.version}
        </span>
      </div>
    </header>
  );
}
