'use client';

import { useState, useEffect } from 'react';

export function DiscoveryLayout({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('pacct-ds-theme');
    if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('pacct-ds-theme', next ? 'dark' : 'light');
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b backdrop-blur-md" style={{ background: 'var(--pacct-bg-surface)', borderColor: 'var(--pacct-border)' }}>
        <div className="max-w-[1152px] mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <a href="/" className="flex items-center gap-2.5 font-semibold text-lg no-underline" style={{ color: 'var(--pacct-text)' }}>
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-white text-sm font-bold" style={{ background: 'linear-gradient(135deg, #D4553A, #E88C30)' }}>
              P
            </span>
            <span>PACCT <span style={{ color: 'var(--pacct-text-muted)' }} className="font-normal">Discovery</span></span>
          </a>
          <div className="flex items-center gap-3">
            <nav className="flex items-center gap-1">
              <a href="/" className="text-sm px-3 py-1.5 rounded-lg transition-colors" style={{ color: 'var(--pacct-text-secondary)' }}>
                Dashboard
              </a>
              <a href="/health" className="text-sm px-3 py-1.5 rounded-lg transition-colors" style={{ color: 'var(--pacct-text-secondary)' }}>
                Health
              </a>
              <a href="/presence" className="text-sm px-3 py-1.5 rounded-lg transition-colors" style={{ color: 'var(--pacct-text-secondary)' }}>
                Presence
              </a>
            </nav>
            <button
              onClick={toggleTheme}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: 'var(--pacct-text-muted)', background: 'var(--pacct-bg-raised)' }}
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {dark ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-[1152px] mx-auto w-full px-4 sm:px-6 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t py-4 text-center" style={{ borderColor: 'var(--pacct-border)' }}>
        <p className="text-xs" style={{ color: 'var(--pacct-text-muted)' }}>
          PACCT Discovery Server v1.0.0
        </p>
      </footer>
    </div>
  );
}
