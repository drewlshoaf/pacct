'use client';

import { useState, useEffect, useRef } from 'react';
import type { CreditProduct, CreditPurchase, PaymentMethod, CreditBalance } from '@loadtoad/schema';
import { initiatePurchase, completePurchase, cancelPurchase } from '@/app/dashboard/organization/_store/creditsStore';

type Step = 'payment' | 'summary' | 'processing' | 'receipt';

interface CheckoutModalProps {
  product: CreditProduct;
  onClose: () => void;
  onComplete: () => void;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string; note: string }[] = [
  { value: 'credit_card', label: 'Credit Card', icon: '$', note: 'Instant settlement' },
  { value: 'apple_pay', label: 'Apple Pay', icon: '$', note: 'Instant settlement' },
  { value: 'bitcoin', label: 'Bitcoin', icon: 'BTC', note: '3% discount · ~10 min confirmation' },
];

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function CheckoutModal({ product, onClose, onComplete }: CheckoutModalProps) {
  const [step, setStep] = useState<Step>('payment');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('credit_card');
  const [purchase, setPurchase] = useState<CreditPurchase | null>(null);
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleInitiate = async () => {
    setError(null);
    setProcessing(true);
    try {
      const p = await initiatePurchase(product.id, selectedMethod);
      setPurchase(p);
      setStep('summary');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
    }
    setProcessing(false);
  };

  const handleComplete = async () => {
    if (!purchase) return;
    setError(null);
    setProcessing(true);
    setStep('processing');

    try {
      if (selectedMethod === 'bitcoin') {
        // Simulate Bitcoin flow: wait a moment then complete
        await new Promise(r => setTimeout(r, 2000));
      }

      const ref = selectedMethod === 'bitcoin'
        ? `btc_${Date.now().toString(36)}`
        : `pay_${Date.now().toString(36)}`;

      const result = await completePurchase(purchase.id, ref);
      setPurchase(result.purchase);
      setBalance(result.balance);
      setStep('receipt');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
      setStep('summary');
    }
    setProcessing(false);
  };

  const handleCancel = async () => {
    if (purchase && purchase.status !== 'completed') {
      try { await cancelPurchase(purchase.id); } catch { /* ignore */ }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="rounded-xl w-full max-w-lg shadow-2xl" style={{ background: 'var(--rm-bg-surface)', border: '1px solid var(--rm-border)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--rm-border)' }}>
          <h3 className="text-[16px] font-semibold" style={{ color: 'var(--rm-text)' }}>
            {step === 'receipt' ? 'Purchase Complete' : `Buy ${product.name}`}
          </h3>
          <button onClick={step === 'receipt' ? () => { onComplete(); onClose(); } : handleCancel} className="p-1 rounded" style={{ color: 'var(--rm-text-muted)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div className="px-6 py-5">
          {error && (
            <div className="mb-4 p-3 rounded-lg text-[12px]" style={{ background: 'rgba(255,59,48,0.08)', color: 'var(--rm-fail)', border: '1px solid rgba(255,59,48,0.15)' }}>
              {error}
            </div>
          )}

          {/* Step 1: Payment Method */}
          {step === 'payment' && (
            <div>
              <p className="text-[13px] mb-4" style={{ color: 'var(--rm-text-secondary)' }}>
                Select a payment method for <strong>{product.credits.toLocaleString()} credits</strong>
              </p>
              <div className="space-y-2 mb-5">
                {PAYMENT_METHODS.map(m => (
                  <button
                    key={m.value}
                    onClick={() => setSelectedMethod(m.value)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors"
                    style={{
                      background: selectedMethod === m.value ? 'var(--rm-signal-glow)' : 'var(--rm-bg-raised)',
                      border: selectedMethod === m.value ? '1px solid var(--rm-signal)' : '1px solid var(--rm-border)',
                    }}
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-[14px] font-bold flex-shrink-0" style={{ background: 'var(--rm-bg-surface)', color: 'var(--rm-signal)' }}>
                      {m.icon}
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] font-medium" style={{ color: 'var(--rm-text)' }}>{m.label}</div>
                      <div className="text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>{m.note}</div>
                    </div>
                    {selectedMethod === m.value && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--rm-signal)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                    )}
                  </button>
                ))}
              </div>
              <button
                onClick={handleInitiate}
                disabled={processing}
                className="btn btn-primary w-full text-[13px] py-2.5"
              >
                {processing ? 'Processing...' : 'Continue'}
              </button>
            </div>
          )}

          {/* Step 2: Order Summary */}
          {step === 'summary' && purchase && (
            <div>
              <div className="rounded-lg p-4 mb-4" style={{ background: 'var(--rm-bg-raised)', border: '1px solid var(--rm-border)' }}>
                <div className="text-[12px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--rm-text-muted)' }}>Order Summary</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[13px]">
                    <span style={{ color: 'var(--rm-text-secondary)' }}>{product.name} ({product.credits.toLocaleString()} credits)</span>
                    <span style={{ color: 'var(--rm-text)' }}>{formatCents(purchase.list_price_cents)}</span>
                  </div>
                  {purchase.discounts.map((d, i) => (
                    <div key={i} className="flex justify-between text-[12px]">
                      <span style={{ color: 'var(--rm-pass)' }}>{d.label} ({d.percent_off}% off)</span>
                      <span style={{ color: 'var(--rm-pass)' }}>-{formatCents(d.amount_off_cents)}</span>
                    </div>
                  ))}
                  <div className="pt-2 mt-2 flex justify-between text-[14px] font-semibold" style={{ borderTop: '1px solid var(--rm-border)' }}>
                    <span style={{ color: 'var(--rm-text)' }}>Total</span>
                    <span style={{ color: 'var(--rm-signal)' }}>{formatCents(purchase.final_price_cents)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-4 text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>
                <span>Payment: {PAYMENT_METHODS.find(m => m.value === selectedMethod)?.label}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setStep('payment'); setPurchase(null); }}
                  className="btn text-[13px] px-4 py-2"
                  style={{ color: 'var(--rm-text-secondary)' }}
                >
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={processing}
                  className="btn btn-primary flex-1 text-[13px] py-2"
                >
                  {processing ? 'Processing...' : `Pay ${formatCents(purchase.final_price_cents)}`}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Processing */}
          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 animate-pulse" style={{ background: 'var(--rm-signal-glow)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--rm-signal)" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
              </div>
              <div className="text-[14px] font-medium mb-1" style={{ color: 'var(--rm-text)' }}>
                {selectedMethod === 'bitcoin' ? 'Waiting for confirmation...' : 'Processing payment...'}
              </div>
              <div className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>
                {selectedMethod === 'bitcoin' ? 'This may take a few minutes' : 'This will only take a moment'}
              </div>
            </div>
          )}

          {/* Step 4: Receipt */}
          {step === 'receipt' && purchase && (
            <div>
              <div className="flex flex-col items-center mb-5">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(59,167,118,0.12)' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--rm-pass)" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
                <div className="text-[16px] font-semibold" style={{ color: 'var(--rm-text)' }}>Payment Successful</div>
                <div className="text-[13px] mt-1" style={{ color: 'var(--rm-text-secondary)' }}>
                  {purchase.credits.toLocaleString()} credits added to your account
                </div>
              </div>

              <div className="rounded-lg p-4 mb-4" style={{ background: 'var(--rm-bg-raised)', border: '1px solid var(--rm-border)' }}>
                <div className="space-y-2 text-[12px]">
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--rm-text-muted)' }}>Package</span>
                    <span style={{ color: 'var(--rm-text)' }}>{product.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--rm-text-muted)' }}>Credits</span>
                    <span style={{ color: 'var(--rm-text)' }}>{purchase.credits.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--rm-text-muted)' }}>Amount Paid</span>
                    <span style={{ color: 'var(--rm-text)' }}>{formatCents(purchase.final_price_cents)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--rm-text-muted)' }}>Reference</span>
                    <span className="font-mono text-[11px]" style={{ color: 'var(--rm-text-secondary)' }}>{purchase.payment_reference || '—'}</span>
                  </div>
                  {balance && (
                    <div className="flex justify-between pt-2 mt-2" style={{ borderTop: '1px solid var(--rm-border)' }}>
                      <span className="font-medium" style={{ color: 'var(--rm-text-muted)' }}>New Balance</span>
                      <span className="font-semibold" style={{ color: 'var(--rm-signal)' }}>{balance.balance.toLocaleString()} credits</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => { onComplete(); onClose(); }}
                className="btn btn-primary w-full text-[13px] py-2.5"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
