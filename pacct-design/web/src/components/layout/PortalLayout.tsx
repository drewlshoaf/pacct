'use client';

import { ReactNode, useState, useEffect } from 'react';
import PortalSidebar from './PortalSidebar';
import TopBar from './TopBar';

const SIDEBAR_STATE_KEY = 'sv-sidebar-collapsed';

export default function PortalLayout({ children, title }: { children: ReactNode; title?: string }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const update = () => setSidebarCollapsed(localStorage.getItem(SIDEBAR_STATE_KEY) === 'true');
    update();
    window.addEventListener('storage', update);
    window.addEventListener('sidebar-toggle', update);
    return () => { window.removeEventListener('storage', update); window.removeEventListener('sidebar-toggle', update); };
  }, []);

  return (
    <div className="min-h-screen">
      <PortalSidebar />
      <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'ml-[72px]' : 'ml-[180px]'}`}>
        <TopBar title={title} />
        <main className="p-6" style={{ maxWidth: '1600px' }}>{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold truncate" style={{ color: 'var(--rm-text)' }}>{title}</h1>
        {description && <p className="text-[13px] mt-1" style={{ color: 'var(--rm-text-secondary)' }}>{description}</p>}
      </div>
      {actions && <div className="flex gap-3 flex-shrink-0">{actions}</div>}
    </div>
  );
}

export function StatsGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 mb-6">{children}</div>;
}

export function StatCard({ label, value, change, changeType = 'neutral', icon }: { label: string; value: string | number; change?: string; changeType?: 'up' | 'down' | 'neutral'; icon?: ReactNode }) {
  const cc: Record<string, string> = { up: 'var(--rm-pass)', down: 'var(--rm-fail)', neutral: 'var(--rm-text-muted)' };
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px]" style={{ color: 'var(--rm-text-muted)' }}>{label}</span>
        {icon && <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--rm-signal-glow)', color: 'var(--rm-signal)' }}>{icon}</div>}
      </div>
      <div className="text-[24px] font-semibold" style={{ color: 'var(--rm-text)', lineHeight: '1.2' }}>{value}</div>
      {change && <div className="text-[12px] flex items-center gap-1 mt-1" style={{ color: cc[changeType] }}>{change}</div>}
    </div>
  );
}

