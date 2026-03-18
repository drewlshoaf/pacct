'use client';

import type { Gate } from '@loadtoad/schema';
import { useSyncExternalStore, useEffect, useRef } from 'react';

const STORAGE_KEY = 'sv:gates';

// ─── In-memory cache + subscribers ──────────────────────────────────────

let cache: Gate[] | null = null;
let synced = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(fn => fn());
}

function read(): Gate[] {
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

function writeLocal(gates: Gate[]) {
  cache = gates;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gates));
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
    const res = await fetch('/api/gates');
    if (res.ok) {
      const gates: Gate[] = await res.json();
      writeLocal(gates);
      synced = true;
    }
  } catch {
    // API unavailable — fall back to localStorage cache silently
  }
}

/** Save a gate to the API, then update local cache. */
export async function saveGateToServer(gate: Gate): Promise<void> {
  const updated = { ...gate, updated_at: new Date().toISOString() };

  const res = await fetch('/api/gates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updated),
  });

  if (!res.ok) {
    throw new Error(`Failed to save gate: ${res.status}`);
  }

  // Update local cache
  const list = read();
  const idx = list.findIndex(g => g.id === updated.id);
  if (idx >= 0) {
    list[idx] = updated;
  } else {
    list.unshift(updated);
  }
  writeLocal([...list]);
}

/** Delete a gate via API, then update local cache. */
export async function deleteGateFromServer(id: string): Promise<void> {
  const res = await fetch(`/api/gates/${id}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Failed to delete gate: ${res.status}`);
  }
  writeLocal(read().filter(g => g.id !== id));
}

// ─── Local-only fallbacks ───────────────────────────────────────────────

export function saveGate(gate: Gate): void {
  const list = read();
  const idx = list.findIndex(g => g.id === gate.id);
  const updated = { ...gate, updated_at: new Date().toISOString() };
  if (idx >= 0) {
    list[idx] = updated;
  } else {
    updated.created_at = new Date().toISOString();
    list.unshift(updated);
  }
  writeLocal([...list]);
}

export function deleteGate(id: string): void {
  writeLocal(read().filter(g => g.id !== id));
}

// ─── React hooks ────────────────────────────────────────────────────────

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

function getSnapshot(): Gate[] {
  return read();
}

function getServerSnapshot(): Gate[] {
  return [];
}

export function useGates(): Gate[] {
  const didSync = useRef(false);
  useEffect(() => {
    if (!didSync.current) {
      didSync.current = true;
      syncFromServer();
    }
  }, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useGate(id: string): Gate | undefined {
  const all = useGates();
  return all.find(g => g.id === id);
}
