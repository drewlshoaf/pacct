'use client';

import { useState, useCallback } from 'react';
import type { ChartPaneId } from '@/components/charts/chartColors';
import { DEFAULT_PANE_ORDER } from '@/components/charts/chartColors';

function loadOrder(key: string): ChartPaneId[] {
  if (typeof window === 'undefined') return DEFAULT_PANE_ORDER;
  try {
    const raw = localStorage.getItem(key + '-order');
    if (raw) {
      const parsed = JSON.parse(raw) as ChartPaneId[];
      // Ensure all panes are present
      if (DEFAULT_PANE_ORDER.every(p => parsed.includes(p))) return parsed;
    }
  } catch { /* ignore */ }
  return DEFAULT_PANE_ORDER;
}

function loadCollapsed(key: string): Record<ChartPaneId, boolean> {
  const defaults: Record<ChartPaneId, boolean> = { throughput: false, latency: false, failures: false, volume: false };
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = localStorage.getItem(key + '-collapsed');
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaults;
}

export function usePaneLayout(storagePrefix: string) {
  const [paneOrder, setPaneOrder] = useState<ChartPaneId[]>(() => loadOrder(storagePrefix));
  const [collapsedPanes, setCollapsedPanes] = useState<Record<ChartPaneId, boolean>>(() => loadCollapsed(storagePrefix));

  const toggleCollapse = useCallback((id: ChartPaneId) => {
    setCollapsedPanes(prev => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(storagePrefix + '-collapsed', JSON.stringify(next));
      return next;
    });
  }, [storagePrefix]);

  const reorder = useCallback((from: number, to: number) => {
    setPaneOrder(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      localStorage.setItem(storagePrefix + '-order', JSON.stringify(next));
      return next;
    });
  }, [storagePrefix]);

  return { paneOrder, collapsedPanes, toggleCollapse, reorder };
}
