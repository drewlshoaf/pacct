'use client';

import { ReactNode, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const SIDEBAR_STATE_KEY = 'sv-sidebar-collapsed';

interface NavItem { label: string; href: string; icon: ReactNode; }

const coreNavigation: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg> },
  { label: 'Scenarios', href: '/dashboard/scenarios', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg> },
  { label: 'Plans', href: '/dashboard/plans', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg> },
  { label: 'Live', href: '/dashboard/live', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" /><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.4" /><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.4" /><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" /><circle cx="12" cy="12" r="2" /></svg> },
  { label: 'Analytics', href: '/dashboard/analytics', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg> },
  { label: 'Gates', href: '/dashboard/gates', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg> },
];

const adminNavigation: NavItem[] = [
  { label: 'Workspace', href: '/dashboard/workspace', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 5 15.6" /></svg> },
  { label: 'Organization', href: '/dashboard/organization', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> },
  { label: 'Platform', href: '/dashboard/platform', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" /><rect x="2" y="14" width="20" height="8" rx="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" /></svg> },
];

// ─── Context label for admin pages ───────────────────────────────────────

function getContextLabel(pathname: string): string | null {
  if (pathname.startsWith('/dashboard/workspace')) return 'Workspace Settings';
  if (pathname.startsWith('/dashboard/organization')) return 'Organization';
  if (pathname.startsWith('/dashboard/platform')) return 'Platform';
  if (pathname.startsWith('/dashboard/profile')) return 'Profile';
  return null;
}

// ─── Logo ────────────────────────────────────────────────────────────────

function SvLogo() {
  return (
    <div className="flex items-center justify-center flex-shrink-0">
      <Image
        src="/android-chrome-192x192.png"
        alt="Runtime Max"
        width={28}
        height={28}
        className="rounded-lg"
        priority
      />
    </div>
  );
}

export function Logo() {
  return <SvLogo />;
}

// ─── NavLink with left accent bar ────────────────────────────────────────

function NavLink({ item, active, isCollapsed, onMobileClose }: { item: NavItem; active: boolean; isCollapsed: boolean; onMobileClose?: () => void }) {
  return (
    <Link
      href={item.href}
      title={isCollapsed ? item.label : undefined}
      onClick={onMobileClose}
      className={`relative flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'} px-3 py-2 rounded-lg text-[13px] mb-0.5 transition-all`}
      style={active ? { background: 'var(--rm-signal-glow)', color: 'var(--rm-text)' } : { color: 'var(--rm-text-secondary)' }}
    >
      {active && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full"
          style={{ height: '16px', background: 'var(--rm-signal)' }}
        />
      )}
      <span style={{ opacity: active ? 1 : 0.7 }}>{item.icon}</span>
      {!isCollapsed && <span>{item.label}</span>}
    </Link>
  );
}

// ─── Operator Menu (Zone 5: Footer Utility) ──────────────────────────────

const operatorMenuLinks: { label: string; href: string; icon: ReactNode }[] = [
  { label: 'Profile', href: '/dashboard/profile', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> },
  { label: 'Help & Docs', href: '/docs', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg> },
];

function OperatorMenu({ isCollapsed }: { isCollapsed: boolean }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <div className="relative" style={{ borderTop: '1px solid var(--rm-border)' }} ref={menuRef}>
      {/* Workspace label */}
      {!isCollapsed && (
        <div className="px-4 pt-3 pb-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--rm-text-muted)' }}>Workspace</div>
          <div className="text-[12px] font-medium truncate" style={{ color: 'var(--rm-text-secondary)' }}>Default</div>
        </div>
      )}

      {open && (
        <div
          className="absolute bottom-full left-2 right-2 mb-2 rounded-xl overflow-hidden shadow-xl"
          style={{ background: 'var(--rm-bg-surface)', border: '1px solid var(--rm-border)', minWidth: isCollapsed ? 200 : undefined, left: isCollapsed ? 4 : undefined }}
        >
          {/* Header */}
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--rm-border)' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: 'var(--rm-signal)', color: 'var(--rm-bg-void)' }}>OP</div>
              <div className="min-w-0">
                <div className="text-[13px] font-medium truncate" style={{ color: 'var(--rm-text)' }}>Operator</div>
                <div className="text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>Runtime Max v0.1</div>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="py-1.5">
            {operatorMenuLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 mx-1.5 rounded-lg text-[13px] transition-colors no-underline"
                style={{ color: 'var(--rm-text-secondary)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--rm-signal-glow)'; e.currentTarget.style.color = 'var(--rm-text)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--rm-text-secondary)'; }}
              >
                <span style={{ opacity: 0.7 }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Sign Out */}
          <div className="px-3 py-2" style={{ borderTop: '1px solid var(--rm-border)' }}>
            <button
              className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[12px] transition-colors text-left"
              style={{ color: 'var(--rm-text-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,59,48,0.08)'; e.currentTarget.style.color = 'var(--rm-fail)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--rm-text-muted)'; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      <div className="px-4 pb-4 pt-2">
        <button
          onClick={() => setOpen(!open)}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'} px-2 py-2 rounded-lg transition-colors cursor-pointer`}
          style={{ background: open ? 'var(--rm-signal-glow)' : 'transparent' }}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0" style={{ background: 'var(--rm-signal)', color: 'var(--rm-bg-void)' }}>OP</div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0 text-left">
              <div className="text-[13px] font-medium truncate" style={{ color: 'var(--rm-text)' }}>Operator</div>
              <div className="text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>v0.1</div>
            </div>
          )}
          {!isCollapsed && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--rm-text-muted)', transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 0.2s' }}>
              <polyline points="18 15 12 9 6 15" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Main Sidebar ────────────────────────────────────────────────────────

export default function PortalSidebar({ onMobileClose }: { onMobileClose?: () => void }) {
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

  const isActive = (href: string) => href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);
  const contextLabel = getContextLabel(pathname);

  return (
    <aside className={`fixed top-0 left-0 bottom-0 flex flex-col z-50 transition-all duration-300 backdrop-blur-md ${isCollapsed ? 'w-[72px]' : 'w-[180px]'}`} style={{ background: 'var(--rm-chrome-bg)', borderRight: '1px solid var(--rm-border)' }}>

      {/* ── Zone 1: Brand Row ── */}
      <div className={`px-4 py-3 flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'}`} style={{ minHeight: '52px' }}>
        <Link href="/dashboard" className="flex items-center gap-2 min-w-0 flex-shrink-0">
          <SvLogo />
          {!isCollapsed && (
            <span className="text-[13px] font-semibold tracking-tight" style={{ color: 'var(--rm-text)' }}>
              Runtime Max
            </span>
          )}
        </Link>
        {!isCollapsed && <div className="flex-1" />}
        <button
          onClick={toggleCollapsed}
          className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${isCollapsed ? 'mt-0' : ''}`}
          style={{ color: 'var(--rm-text-muted)' }}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" /></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="11 17 6 12 11 7" /><polyline points="18 17 13 12 18 7" /></svg>
          )}
        </button>
      </div>

      {/* ── Zone 2: Context Row (admin pages only) ── */}
      {!isCollapsed && contextLabel && (
        <div className="px-5 pb-2">
          <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--rm-text-muted)' }}>
            {contextLabel}
          </span>
        </div>
      )}

      {/* ── Zone 3: Divider ── */}
      <div className="mx-3" style={{ borderTop: '1px solid var(--rm-border)' }} />

      {/* ── Zone 4: Navigation ── */}
      <nav className="flex-1 pt-2 pb-4 px-3 overflow-y-auto">
        {coreNavigation.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} isCollapsed={isCollapsed} onMobileClose={onMobileClose} />
        ))}

        {/* Admin divider */}
        <div className="my-3 mx-1" style={{ borderTop: '1px solid var(--rm-border)' }}>
          {!isCollapsed && (
            <div className="text-[10px] font-semibold uppercase tracking-wider mt-2.5 mb-1 px-2" style={{ color: 'var(--rm-text-muted)' }}>Admin</div>
          )}
        </div>

        {adminNavigation.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} isCollapsed={isCollapsed} onMobileClose={onMobileClose} />
        ))}
      </nav>

      {/* ── Zone 5: Footer Utility ── */}
      <OperatorMenu isCollapsed={isCollapsed} />
    </aside>
  );
}
