'use client';

import type { EnvironmentEntry } from '@/lib/api';
import { useSyncExternalStore, useEffect, useRef } from 'react';

const STORAGE_KEY = 'sv:environments';

// ─── In-memory cache + subscribers ──────────────────────────────────────

let cache: EnvironmentEntry[] | null = null;
let synced = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(fn => fn());
}

function read(): EnvironmentEntry[] {
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

function writeLocal(environments: EnvironmentEntry[]) {
  cache = environments;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(environments));
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
    const res = await fetch('/api/environments');
    if (res.ok) {
      const data = await res.json();
      writeLocal(data.environments ?? []);
      synced = true;
    }
  } catch {
    // API unavailable — fall back to localStorage cache silently
  }
}

/** Save an environment to the API, then update local cache. */
export async function saveEnvironmentToServer(env: EnvironmentEntry): Promise<void> {
  const updated = { ...env, updated_at: new Date().toISOString() };

  const res = await fetch('/api/environments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updated),
  });

  if (!res.ok) {
    throw new Error(`Failed to save environment: ${res.status}`);
  }

  // Update local cache
  const list = read();
  const idx = list.findIndex(e => e.id === updated.id);
  if (idx >= 0) {
    list[idx] = updated;
  } else {
    list.unshift(updated);
  }
  writeLocal([...list]);
}

/** Delete an environment via API, then update local cache. */
export async function deleteEnvironmentFromServer(id: string): Promise<void> {
  const res = await fetch(`/api/environments/${id}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Failed to delete environment: ${res.status}`);
  }
  writeLocal(read().filter(e => e.id !== id));
}

// ─── Local-only fallbacks (used when no DB is configured) ───────────────

export function saveEnvironment(env: EnvironmentEntry): void {
  const list = read();
  const idx = list.findIndex(e => e.id === env.id);
  const updated = { ...env, updated_at: new Date().toISOString() };
  if (idx >= 0) {
    list[idx] = updated;
  } else {
    updated.created_at = new Date().toISOString();
    list.unshift(updated);
  }
  writeLocal([...list]);
}

export function deleteEnvironment(id: string): void {
  writeLocal(read().filter(e => e.id !== id));
}

// ─── React hooks ────────────────────────────────────────────────────────

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

function getSnapshot(): EnvironmentEntry[] {
  return read();
}

function getServerSnapshot(): EnvironmentEntry[] {
  return [];
}

export function useEnvironments(): EnvironmentEntry[] {
  const didSync = useRef(false);
  useEffect(() => {
    if (!didSync.current) {
      didSync.current = true;
      syncFromServer();
    }
  }, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useEnvironment(id: string): EnvironmentEntry | undefined {
  const all = useEnvironments();
  return all.find(e => e.id === id);
}
