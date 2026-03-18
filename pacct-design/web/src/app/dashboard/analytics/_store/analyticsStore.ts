'use client';

import { create } from 'zustand';
import type {
  ScenarioAnalyticsResponse,
  BaselineMode,
} from '@/components/analytics/analytics-types';

// Re-export for convenience
export type { ScenarioAnalyticsResponse, BaselineMode };

export type AnalyticsWindow = '7d' | '30d' | '90d';

// ─── Store ───────────────────────────────────────────────────────────────

interface AnalyticsState {
  scenarioId: string | null;
  baselineMode: BaselineMode;
  window: AnalyticsWindow;
  data: ScenarioAnalyticsResponse | null;
  loading: boolean;

  setScenarioId: (id: string | null) => void;
  setBaselineMode: (mode: BaselineMode) => void;
  setWindow: (w: AnalyticsWindow) => void;
  fetchData: () => Promise<void>;
}

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  scenarioId: null,
  baselineMode: 'prev',
  window: '30d',
  data: null,
  loading: false,

  setScenarioId: (id) => {
    set({ scenarioId: id, data: null });
    if (id) get().fetchData();
  },

  setBaselineMode: (mode) => {
    set({ baselineMode: mode });
    if (get().scenarioId) get().fetchData();
  },

  setWindow: (w) => {
    set({ window: w });
    if (get().scenarioId) get().fetchData();
  },

  fetchData: async () => {
    const { scenarioId, baselineMode, window } = get();
    if (!scenarioId) return;

    set({ loading: true });
    try {
      const res = await fetch(
        `/api/analytics/scenario/${encodeURIComponent(scenarioId)}?baseline=${baselineMode}&window=${window}`,
      );
      if (!res.ok) {
        set({ data: null, loading: false });
        return;
      }
      const json: ScenarioAnalyticsResponse = await res.json();
      // Only apply if the scenario hasn't changed while fetching
      if (get().scenarioId === scenarioId) {
        set({ data: json, loading: false });
      }
    } catch {
      if (get().scenarioId === scenarioId) {
        set({ data: null, loading: false });
      }
    }
  },
}));
