'use client';

import { StatCard, StatsGrid } from '@/components/layout/PortalLayout';
import type { GlobalAnalytics } from '@/lib/api';

export default function GlobalKpiRow({
  data,
}: {
  data: GlobalAnalytics;
}) {
  const stabilityDisplay = data.global_stability != null ? `${data.global_stability}%` : '—';

  return (
    <StatsGrid>
      <StatCard label="Global Stability" value={stabilityDisplay} />
    </StatsGrid>
  );
}
