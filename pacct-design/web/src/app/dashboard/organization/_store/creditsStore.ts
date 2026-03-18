'use client';

import { useSyncExternalStore, useEffect, useRef } from 'react';
import type {
  CreditBalance,
  CreditKpis,
  CreditProduct,
  CreditPurchase,
  CreditUsageEvent,
  PaymentMethod,
} from '@loadtoad/schema';

// ─── State shape ────────────────────────────────────────────────────────

interface CreditsState {
  balance: CreditBalance | null;
  kpis: CreditKpis | null;
  products: CreditProduct[];
  recentPurchases: CreditPurchase[];
  recentUsage: CreditUsageEvent[];
}

const STORAGE_KEY = 'sv:credits';

// ─── In-memory cache + subscribers ──────────────────────────────────────

let cache: CreditsState | null = null;
let synced = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(fn => fn());
}

function read(): CreditsState {
  if (cache) return cache;
  if (typeof window === 'undefined') return { balance: null, kpis: null, products: [], recentPurchases: [], recentUsage: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cache = raw ? JSON.parse(raw) : { balance: null, kpis: null, products: [], recentPurchases: [], recentUsage: [] };
  } catch {
    cache = { balance: null, kpis: null, products: [], recentPurchases: [], recentUsage: [] };
  }
  return cache!;
}

function writeLocal(state: CreditsState) {
  cache = state;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be full — cache still works in-memory
  }
  notify();
}

// ─── Server-backed API ──────────────────────────────────────────────────

/** Sync local cache from the API. Called once on mount. */
export async function syncCreditsFromServer(): Promise<void> {
  if (synced) return;
  try {
    const [balanceRes, productsRes, purchasesRes, usageRes] = await Promise.all([
      fetch('/api/credits/balance'),
      fetch('/api/credits/products'),
      fetch('/api/credits/purchases?limit=5'),
      fetch('/api/credits/usage?limit=5'),
    ]);

    const { balance, kpis } = balanceRes.ok ? await balanceRes.json() : { balance: null, kpis: null };
    const products = productsRes.ok ? await productsRes.json() : [];
    const { purchases: recentPurchases } = purchasesRes.ok ? await purchasesRes.json() : { purchases: [] };
    const { events: recentUsage } = usageRes.ok ? await usageRes.json() : { events: [] };

    writeLocal({ balance, kpis, products, recentPurchases, recentUsage });
    synced = true;
  } catch {
    // API unavailable — fall back to localStorage cache silently
  }
}

/** Force re-sync after a purchase or other mutation */
export async function refreshCredits(): Promise<void> {
  synced = false;
  await syncCreditsFromServer();
}

// ─── Purchase actions ───────────────────────────────────────────────────

export async function initiatePurchase(
  productId: string,
  paymentMethod: PaymentMethod,
): Promise<CreditPurchase> {
  const res = await fetch('/api/credits/purchases/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, paymentMethod }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Purchase failed' }));
    throw new Error(err.error || 'Purchase failed');
  }
  return res.json();
}

export async function completePurchase(
  purchaseId: string,
  paymentReference?: string,
): Promise<{ purchase: CreditPurchase; balance: CreditBalance }> {
  const res = await fetch(`/api/credits/purchases/${purchaseId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentReference }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Completion failed' }));
    throw new Error(err.error || 'Completion failed');
  }
  const result = await res.json();
  await refreshCredits();
  return result;
}

export async function cancelPurchase(purchaseId: string): Promise<CreditPurchase> {
  const res = await fetch(`/api/credits/purchases/${purchaseId}/cancel`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Cancellation failed' }));
    throw new Error(err.error || 'Cancellation failed');
  }
  const purchase = await res.json();
  await refreshCredits();
  return purchase;
}

// ─── React hooks ────────────────────────────────────────────────────────

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

function getSnapshot(): CreditsState {
  return read();
}

function getServerSnapshot(): CreditsState {
  return { balance: null, kpis: null, products: [], recentPurchases: [], recentUsage: [] };
}

function useCreditsState(): CreditsState {
  const didSync = useRef(false);
  useEffect(() => {
    if (!didSync.current) {
      didSync.current = true;
      syncCreditsFromServer();
    }
  }, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useCreditsBalance(): CreditBalance | null {
  return useCreditsState().balance;
}

export function useCreditsKpis(): CreditKpis | null {
  return useCreditsState().kpis;
}

export function useCreditProducts(): CreditProduct[] {
  return useCreditsState().products;
}

export function useRecentPurchases(): CreditPurchase[] {
  return useCreditsState().recentPurchases;
}

export function useRecentUsage(): CreditUsageEvent[] {
  return useCreditsState().recentUsage;
}
