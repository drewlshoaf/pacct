'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PortalLayout, { PageHeader } from '@/components/layout/PortalLayout';
import { createPlan, updatePlan, fetchPlans } from '@/lib/api';
import type { Plan, PlanSchedule, PlanScheduleType, PlanStatus, Scenario } from '@loadtoad/schema';
import { create_default_plan } from '@loadtoad/schema';
import { useScenarios } from '../../scenarios/_store/scenarioStore';
import { useGates } from '../../gates/_store/gateStore';
import RmSelect from '@/components/ui/RmSelect';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SCHEDULE_TYPES: { value: PlanScheduleType; label: string }[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'once', label: 'Once' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'cron', label: 'Cron' },
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
];

function describeSchedule(schedule: PlanSchedule): string {
  const time = schedule.time ?? '';
  const tz = schedule.timezone ? ` ${schedule.timezone}` : '';
  switch (schedule.type) {
    case 'manual': return 'Manual \u2014 run on demand';
    case 'on_deploy': return 'Triggered on deploy';
    case 'once': {
      if (!schedule.scheduled_at) return 'Once (select date/time)';
      const d = new Date(schedule.scheduled_at);
      return `Once on ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${time || d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}${tz}`;
    }
    case 'daily': {
      if (schedule.days && schedule.days.length > 0 && schedule.days.length < 7) {
        const names = schedule.days.map(d => DAY_LABELS[d]).join(', ');
        return `${names} at ${time || '06:00'}${tz}`;
      }
      return `Daily at ${time || '06:00'}${tz}`;
    }
    case 'weekly': {
      const day = schedule.days?.[0] ?? 6;
      return `Weekly on ${DAY_LABELS[day]} at ${time || '06:00'}${tz}`;
    }
    case 'monthly': return `Monthly on the 1st at ${time || '06:00'}${tz}`;
    case 'quarterly': return `Quarterly on the 1st at ${time || '06:00'}${tz}`;
    case 'cron': return schedule.expression ? `Cron: ${schedule.expression}` : 'Enter cron expression';
    default: return '';
  }
}

function SortableScenarioItem({
  id,
  index,
  name,
  typeBadge,
  onRemove,
}: {
  id: string;
  index: number;
  name: string;
  typeBadge: string;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      className="flex items-center gap-2 px-3 py-2 rounded-lg"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        zIndex: isDragging ? 10 : undefined,
        background: isDragging ? 'var(--rm-bg-raised)' : 'var(--rm-signal-glow)',
      }}
    >
      <button
        type="button"
        {...listeners}
        className="flex-shrink-0 p-0.5 rounded cursor-grab active:cursor-grabbing"
        style={{ color: 'var(--rm-text-muted)' }}
        title="Drag to reorder"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="5" cy="3" r="1.5" /><circle cx="11" cy="3" r="1.5" />
          <circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" />
          <circle cx="5" cy="13" r="1.5" /><circle cx="11" cy="13" r="1.5" />
        </svg>
      </button>
      <span className="text-[10px] font-bold w-5 text-center flex-shrink-0" style={{ color: 'var(--rm-text-muted)' }}>
        {index + 1}
      </span>
      <span className="text-[12px] font-medium truncate flex-1 min-w-0" style={{ color: 'var(--rm-text)' }}>
        {name}
      </span>
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text-muted)' }}>
        {typeBadge}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="flex-shrink-0 p-0.5 rounded transition-colors"
        style={{ color: 'var(--rm-text-muted)' }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--rm-fail)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--rm-text-muted)'; }}
        title="Remove scenario"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
        </svg>
      </button>
    </div>
  );
}

interface PlanBuilderFormProps {
  initialPlan?: Plan;
  mode: 'create' | 'edit';
}

export default function PlanBuilderForm({ initialPlan, mode }: PlanBuilderFormProps) {
  const router = useRouter();
  const scenarios = useScenarios();
  const allGates = useGates();
  const [saving, setSaving] = useState(false);
  const [scenarioSearch, setScenarioSearch] = useState('');
  const [gateSearch, setGateSearch] = useState('');

  const [plan, setPlan] = useState<Plan>(() => initialPlan ?? create_default_plan());

  const update = (patch: Partial<Plan>) => setPlan(p => ({ ...p, ...patch }));
  const updateSchedule = (patch: Partial<PlanSchedule>) =>
    setPlan(p => ({ ...p, schedule: { ...p.schedule, ...patch } }));

  // Filter scenarios for checklist
  const filteredScenarios = scenarios.filter(s => {
    if (!scenarioSearch) return true;
    const q = scenarioSearch.toLowerCase();
    return s.metadata.name.toLowerCase().includes(q) || s.metadata.description.toLowerCase().includes(q);
  });

  const toggleScenario = (id: string) => {
    const current = plan.scenario_ids;
    if (current.includes(id)) {
      update({ scenario_ids: current.filter(s => s !== id) });
    } else {
      update({ scenario_ids: [...current, id] });
    }
  };

  // dnd-kit sensors (same config as DraggableChartStack)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleScenarioDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = plan.scenario_ids;
    const from = ids.indexOf(active.id as string);
    const to = ids.indexOf(over.id as string);
    if (from !== -1 && to !== -1) {
      update({ scenario_ids: arrayMove(ids, from, to) });
    }
  };

  // Lookup map: scenario id → scenario object
  const scenarioMap = new Map(scenarios.map(s => [s.metadata.id, s]));

  // Gates relevant to selected scenarios (or already selected)
  const relevantGates = allGates.filter(g =>
    plan.scenario_ids.includes(g.entity_id) || (plan.gate_ids ?? []).includes(g.id)
  );
  const filteredGates = relevantGates.filter(g => {
    if (!gateSearch) return true;
    const q = gateSearch.toLowerCase();
    return g.name.toLowerCase().includes(q) || g.entity_name.toLowerCase().includes(q);
  });

  const toggleGate = (id: string) => {
    const current = plan.gate_ids ?? [];
    if (current.includes(id)) {
      update({ gate_ids: current.filter(g => g !== id) });
    } else {
      update({ gate_ids: [...current, id] });
    }
  };

  const toggleDay = (day: number) => {
    const current = plan.schedule.days ?? [];
    if (current.includes(day)) {
      updateSchedule({ days: current.filter(d => d !== day) });
    } else {
      updateSchedule({ days: [...current, day].sort() });
    }
  };

  const handleSave = async () => {
    if (!plan.name.trim()) return;
    setSaving(true);
    plan.updated_at = new Date().toISOString();
    const result = mode === 'create'
      ? await createPlan(plan)
      : await updatePlan(plan.id, plan);
    setSaving(false);
    if (result) {
      router.push(`/dashboard/plans/${result.id}`);
    }
  };

  const showTimeInput = ['once', 'daily', 'weekly', 'monthly', 'quarterly'].includes(plan.schedule.type);
  const showDays = plan.schedule.type === 'daily' || plan.schedule.type === 'weekly';
  const showDatePicker = plan.schedule.type === 'once';
  const showCronInput = plan.schedule.type === 'cron';
  const showTimezone = showTimeInput || showCronInput;

  const cardStyle = {
    background: 'var(--rm-bg-surface)',
    border: '1px solid var(--rm-border)',
    borderRadius: 12,
    padding: '20px 24px',
    marginBottom: 16,
  };

  const labelStyle = {
    display: 'block' as const,
    fontSize: 12,
    fontWeight: 600 as const,
    color: 'var(--rm-text-secondary)',
    marginBottom: 6,
  };

  return (
    <PortalLayout>
      <PageHeader title={mode === 'create' ? 'Create Plan' : 'Edit Plan'} />

      {/* Basic Info */}
      <div style={cardStyle}>
        <h3 className="text-[13px] font-semibold mb-4" style={{ color: 'var(--rm-text)' }}>Basic Info</h3>
        <div className="space-y-4">
          <div>
            <label style={labelStyle}>Name *</label>
            <input
              type="text"
              value={plan.name}
              onChange={e => update({ name: e.target.value })}
              placeholder="e.g. Nightly Regression Suite"
              className="input w-full"
              style={{ fontSize: 13 }}
            />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              value={plan.description}
              onChange={e => update({ description: e.target.value })}
              placeholder="What does this plan test?"
              className="input w-full"
              rows={2}
              style={{ fontSize: 13, resize: 'vertical' }}
            />
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <div className="flex gap-2">
              {(['active', 'paused'] as PlanStatus[]).map(s => (
                <button
                  key={s}
                  onClick={() => update({ status: s })}
                  className="text-[12px] px-3 py-1.5 rounded-md font-medium transition-colors"
                  style={{
                    background: plan.status === s ? 'var(--rm-signal-glow)' : 'var(--rm-bg-raised)',
                    color: plan.status === s ? 'var(--rm-signal)' : 'var(--rm-text-muted)',
                    border: `1px solid ${plan.status === s ? 'var(--rm-signal)' : 'var(--rm-border)'}`,
                  }}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Scenarios */}
      <div style={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[13px] font-semibold" style={{ color: 'var(--rm-text)' }}>Scenarios</h3>
          <span className="text-[11px] font-medium" style={{ color: 'var(--rm-text-muted)' }}>
            {plan.scenario_ids.length} selected
          </span>
        </div>

        {scenarios.length > 5 && (
          <input
            type="text"
            placeholder="Filter scenarios..."
            value={scenarioSearch}
            onChange={e => setScenarioSearch(e.target.value)}
            className="input w-full mb-2"
            style={{ fontSize: 12 }}
          />
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleScenarioDragEnd}>
          <SortableContext items={plan.scenario_ids} strategy={verticalListSortingStrategy}>
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {/* Selected scenarios — draggable, in run order */}
              {plan.scenario_ids.map((id, i) => {
                const s = scenarioMap.get(id);
                if (!s) return null;
                // Hide if filtered out
                if (scenarioSearch) {
                  const q = scenarioSearch.toLowerCase();
                  if (!s.metadata.name.toLowerCase().includes(q) && !s.metadata.description.toLowerCase().includes(q)) return null;
                }
                return (
                  <SortableScenarioItem
                    key={id}
                    id={id}
                    index={i}
                    name={s.metadata.name}
                    typeBadge={(s.steps?.[0]?.config.step_type ?? 'rest').toUpperCase()}
                    onRemove={() => toggleScenario(id)}
                  />
                );
              })}

              {/* Divider between selected and unselected */}
              {plan.scenario_ids.length > 0 && filteredScenarios.some(s => !plan.scenario_ids.includes(s.metadata.id)) && (
                <div className="py-1">
                  <div style={{ height: 1, background: 'var(--rm-border)' }} />
                </div>
              )}

              {/* Unselected scenarios */}
              {filteredScenarios.length === 0 && scenarios.length === 0 ? (
                <p className="text-[12px] py-4 text-center" style={{ color: 'var(--rm-text-muted)' }}>
                  No scenarios created yet.
                </p>
              ) : filteredScenarios.length === 0 && scenarios.length > 0 ? (
                <p className="text-[12px] py-4 text-center" style={{ color: 'var(--rm-text-muted)' }}>
                  No scenarios match filter.
                </p>
              ) : filteredScenarios
                  .filter(s => !plan.scenario_ids.includes(s.metadata.id))
                  .map(s => (
                    <label
                      key={s.metadata.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors"
                      style={{ background: 'transparent' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--rm-bg-raised)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <input
                        type="checkbox"
                        checked={false}
                        onChange={() => toggleScenario(s.metadata.id)}
                        className="accent-[var(--rm-signal)] flex-shrink-0"
                      />
                      <span className="text-[12px] font-medium truncate flex-1 min-w-0" style={{ color: 'var(--rm-text)' }}>
                        {s.metadata.name}
                      </span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text-muted)' }}>
                        {(s.steps?.[0]?.config.step_type ?? 'rest').toUpperCase()}
                      </span>
                    </label>
                  ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Gates */}
      <div style={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[13px] font-semibold" style={{ color: 'var(--rm-text)' }}>Gates</h3>
          <span className="text-[11px] font-medium" style={{ color: 'var(--rm-text-muted)' }}>
            {(plan.gate_ids ?? []).length} selected
          </span>
        </div>
        {relevantGates.length > 5 && (
          <input
            type="text"
            placeholder="Filter gates..."
            value={gateSearch}
            onChange={e => setGateSearch(e.target.value)}
            className="input w-full mb-3"
            style={{ fontSize: 12 }}
          />
        )}
        <div className="space-y-1 max-h-[280px] overflow-y-auto">
          {plan.scenario_ids.length === 0 ? (
            <p className="text-[12px] py-4 text-center" style={{ color: 'var(--rm-text-muted)' }}>
              Select scenarios first to see available gates.
            </p>
          ) : filteredGates.length === 0 ? (
            <p className="text-[12px] py-4 text-center" style={{ color: 'var(--rm-text-muted)' }}>
              {allGates.length === 0 ? 'No gates created yet.' : 'No gates available for selected scenarios.'}
            </p>
          ) : filteredGates.map(g => {
            const checked = (plan.gate_ids ?? []).includes(g.id);
            return (
              <label
                key={g.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors"
                style={{ background: checked ? 'var(--rm-signal-glow)' : 'transparent' }}
                onMouseEnter={e => { if (!checked) e.currentTarget.style.background = 'var(--rm-bg-raised)'; }}
                onMouseLeave={e => { if (!checked) e.currentTarget.style.background = 'transparent'; }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleGate(g.id)}
                  className="accent-[var(--rm-signal)]"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-[12px] font-medium truncate block" style={{ color: 'var(--rm-text)' }}>{g.name}</span>
                  <span className="text-[10px] truncate block" style={{ color: 'var(--rm-text-muted)' }}>
                    {g.entity_name} &middot; {g.conditions.length} condition{g.conditions.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: 'var(--rm-signal-glow)', color: 'var(--rm-text-muted)' }}>
                  {g.entity_type.toUpperCase()}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Schedule */}
      <div style={cardStyle}>
        <h3 className="text-[13px] font-semibold mb-4" style={{ color: 'var(--rm-text)' }}>Schedule</h3>
        <div className="space-y-4">
          <div>
            <label style={labelStyle}>Schedule Type</label>
            <RmSelect
              value={plan.schedule.type}
              onChange={v => updateSchedule({ type: v as PlanScheduleType, expression: v === 'cron' ? '' : plan.schedule.expression })}
              options={SCHEDULE_TYPES.map(t => ({ value: t.value, label: t.label }))}
              size="sm"
            />
          </div>

          {showDatePicker && (
            <div>
              <label style={labelStyle}>Date & Time</label>
              <input
                type="datetime-local"
                value={plan.schedule.scheduled_at?.slice(0, 16) ?? ''}
                onChange={e => updateSchedule({ scheduled_at: new Date(e.target.value).toISOString() })}
                className="input"
                style={{ fontSize: 13 }}
              />
            </div>
          )}

          {showTimeInput && !showDatePicker && (
            <div>
              <label style={labelStyle}>Time</label>
              <input
                type="time"
                value={plan.schedule.time ?? '06:00'}
                onChange={e => updateSchedule({ time: e.target.value })}
                className="input"
                style={{ fontSize: 13, width: 140 }}
              />
            </div>
          )}

          {showDays && (
            <div>
              <label style={labelStyle}>
                {plan.schedule.type === 'weekly' ? 'Day of Week' : 'Days (optional)'}
              </label>
              <div className="flex gap-1.5">
                {DAY_LABELS.map((d, i) => {
                  const selected = plan.schedule.type === 'weekly'
                    ? (plan.schedule.days?.[0] ?? 6) === i
                    : (plan.schedule.days ?? []).includes(i);
                  return (
                    <button
                      key={d}
                      onClick={() => {
                        if (plan.schedule.type === 'weekly') {
                          updateSchedule({ days: [i] });
                        } else {
                          toggleDay(i);
                        }
                      }}
                      className="w-9 h-8 rounded-md text-[11px] font-medium transition-colors"
                      style={{
                        background: selected ? 'var(--rm-signal)' : 'var(--rm-bg-raised)',
                        color: selected ? '#fff' : 'var(--rm-text-muted)',
                        border: `1px solid ${selected ? 'var(--rm-signal)' : 'var(--rm-border)'}`,
                      }}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {showCronInput && (
            <div>
              <label style={labelStyle}>Cron Expression</label>
              <input
                type="text"
                value={plan.schedule.expression}
                onChange={e => updateSchedule({ expression: e.target.value })}
                placeholder="0 6 * * *"
                className="input font-mono"
                style={{ fontSize: 13, width: 240 }}
              />
            </div>
          )}

          {showTimezone && (
            <div>
              <label style={labelStyle}>Timezone</label>
              <RmSelect
                value={plan.schedule.timezone ?? 'UTC'}
                onChange={v => updateSchedule({ timezone: v })}
                options={COMMON_TIMEZONES.map(tz => ({ value: tz, label: tz }))}
                size="sm"
                searchable
              />
            </div>
          )}

          {/* Schedule preview */}
          <div className="px-3 py-2 rounded-lg text-[12px]" style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text-secondary)' }}>
            {describeSchedule(plan.schedule)}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center gap-3 pt-2 pb-8">
        <button
          onClick={() => router.back()}
          className="btn btn-ghost text-[13px] px-4 py-2"
        >
          Cancel
        </button>
        <div className="flex-1" />
        <button
          onClick={handleSave}
          disabled={saving || !plan.name.trim()}
          className="text-[13px] px-5 py-2 rounded-lg font-medium transition-colors"
          style={{
            background: 'var(--rm-signal)',
            color: 'var(--rm-bg-void)',
            opacity: saving || !plan.name.trim() ? 0.5 : 1,
          }}
        >
          {saving ? 'Saving...' : mode === 'create' ? 'Create Plan' : 'Save Changes'}
        </button>
      </div>
    </PortalLayout>
  );
}
