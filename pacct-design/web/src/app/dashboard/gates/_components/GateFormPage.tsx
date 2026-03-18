'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import PortalLayout, { PageHeader } from '@/components/layout/PortalLayout';
import RmSelect from '@/components/ui/RmSelect';
import { saveGateToServer, saveGate } from '../_store/gateStore';
import type { Gate, GateCondition, GateMetric, GateOperator, GateEntityType } from '@loadtoad/schema';
import { create_default_gate_condition, create_default_gate, GATE_METRIC_UNITS } from '@loadtoad/schema';

// ── Constants ──

const METRICS: { value: GateMetric; label: string }[] = [
  { value: 'latency_p95', label: 'Latency P95' },
  { value: 'latency_p99', label: 'Latency P99' },
  { value: 'latency_max', label: 'Latency Max' },
  { value: 'error_count', label: 'Error Count' },
  { value: 'achieved_rps', label: 'Achieved RPS' },
  { value: 'completion_time', label: 'Completion Time' },
  { value: 'completion_status', label: 'Completion Status' },
  { value: 'failure_rate', label: 'Failure Rate' },
  { value: 'bytes_received', label: 'Bytes Received' },
];

const OPERATORS: { value: GateOperator; label: string }[] = [
  { value: 'less_than', label: '<' },
  { value: 'greater_than', label: '>' },
  { value: 'equals', label: '=' },
  { value: 'not_equals', label: '!=' },
];

// Gates are scenario-only — no step or plan entity types

interface EntityOption {
  id: string;
  name: string;
  type: GateEntityType;
  parentName?: string;
}

// ── Entity Picker ──

function EntityPicker({
  entityId,
  onChange,
}: {
  entityId: string;
  onChange: (id: string, name: string) => void;
}) {
  const [options, setOptions] = useState<EntityOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    loadScenarios().then(opts => {
      setOptions(opts);
      setLoading(false);
    });
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter(o =>
      o.name.toLowerCase().includes(q) ||
      (o.parentName ?? '').toLowerCase().includes(q)
    );
  }, [options, search]);

  const selectedName = options.find(o => o.id === entityId)?.name ?? '';

  return (
    <div ref={wrapperRef} className="relative">
      <div
        className="w-full px-3 py-2 rounded-lg text-[13px] cursor-pointer flex items-center justify-between"
        style={{
          background: 'var(--rm-bg-raised)',
          border: '1px solid var(--rm-border)',
          color: selectedName ? 'var(--rm-text)' : 'var(--rm-text-muted)',
        }}
        onClick={() => setOpen(!open)}
      >
        <span className="truncate">{selectedName || 'Select an entity...'}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="shrink-0 ml-2">
          <path d="M2 4L5 7L8 4" stroke="var(--rm-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-50 shadow-lg"
          style={{ background: 'var(--rm-bg-surface)', border: '1px solid var(--rm-border)', maxHeight: '280px' }}
        >
          {/* Search */}
          <div className="p-2" style={{ borderBottom: '1px solid var(--rm-border)' }}>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full px-2.5 py-1.5 rounded text-[12px] outline-none"
              style={{ background: 'var(--rm-bg-raised)', border: '1px solid var(--rm-border)', color: 'var(--rm-text)' }}
              autoFocus
            />
          </div>

          {/* Options */}
          <div className="overflow-y-auto" style={{ maxHeight: '220px' }}>
            {loading ? (
              <div className="px-3 py-4 text-center text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>
                {options.length === 0 ? 'No scenarios found' : 'No matches'}
              </div>
            ) : filtered.map(opt => (
              <div
                key={opt.id}
                className="px-3 py-2 cursor-pointer transition-colors"
                style={{
                  background: opt.id === entityId ? 'var(--rm-signal-glow)' : 'transparent',
                  color: 'var(--rm-text)',
                }}
                onMouseEnter={e => { if (opt.id !== entityId) e.currentTarget.style.background = 'var(--rm-bg-raised)'; }}
                onMouseLeave={e => { if (opt.id !== entityId) e.currentTarget.style.background = 'transparent'; }}
                onClick={() => {
                  onChange(opt.id, opt.name);
                  setOpen(false);
                  setSearch('');
                }}
              >
                <div className="text-[12px] font-medium truncate">{opt.name || 'Untitled'}</div>
                {opt.parentName && (
                  <div className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--rm-text-muted)' }}>
                    in {opt.parentName}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

async function loadScenarios(): Promise<EntityOption[]> {
  try {
    const res = await fetch('/api/scenarios');
    if (!res.ok) return [];
    const scenarios = await res.json();
    return scenarios.map((s: { metadata?: { id: string; name: string }; id?: string; name?: string }) => ({
      id: s.metadata?.id ?? s.id,
      name: s.metadata?.name ?? s.name ?? '',
      type: 'scenario' as const,
    }));
  } catch {
    return [];
  }
}

// ── Main Form ──

interface GateFormPageProps {
  gate?: Gate;
}

export default function GateFormPage({ gate }: GateFormPageProps) {
  const router = useRouter();
  const isEdit = !!gate;

  const [name, setName] = useState(gate?.name ?? '');
  const [description, setDescription] = useState(gate?.description ?? '');
  const [entityId, setEntityId] = useState(gate?.entity_id ?? '');
  const [entityName, setEntityName] = useState(gate?.entity_name ?? '');
  const [conditions, setConditions] = useState<GateCondition[]>(gate?.conditions ?? [create_default_gate_condition()]);
  const [enabled, setEnabled] = useState(gate?.enabled ?? true);
  const [retroactive, setRetroactive] = useState(gate?.retroactive ?? true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const now = new Date().toISOString();
    const saved: Gate = {
      id: gate?.id ?? crypto.randomUUID(),
      name,
      description,
      entity_type: 'scenario' as GateEntityType,
      entity_id: entityId,
      entity_name: entityName,
      conditions,
      enabled,
      retroactive,
      created_at: gate?.created_at ?? now,
      updated_at: now,
    };
    try {
      await saveGateToServer(saved);
    } catch {
      saveGate(saved);
    }
    setSaving(false);
    router.push('/dashboard/gates');
  };

  const addCondition = () => {
    setConditions([...conditions, create_default_gate_condition()]);
  };

  const removeCondition = (id: string) => {
    if (conditions.length <= 1) return;
    setConditions(conditions.filter(c => c.id !== id));
  };

  const updateCondition = (id: string, field: keyof GateCondition, value: string | number) => {
    setConditions(conditions.map(c => {
      if (c.id !== id) return c;
      const updated = { ...c, [field]: value };
      // Auto-set unit when metric changes
      if (field === 'metric') {
        updated.unit = GATE_METRIC_UNITS[value as GateMetric] ?? '';
      }
      return updated;
    }));
  };

  const inputStyle = {
    background: 'var(--rm-bg-raised)',
    border: '1px solid var(--rm-border)',
    color: 'var(--rm-text)',
  };

  const labelStyle = {
    color: 'var(--rm-text-secondary)',
    fontSize: '11px',
    fontWeight: 500 as const,
    marginBottom: '4px',
    display: 'block' as const,
  };

  const sectionStyle = {
    background: 'var(--rm-bg-surface)',
    border: '1px solid var(--rm-border)',
    borderRadius: '12px',
    padding: '20px',
  };

  return (
    <PortalLayout>
      <PageHeader
        title={isEdit ? 'Edit Gate' : 'Create Gate'}
        description={isEdit ? `Editing "${gate.name}"` : 'Define pass/fail criteria for a performance entity'}
        actions={
          <button
            onClick={() => router.push('/dashboard/gates')}
            className="text-[13px] px-4 py-2 rounded-lg font-medium transition-colors"
            style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text-secondary)', border: '1px solid var(--rm-border)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--rm-border)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--rm-bg-raised)'; }}
          >
            Cancel
          </button>
        }
      />

      <div className="max-w-[720px] space-y-5">
        {/* Basics */}
        <section style={sectionStyle}>
          <h3 className="text-[12px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--rm-text-muted)' }}>Basics</h3>
          <div className="space-y-3">
            <div>
              <label style={labelStyle}>Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. API Latency Gate"
                className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Optional description..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg text-[13px] outline-none resize-none"
                style={inputStyle}
              />
            </div>
          </div>
        </section>

        {/* Scenario */}
        <section style={sectionStyle}>
          <h3 className="text-[12px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--rm-text-muted)' }}>Scenario</h3>
          <div>
            <label style={labelStyle}>Select Scenario</label>
            <EntityPicker
              entityId={entityId}
              onChange={(id, n) => { setEntityId(id); setEntityName(n); }}
            />
          </div>
        </section>

        {/* Conditions */}
        <section style={sectionStyle}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--rm-text-muted)' }}>
              Conditions
              <span className="ml-1.5 text-[10px] font-normal normal-case" style={{ color: 'var(--rm-text-muted)' }}>(all must pass)</span>
            </h3>
            <button
              onClick={addCondition}
              className="text-[11px] font-medium px-2.5 py-1 rounded transition-colors"
              style={{ background: 'var(--rm-signal-glow)', color: 'var(--rm-signal)' }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            >
              + Add Condition
            </button>
          </div>
          <div className="space-y-2">
            {conditions.map((cond) => (
              <div
                key={cond.id}
                className="flex items-center gap-2 p-3 rounded-lg"
                style={{ background: 'var(--rm-bg-raised)', border: '1px solid var(--rm-border)' }}
              >
                <div className="flex-1 min-w-0">
                  <label style={{ ...labelStyle, fontSize: '10px' }}>Metric</label>
                  <RmSelect
                    value={cond.metric}
                    onChange={v => updateCondition(cond.id, 'metric', v)}
                    options={METRICS}
                  />
                </div>
                <div className="w-16">
                  <label style={{ ...labelStyle, fontSize: '10px' }}>Op</label>
                  <RmSelect
                    value={cond.operator}
                    onChange={v => updateCondition(cond.id, 'operator', v)}
                    options={OPERATORS}
                  />
                </div>
                <div className="w-24">
                  <label style={{ ...labelStyle, fontSize: '10px' }}>Threshold</label>
                  <input
                    type="number"
                    value={cond.threshold}
                    onChange={e => updateCondition(cond.id, 'threshold', parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 rounded text-[12px] outline-none text-right"
                    style={{ background: 'var(--rm-bg-surface)', border: '1px solid var(--rm-border)', color: 'var(--rm-text)' }}
                  />
                </div>
                <div className="w-16">
                  <label style={{ ...labelStyle, fontSize: '10px' }}>Unit</label>
                  <div
                    className="w-full px-2 py-1.5 rounded text-[12px] text-center"
                    style={{ background: 'var(--rm-bg-surface)', border: '1px solid var(--rm-border)', color: 'var(--rm-text-muted)' }}
                  >
                    {cond.unit || '—'}
                  </div>
                </div>
                {conditions.length > 1 && (
                  <div className="pt-4">
                    <button
                      onClick={() => removeCondition(cond.id)}
                      className="p-1 rounded hover:bg-red-500/10 shrink-0"
                      title="Remove condition"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--rm-fail)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* State */}
        <section style={sectionStyle}>
          <h3 className="text-[12px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--rm-text-muted)' }}>State</h3>
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              className="relative w-9 h-5 rounded-full transition-colors cursor-pointer"
              style={{ background: enabled ? 'var(--rm-signal)' : 'var(--rm-border)' }}
              onClick={() => setEnabled(!enabled)}
            >
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full transition-transform"
                style={{
                  background: 'white',
                  transform: enabled ? 'translateX(18px)' : 'translateX(2px)',
                }}
              />
            </div>
            <span className="text-[13px]" style={{ color: 'var(--rm-text)' }}>
              {enabled ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        </section>

        {/* Retroactive */}
        <section style={sectionStyle}>
          <h3 className="text-[12px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--rm-text-muted)' }}>Evaluation</h3>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={retroactive}
              onChange={() => setRetroactive(!retroactive)}
              className="mt-0.5 cursor-pointer accent-[var(--rm-signal)]"
            />
            <div>
              <span className="text-[13px] font-medium" style={{ color: 'var(--rm-text)' }}>
                Apply gate to existing test
              </span>
              <p className="text-[11px] mt-1" style={{ color: 'var(--rm-text-muted)' }}>
                {retroactive
                  ? 'Gate will be evaluated retroactively against the most recent run and results will appear on the dashboard immediately.'
                  : 'Gate will show as "not evaluated" until the next run. Upon the next run, the gate will be applied.'}
              </p>
            </div>
          </label>
        </section>

        {/* Save */}
        <div className="flex items-center gap-3 pb-8">
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="text-[13px] px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--rm-signal)', color: 'var(--rm-bg-void)' }}
          >
            {saving ? 'Saving...' : isEdit ? 'Update Gate' : 'Create Gate'}
          </button>
          <button
            onClick={() => router.push('/dashboard/gates')}
            className="text-[13px] px-4 py-2.5 rounded-lg font-medium transition-colors"
            style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text-secondary)', border: '1px solid var(--rm-border)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--rm-border)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--rm-bg-raised)'; }}
          >
            Cancel
          </button>
        </div>
      </div>
    </PortalLayout>
  );
}
