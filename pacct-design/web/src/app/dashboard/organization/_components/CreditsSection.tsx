'use client';

import { useState, useEffect } from 'react';
import type {
  CreditProduct,
  CreditPurchase,
  CreditUsageEvent,
  UsageSourceType,
} from '@loadtoad/schema';
import {
  useCreditsBalance,
  useCreditsKpis,
  useCreditProducts,
  useRecentPurchases,
  useRecentUsage,
  refreshCredits,
} from '@/app/dashboard/organization/_store/creditsStore';
import CheckoutModal from '@/app/dashboard/organization/_components/CheckoutModal';
import RmSelect from '@/components/ui/RmSelect';

// ─── Helpers ─────────────────────────────────────────────────────────────

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  completed: { bg: 'rgba(59,167,118,0.12)', color: 'var(--rm-pass)' },
  processing: { bg: 'rgba(217,164,65,0.12)', color: 'var(--rm-caution)' },
  initiated: { bg: 'rgba(217,164,65,0.12)', color: 'var(--rm-caution)' },
  awaiting_payment: { bg: 'rgba(217,164,65,0.12)', color: 'var(--rm-caution)' },
  failed: { bg: 'rgba(255,59,48,0.08)', color: 'var(--rm-fail)' },
  canceled: { bg: 'var(--rm-bg-raised)', color: 'var(--rm-text-muted)' },
  refunded: { bg: 'var(--rm-bg-raised)', color: 'var(--rm-text-muted)' },
  expired: { bg: 'var(--rm-bg-raised)', color: 'var(--rm-text-muted)' },
};

const SOURCE_COLORS: Record<string, { bg: string; color: string }> = {
  run: { bg: 'var(--rm-signal-glow)', color: 'var(--rm-signal)' },
  scenario: { bg: 'rgba(59,167,118,0.12)', color: 'var(--rm-pass)' },
  analysis: { bg: 'rgba(217,164,65,0.12)', color: 'var(--rm-caution)' },
  export: { bg: 'var(--rm-bg-raised)', color: 'var(--rm-text-secondary)' },
};

const PAGE_SIZE = 10;

const SUB_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'buy', label: 'Buy Credits' },
  { key: 'purchases', label: 'Purchase History' },
  { key: 'usage', label: 'Usage History' },
] as const;

type SubTab = typeof SUB_TABS[number]['key'];

// ─── Stat Card ──────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--rm-bg-raised)', border: '1px solid var(--rm-border)' }}>
      <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--rm-text-muted)' }}>{label}</div>
      <div className="text-[20px] font-bold mt-1" style={{ color: 'var(--rm-text)' }}>{value}</div>
      {sub && <div className="text-[11px] mt-0.5" style={{ color: 'var(--rm-text-muted)' }}>{sub}</div>}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────

export default function CreditsSection() {
  const [subTab, setSubTab] = useState<SubTab>('overview');
  const [checkoutProduct, setCheckoutProduct] = useState<CreditProduct | null>(null);

  // Store data
  const balance = useCreditsBalance();
  const kpis = useCreditsKpis();
  const products = useCreditProducts();
  const recentPurchases = useRecentPurchases();
  const recentUsage = useRecentUsage();

  // Paginated data
  const [purchases, setPurchases] = useState<CreditPurchase[]>([]);
  const [purchasesTotal, setPurchasesTotal] = useState(0);
  const [purchasesPage, setPurchasesPage] = useState(0);
  const [purchasesLoading, setPurchasesLoading] = useState(false);

  const [usage, setUsage] = useState<CreditUsageEvent[]>([]);
  const [usageTotal, setUsageTotal] = useState(0);
  const [usagePage, setUsagePage] = useState(0);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageFilter, setUsageFilter] = useState<UsageSourceType | ''>('');

  // Fetch paginated purchases
  useEffect(() => {
    if (subTab !== 'purchases') return;
    setPurchasesLoading(true);
    fetch(`/api/credits/purchases?limit=${PAGE_SIZE}&offset=${purchasesPage * PAGE_SIZE}`)
      .then(r => r.json())
      .then(data => { setPurchases(data.purchases ?? []); setPurchasesTotal(data.total ?? 0); })
      .catch(() => {})
      .finally(() => setPurchasesLoading(false));
  }, [subTab, purchasesPage]);

  // Fetch paginated usage
  useEffect(() => {
    if (subTab !== 'usage') return;
    setUsageLoading(true);
    const qs = usageFilter ? `&sourceType=${usageFilter}` : '';
    fetch(`/api/credits/usage?limit=${PAGE_SIZE}&offset=${usagePage * PAGE_SIZE}${qs}`)
      .then(r => r.json())
      .then(data => { setUsage(data.events ?? []); setUsageTotal(data.total ?? 0); })
      .catch(() => {})
      .finally(() => setUsageLoading(false));
  }, [subTab, usagePage, usageFilter]);

  const handleCheckoutComplete = () => {
    refreshCredits();
    setPurchasesPage(0);
    setUsagePage(0);
  };

  return (
    <div>
      {/* Sub-tab bar */}
      <div className="flex gap-1 mb-5 p-1 rounded-lg" style={{ background: 'var(--rm-bg-raised)' }}>
        {SUB_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className="px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors"
            style={subTab === t.key
              ? { background: 'var(--rm-bg-surface)', color: 'var(--rm-text)', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }
              : { color: 'var(--rm-text-muted)' }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ──────────────────────────────────────────── */}
      {subTab === 'overview' && (
        <div className="space-y-5">
          {/* Wallet */}
          <div className="rounded-xl p-5" style={{ background: 'var(--rm-bg-raised)', border: '1px solid var(--rm-border)' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[12px] font-medium" style={{ color: 'var(--rm-text-muted)' }}>Credit Balance</div>
                <div className="text-[32px] font-bold mt-1" style={{ color: 'var(--rm-signal)' }}>
                  {balance ? balance.balance.toLocaleString() : '\u2014'}
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: 'var(--rm-text-muted)' }}>
                  {balance ? `${balance.lifetime_purchased.toLocaleString()} purchased \u00b7 ${balance.lifetime_used.toLocaleString()} used` : ''}
                </div>
              </div>
              <button onClick={() => setSubTab('buy')} className="btn btn-primary text-[13px] px-5 py-2">
                Buy Credits
              </button>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-4 gap-3">
            <StatCard label="Purchased This Month" value={kpis ? kpis.purchased_this_month.toLocaleString() : '\u2014'} sub="credits" />
            <StatCard label="Used This Month" value={kpis ? kpis.used_this_month.toLocaleString() : '\u2014'} sub="credits" />
            <StatCard label="Avg Daily Usage" value={kpis ? kpis.avg_daily_usage.toLocaleString() : '\u2014'} sub="credits/day" />
            <StatCard label="Runway" value={kpis?.runway_days != null ? `${kpis.runway_days}` : '\u2014'} sub={kpis?.runway_days != null ? 'days remaining' : 'insufficient data'} />
          </div>

          {/* Recent Purchases */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-semibold" style={{ color: 'var(--rm-text)' }}>Recent Purchases</h3>
              <button onClick={() => setSubTab('purchases')} className="text-[12px]" style={{ color: 'var(--rm-signal)' }}>View All</button>
            </div>
            {recentPurchases.length === 0 ? (
              <div className="text-[12px] py-4 text-center" style={{ color: 'var(--rm-text-muted)' }}>No purchases yet</div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr><th>Date</th><th>Credits</th><th>Amount</th><th>Method</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {recentPurchases.map(p => {
                      const sc = STATUS_COLORS[p.status] || STATUS_COLORS.canceled;
                      return (
                        <tr key={p.id}>
                          <td style={{ color: 'var(--rm-text-secondary)' }}>{formatDate(p.created_at)}</td>
                          <td style={{ color: 'var(--rm-text)' }}>{p.credits.toLocaleString()}</td>
                          <td style={{ color: 'var(--rm-text)' }}>{formatCents(p.final_price_cents)}</td>
                          <td style={{ color: 'var(--rm-text-muted)' }}>{p.payment_method.replace('_', ' ')}</td>
                          <td><span className="text-[11px] px-2 py-0.5 rounded" style={{ background: sc.bg, color: sc.color }}>{p.status}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Usage */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-semibold" style={{ color: 'var(--rm-text)' }}>Recent Usage</h3>
              <button onClick={() => setSubTab('usage')} className="text-[12px]" style={{ color: 'var(--rm-signal)' }}>View All</button>
            </div>
            {recentUsage.length === 0 ? (
              <div className="text-[12px] py-4 text-center" style={{ color: 'var(--rm-text-muted)' }}>No usage yet</div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr><th>Time</th><th>Type</th><th>Source</th><th>Credits</th></tr>
                  </thead>
                  <tbody>
                    {recentUsage.map(u => {
                      const sc = SOURCE_COLORS[u.source_type] || SOURCE_COLORS.export;
                      return (
                        <tr key={u.id}>
                          <td style={{ color: 'var(--rm-text-secondary)' }}>{formatDateTime(u.created_at)}</td>
                          <td><span className="text-[11px] px-2 py-0.5 rounded" style={{ background: sc.bg, color: sc.color }}>{u.source_type}</span></td>
                          <td style={{ color: 'var(--rm-text)' }}>{u.source_label || u.source_id}</td>
                          <td style={{ color: 'var(--rm-fail)' }}>-{u.credits_debited}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Buy Credits ──────────────────────────────────────── */}
      {subTab === 'buy' && (
        <div>
          <div className="mb-5">
            <h2 className="text-[16px] font-semibold" style={{ color: 'var(--rm-text)' }}>Credit Packs</h2>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--rm-text-muted)' }}>Choose a credit pack to power your performance testing</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {products.map(product => {
              const perCredit = (product.list_price_cents / product.credits).toFixed(1);
              const starterRate = products[0] ? (products[0].list_price_cents / products[0].credits) : null;
              const savings = starterRate && product.credits > 100
                ? Math.round((1 - (product.list_price_cents / product.credits) / starterRate) * 100)
                : 0;
              return (
                <div key={product.id} className="rounded-xl p-5 relative" style={{ background: 'var(--rm-bg-raised)', border: '1px solid var(--rm-border)' }}>
                  {savings > 0 && (
                    <span className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(59,167,118,0.12)', color: 'var(--rm-pass)' }}>
                      Save {savings}%
                    </span>
                  )}
                  <div className="text-[15px] font-semibold mb-1" style={{ color: 'var(--rm-text)' }}>{product.name}</div>
                  <div className="text-[28px] font-bold" style={{ color: 'var(--rm-signal)' }}>{product.credits.toLocaleString()}</div>
                  <div className="text-[12px] mb-1" style={{ color: 'var(--rm-text-muted)' }}>credits</div>
                  <div className="text-[18px] font-semibold mb-0.5" style={{ color: 'var(--rm-text)' }}>{formatCents(product.list_price_cents)}</div>
                  <div className="text-[11px] mb-4" style={{ color: 'var(--rm-text-muted)' }}>{perCredit}\u00a2 per credit</div>
                  <button onClick={() => setCheckoutProduct(product)} className="btn btn-primary w-full text-[13px] py-2">
                    Buy Now
                  </button>
                </div>
              );
            })}
          </div>
          {products.length === 0 && (
            <div className="text-center py-12" style={{ color: 'var(--rm-text-muted)' }}>
              <div className="text-[14px]">No credit packs available</div>
              <div className="text-[12px] mt-1">Products will appear here once configured.</div>
            </div>
          )}
        </div>
      )}

      {/* ── Purchase History ─────────────────────────────────── */}
      {subTab === 'purchases' && (
        <div className="card">
          <h3 className="text-[16px] font-semibold mb-1" style={{ color: 'var(--rm-text)' }}>Purchase History</h3>
          <p className="text-[12px] mb-4" style={{ color: 'var(--rm-text-muted)' }}>All credit purchases for your organization</p>

          {purchasesLoading ? (
            <div className="text-center py-8" style={{ color: 'var(--rm-text-muted)' }}>Loading...</div>
          ) : purchases.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--rm-text-muted)' }}>
              <div className="text-[14px]">No purchases yet</div>
              <div className="text-[12px] mt-1">
                <button onClick={() => setSubTab('buy')} style={{ color: 'var(--rm-signal)' }}>Buy credits</button> to get started
              </div>
            </div>
          ) : (
            <>
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr><th>Date</th><th>Package</th><th>Credits</th><th>List Price</th><th>Discount</th><th>Amount Paid</th><th>Method</th><th>Status</th><th>Reference</th></tr>
                  </thead>
                  <tbody>
                    {purchases.map(p => {
                      const sc = STATUS_COLORS[p.status] || STATUS_COLORS.canceled;
                      const totalDiscount = p.list_price_cents - p.final_price_cents;
                      return (
                        <tr key={p.id}>
                          <td style={{ color: 'var(--rm-text-secondary)' }}>{formatDate(p.created_at)}</td>
                          <td style={{ color: 'var(--rm-text)' }}>{p.credits >= 5000 ? 'Enterprise' : p.credits >= 1000 ? 'Pro' : p.credits >= 500 ? 'Plus' : 'Starter'}</td>
                          <td style={{ color: 'var(--rm-text)' }}>{p.credits.toLocaleString()}</td>
                          <td style={{ color: 'var(--rm-text-muted)' }}>{formatCents(p.list_price_cents)}</td>
                          <td style={{ color: totalDiscount > 0 ? 'var(--rm-pass)' : 'var(--rm-text-muted)' }}>
                            {totalDiscount > 0 ? `-${formatCents(totalDiscount)}` : '\u2014'}
                          </td>
                          <td style={{ color: 'var(--rm-text)' }}>{formatCents(p.final_price_cents)}</td>
                          <td style={{ color: 'var(--rm-text-muted)' }}>{p.payment_method.replace('_', ' ')}</td>
                          <td><span className="text-[11px] px-2 py-0.5 rounded" style={{ background: sc.bg, color: sc.color }}>{p.status}</span></td>
                          <td><span className="font-mono text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>{p.payment_reference || '\u2014'}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>
                  Showing {purchasesPage * PAGE_SIZE + 1}\u2013{Math.min((purchasesPage + 1) * PAGE_SIZE, purchasesTotal)} of {purchasesTotal}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPurchasesPage(p => p - 1)}
                    disabled={purchasesPage === 0}
                    className="text-[12px] px-3 py-1 rounded"
                    style={{ background: 'var(--rm-bg-raised)', color: purchasesPage === 0 ? 'var(--rm-text-muted)' : 'var(--rm-text)', opacity: purchasesPage === 0 ? 0.5 : 1 }}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPurchasesPage(p => p + 1)}
                    disabled={(purchasesPage + 1) * PAGE_SIZE >= purchasesTotal}
                    className="text-[12px] px-3 py-1 rounded"
                    style={{ background: 'var(--rm-bg-raised)', color: (purchasesPage + 1) * PAGE_SIZE >= purchasesTotal ? 'var(--rm-text-muted)' : 'var(--rm-text)', opacity: (purchasesPage + 1) * PAGE_SIZE >= purchasesTotal ? 0.5 : 1 }}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Usage History ────────────────────────────────────── */}
      {subTab === 'usage' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[16px] font-semibold mb-1" style={{ color: 'var(--rm-text)' }}>Usage History</h3>
              <p className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>Credit consumption across runs, scenarios, and analysis</p>
            </div>
            <RmSelect
              value={usageFilter}
              onChange={v => { setUsageFilter(v as UsageSourceType | ''); setUsagePage(0); }}
              options={[
                { value: '', label: 'All Types' },
                { value: 'run', label: 'Run' },
                { value: 'scenario', label: 'Scenario' },
                { value: 'analysis', label: 'Analysis' },
                { value: 'export', label: 'Export' },
              ]}
              size="sm"
            />
          </div>

          {usageLoading ? (
            <div className="text-center py-8" style={{ color: 'var(--rm-text-muted)' }}>Loading...</div>
          ) : usage.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--rm-text-muted)' }}>
              <div className="text-[14px]">No usage events</div>
              <div className="text-[12px] mt-1">Credit consumption will appear here as you run tests.</div>
            </div>
          ) : (
            <>
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr><th>Time</th><th>Type</th><th>Source</th><th>Credits</th></tr>
                  </thead>
                  <tbody>
                    {usage.map(u => {
                      const sc = SOURCE_COLORS[u.source_type] || SOURCE_COLORS.export;
                      return (
                        <tr key={u.id}>
                          <td style={{ color: 'var(--rm-text-secondary)' }}>{formatDateTime(u.created_at)}</td>
                          <td><span className="text-[11px] px-2 py-0.5 rounded" style={{ background: sc.bg, color: sc.color }}>{u.source_type}</span></td>
                          <td style={{ color: 'var(--rm-text)' }}>{u.source_label || u.source_id}</td>
                          <td style={{ color: 'var(--rm-fail)' }}>-{u.credits_debited}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>
                  Showing {usagePage * PAGE_SIZE + 1}\u2013{Math.min((usagePage + 1) * PAGE_SIZE, usageTotal)} of {usageTotal}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setUsagePage(p => p - 1)}
                    disabled={usagePage === 0}
                    className="text-[12px] px-3 py-1 rounded"
                    style={{ background: 'var(--rm-bg-raised)', color: usagePage === 0 ? 'var(--rm-text-muted)' : 'var(--rm-text)', opacity: usagePage === 0 ? 0.5 : 1 }}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setUsagePage(p => p + 1)}
                    disabled={(usagePage + 1) * PAGE_SIZE >= usageTotal}
                    className="text-[12px] px-3 py-1 rounded"
                    style={{ background: 'var(--rm-bg-raised)', color: (usagePage + 1) * PAGE_SIZE >= usageTotal ? 'var(--rm-text-muted)' : 'var(--rm-text)', opacity: (usagePage + 1) * PAGE_SIZE >= usageTotal ? 0.5 : 1 }}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Checkout Modal */}
      {checkoutProduct && (
        <CheckoutModal
          product={checkoutProduct}
          onClose={() => setCheckoutProduct(null)}
          onComplete={handleCheckoutComplete}
        />
      )}
    </div>
  );
}
