'use client';

import { ReactNode } from 'react';
import RmSelect from '@/components/ui/RmSelect';

// ─── Types ──────────────────────────────────────────────────────────────────

export type StatusType = { type: 'success' | 'error'; message: string } | null;

// ─── Constants ──────────────────────────────────────────────────────────────

export const INJECTOR_COLORS = ['#3BA776', '#2E8B3E', '#D9A441', '#4A9FD9', '#9B6BD4', '#D35D5D', '#E07D4F', '#5BC0BE', '#C4A35A', '#8B5E3C'];

// ─── Helper Components ──────────────────────────────────────────────────────

export function ConfigCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="card">
      <h3 className="text-[15px] font-semibold mb-0.5" style={{ color: 'var(--rm-text)' }}>{title}</h3>
      <p className="text-[12px] mb-5" style={{ color: 'var(--rm-text-muted)' }}>{description}</p>
      {children}
    </div>
  );
}

export function ConfigRow({ label, description, children, badge }: { label: string; description: string; children: ReactNode; badge?: string }) {
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--rm-border)' }}>
      <div className="min-w-0 mr-4">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium" style={{ color: 'var(--rm-text)' }}>{label}</span>
          {badge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'var(--rm-signal-glow)', color: 'var(--rm-signal)' }}>{badge}</span>
          )}
        </div>
        <div className="text-[12px] mt-0.5" style={{ color: 'var(--rm-text-muted)' }}>{description}</div>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

export function NumberField({ value, onChange, unit, min, max }: { value: number; onChange: (v: number) => void; unit?: string; min?: number; max?: number }) {
  return (
    <div className="flex items-center gap-2">
      <input type="number" value={value} onChange={e => onChange(Number(e.target.value))} min={min} max={max}
        className="text-[13px] px-3 py-1.5 rounded-lg border-none outline-none w-24 text-right" style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }} />
      {unit && <span className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>{unit}</span>}
    </div>
  );
}

export function ToggleField({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className="relative w-10 h-5 rounded-full transition-colors"
      style={{ background: value ? 'var(--rm-pass)' : 'var(--rm-border)' }}>
      <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
        style={{ left: value ? '22px' : '2px' }} />
    </button>
  );
}

export function SelectField({ value, options, onChange }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <RmSelect value={value} onChange={onChange} options={options} />
  );
}

export function MetricBox({ label, value, unit, color = 'var(--rm-pass)' }: { label: string; value: string | number; unit?: string; color?: string }) {
  return (
    <div className="px-4 py-3 rounded-lg text-center" style={{ background: 'var(--rm-bg-raised)' }}>
      <div className="text-[11px] mb-1" style={{ color: 'var(--rm-text-muted)' }}>{label}</div>
      <div className="text-[22px] font-bold" style={{ color }}>{value}</div>
      {unit && <div className="text-[10px] mt-0.5" style={{ color: 'var(--rm-text-muted)' }}>{unit}</div>}
    </div>
  );
}

export function ConnectionIndicator({ connected }: { connected: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2 h-2 rounded-full" style={{ background: connected ? 'var(--rm-pass)' : 'var(--rm-fail)' }} />
      <span className="text-[11px]" style={{ color: connected ? 'var(--rm-pass)' : 'var(--rm-fail)' }}>
        {connected ? 'Live' : 'Disconnected'}
      </span>
    </div>
  );
}

export function StatusToast({ status }: { status: NonNullable<StatusType> }) {
  return (
    <div className="mb-5 px-4 py-2.5 rounded-lg text-[13px]" style={{
      background: status.type === 'success' ? 'rgba(59,167,118,0.1)' : 'rgba(211,93,93,0.1)',
      border: `1px solid ${status.type === 'success' ? 'rgba(59,167,118,0.2)' : 'rgba(211,93,93,0.2)'}`,
      color: status.type === 'success' ? 'var(--rm-pass)' : 'var(--rm-fail)',
    }}>
      {status.message}
    </div>
  );
}
