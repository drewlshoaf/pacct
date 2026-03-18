'use client';

import type { Scenario } from '../types';
import { useSyncExternalStore, useEffect, useRef } from 'react';
const STORAGE_KEY = 'sv:scenarios';

// ─── In-memory cache + subscribers ──────────────────────────────────────

let cache: Scenario[] | null = null;
let synced = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(fn => fn());
}

function read(): Scenario[] {
  if (cache) return cache;
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cache = raw ? JSON.parse(raw) : [];
  } catch {
    cache = [];
  }
  return cache!;
}

function writeLocal(scenarios: Scenario[]) {
  cache = scenarios;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
  } catch {
    // localStorage may be full — cache still works in-memory
  }
  notify();
}

// ─── Server-backed API ──────────────────────────────────────────────────

/** Sync local cache from the API. Called once on mount. */
export async function syncFromServer(): Promise<void> {
  if (synced) return;
  try {
    const res = await fetch('/api/scenarios');
    if (res.ok) {
      const scenarios: Scenario[] = await res.json();
      writeLocal(scenarios);
      synced = true;
    }
  } catch {
    // API unavailable — fall back to localStorage cache silently
  }
  seedAbScenarios();
}

/** Client-side A/B seeding — disabled. Scenarios are now seeded via the seed script. */
async function seedAbScenarios(): Promise<void> {
  // No-op: use `npx tsx packages/target-rest/seed-scenarios.ts` to seed scenarios.
}

/** Save a scenario to the API, then update local cache. */
export async function saveScenarioToServer(scenario: Scenario): Promise<void> {
  const updated = {
    ...scenario,
    metadata: { ...scenario.metadata, updated_at: new Date().toISOString() },
  };

  const res = await fetch('/api/scenarios', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updated),
  });

  if (!res.ok) {
    throw new Error(`Failed to save scenario: ${res.status}`);
  }

  // Update local cache
  const list = read();
  const idx = list.findIndex(s => s.metadata.id === updated.metadata.id);
  if (idx >= 0) {
    list[idx] = updated;
  } else {
    list.unshift(updated);
  }
  writeLocal([...list]);
}

/** Delete a scenario via API, then update local cache. */
export async function deleteScenarioFromServer(id: string): Promise<void> {
  const res = await fetch(`/api/scenarios/${id}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Failed to delete scenario: ${res.status}`);
  }
  writeLocal(read().filter(s => s.metadata.id !== id));
}

// ─── Local-only fallbacks (used when no DB is configured) ───────────────

export function saveScenario(scenario: Scenario): void {
  const list = read();
  const idx = list.findIndex(s => s.metadata.id === scenario.metadata.id);
  const updated = { ...scenario, metadata: { ...scenario.metadata, updated_at: new Date().toISOString() } };
  if (idx >= 0) {
    list[idx] = updated;
  } else {
    updated.metadata.created_at = new Date().toISOString();
    list.unshift(updated);
  }
  writeLocal([...list]);
}

export function deleteScenario(id: string): void {
  writeLocal(read().filter(s => s.metadata.id !== id));
}

/** Reorder scenarios by providing the full ordered list of IDs. */
export function reorderScenarios(orderedIds: string[]): void {
  const list = read();
  const map = new Map(list.map(s => [s.metadata.id, s]));
  const reordered = orderedIds.map(id => map.get(id)).filter(Boolean) as Scenario[];
  // Append any scenarios not in the ordered list (safety net)
  const seen = new Set(orderedIds);
  for (const s of list) {
    if (!seen.has(s.metadata.id)) reordered.push(s);
  }
  writeLocal(reordered);
}

// ─── React hooks ────────────────────────────────────────────────────────

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

function getSnapshot(): Scenario[] {
  return read();
}

function getServerSnapshot(): Scenario[] {
  return [];
}

export function useScenarios(): Scenario[] {
  const didSync = useRef(false);
  useEffect(() => {
    if (!didSync.current) {
      didSync.current = true;
      syncFromServer();
    }
  }, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useScenario(id: string): Scenario | undefined {
  const all = useScenarios();
  return all.find(s => s.metadata.id === id);
}
