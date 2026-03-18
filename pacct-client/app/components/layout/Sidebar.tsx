'use client';

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SIDEBAR_STATE_KEY = 'pacct-sidebar-collapsed';

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

const coreNavigation: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    label: 'Networks',
    href: '/dashboard/networks',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5" r="3" />
        <circle cx="5" cy="19" r="3" />
        <circle cx="19" cy="19" r="3" />
        <line x1="12" y1="8" x2="5" y2="16" />
        <line x1="12" y1="8" x2="19" y2="16" />
      </svg>
    ),
  },
  {
    label: 'Spec Studio',
    href: '/dashboard/specs',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
];

const adminNavigation: NavItem[] = [
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 5 15.6" />
      </svg>
    ),
  },
];

// NavLink with left accent bar
function NavLink({ item, active, isCollapsed }: { item: NavItem; active: boolean; isCollapsed: boolean }) {
  return (
    <Link
      href={item.href}
      title={isCollapsed ? item.label : undefined}
      className={`relative flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'} px-3 py-2 rounded-lg text-[13px] mb-0.5 transition-all`}
      style={active ? { background: 'var(--pacct-signal-glow)', color: 'var(--pacct-text)' } : { color: 'var(--pacct-text-secondary)' }}
    >
      {active && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full"
          style={{ height: '16px', background: 'var(--pacct-signal)' }}
        />
      )}
      <span style={{ opacity: active ? 1 : 0.7 }}>{item.icon}</span>
      {!isCollapsed && <span>{item.label}</span>}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const s = localStorage.getItem(SIDEBAR_STATE_KEY);
    if (s !== null) setIsCollapsed(s === 'true');
  }, []);

  const toggleCollapsed = () => {
    const n = !isCollapsed;
    setIsCollapsed(n);
    localStorage.setItem(SIDEBAR_STATE_KEY, String(n));
    window.dispatchEvent(new CustomEvent('sidebar-toggle'));
  };

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  return (
    <aside
      className={`fixed top-0 left-0 bottom-0 flex flex-col z-50 transition-all duration-300 backdrop-blur-md ${
        isCollapsed ? 'w-[72px]' : 'w-[180px]'
      }`}
      style={{ background: 'var(--pacct-chrome-bg)', borderRight: '1px solid var(--pacct-border)' }}
    >
      {/* Brand Row */}
      <div
        className={`px-4 py-3 flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'}`}
        style={{ minHeight: '52px' }}
      >
        <Link href="/dashboard" className="flex items-center gap-2 min-w-0 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-coral-500 to-coral-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            P
          </div>
          {!isCollapsed && (
            <span className="text-[13px] font-semibold tracking-tight" style={{ color: 'var(--pacct-text)' }}>
              PACCT
            </span>
          )}
        </Link>
        {!isCollapsed && <div className="flex-1" />}
        <button
          onClick={toggleCollapsed}
          className="p-1.5 rounded-lg transition-colors flex-shrink-0"
          style={{ color: 'var(--pacct-text-muted)' }}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="13 17 18 12 13 7" />
              <polyline points="6 17 11 12 6 7" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="11 17 6 12 11 7" />
              <polyline points="18 17 13 12 18 7" />
            </svg>
          )}
        </button>
      </div>

      {/* Divider */}
      <div className="mx-3" style={{ borderTop: '1px solid var(--pacct-border)' }} />

      {/* Navigation */}
      <nav className="flex-1 pt-2 pb-4 px-3 overflow-y-auto">
        {coreNavigation.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} isCollapsed={isCollapsed} />
        ))}

        {/* Admin divider */}
        <div className="my-3 mx-1" style={{ borderTop: '1px solid var(--pacct-border)' }}>
          {!isCollapsed && (
            <div className="text-[10px] font-semibold uppercase tracking-wider mt-2.5 mb-1 px-2" style={{ color: 'var(--pacct-text-muted)' }}>
              Admin
            </div>
          )}
        </div>

        {adminNavigation.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} isCollapsed={isCollapsed} />
        ))}
      </nav>

      {/* Footer: Node Identity */}
      <div style={{ borderTop: '1px solid var(--pacct-border)' }}>
        {!isCollapsed && (
          <div className="px-4 pt-3 pb-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--pacct-text-muted)' }}>
              Node
            </div>
            <div className="text-[12px] font-medium truncate font-mono" style={{ color: 'var(--pacct-text-secondary)' }}>
              Local
            </div>
          </div>
        )}
        <div className="px-4 pb-4 pt-2">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'} px-2 py-2`}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0" style={{ background: 'var(--pacct-signal)', color: 'var(--pacct-bg-void)' }}>
              N
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0 text-left">
                <div className="text-[13px] font-medium truncate" style={{ color: 'var(--pacct-text)' }}>Node</div>
                <div className="text-[11px]" style={{ color: 'var(--pacct-text-muted)' }}>v1.0</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
