'use client';

import { useState, useEffect } from 'react';
import { fetchGlobalAnalytics } from '@/lib/api';
import type { GlobalAnalytics } from '@/lib/api';
import type { TimeWindow } from '@/data/types';
import GlobalKpiRow from './GlobalKpiRow';
import GlobalTrendsSection from './GlobalTrendsSection';

export default function GlobalScopeBody({
  window,
}: {
  window: TimeWindow;
}) {
  const [data, setData] = useState<GlobalAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchGlobalAnalytics(window).then(d => {
      setData(d);
      setLoading(false);
    });
  }, [window]);

  if (loading || !data) {
    return (
      <div className="card text-center py-12">
        <p className="text-[14px]" style={{ color: 'var(--rm-text-secondary)' }}>Loading global analytics...</p>
      </div>
    );
  }

  return (
    <div>
      <GlobalKpiRow data={data} />
      <GlobalTrendsSection data={data} />
    </div>
  );
}
