'use client';

import { useState, useEffect, useCallback } from 'react';
import PortalLayout, { PageHeader } from '@/components/layout/PortalLayout';
import { fetchDashboardData } from '@/lib/api';
import LiveModule from './_components/LiveModule';
import GateStatusModule from './_components/GateStatusModule';
import TopIssuesModule from './_components/TopIssuesModule';
import type { DashboardData, TimeWindow } from '@/data/types';

const POLL_INTERVAL = 10_000;
const WINDOWS: { value: TimeWindow; label: string }[] = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('24h');

  const load = useCallback(async () => {
    const result = await fetchDashboardData(timeWindow);
    setData(result);
    setLoading(false);
  }, [timeWindow]);

  useEffect(() => {
    setLoading(true);
    load();
    const id = setInterval(load, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [load]);

  const windowSelector = (
    <div className="flex gap-1">
      {WINDOWS.map(w => (
        <button
          key={w.value}
          onClick={() => setTimeWindow(w.value)}
          className="text-[12px] font-semibold px-2.5 py-1 rounded-md transition-colors"
          style={{
            background: timeWindow === w.value ? 'var(--rm-signal-glow)' : 'transparent',
            color: timeWindow === w.value ? 'var(--rm-signal)' : 'var(--rm-text-muted)',
          }}
        >
          {w.label}
        </button>
      ))}
    </div>
  );

  if (loading || !data) {
    return (
      <PortalLayout>
        <PageHeader title="Dashboard" actions={windowSelector} />
        <div className="card text-center py-12">
          <p className="text-[14px]" style={{ color: 'var(--rm-text-secondary)' }}>Loading...</p>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <PageHeader title="Dashboard" actions={windowSelector} />
      {data.live.length > 0 && <LiveModule data={data.live} hasMore={data.has_more_live} />}
      <GateStatusModule data={data.gates} window={timeWindow} />
      {data.live.length === 0 && <LiveModule data={data.live} hasMore={data.has_more_live} />}
      <TopIssuesModule data={data.issues} window={timeWindow} />
    </PortalLayout>
  );
}
