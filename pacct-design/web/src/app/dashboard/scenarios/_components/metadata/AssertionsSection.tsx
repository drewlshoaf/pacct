'use client';

import SectionCard from '../SectionCard';
import DynamicListEditor from '../DynamicListEditor';
import RmSelect from '@/components/ui/RmSelect';
import type { ScenarioAssertion, SloMetric, SloOperator } from '../../types';
import { create_default_scenario_assertion } from '../../types';

const METRICS: { value: SloMetric; label: string; unit: string }[] = [
  { value: 'p50', label: 'P50 Latency', unit: 'ms' },
  { value: 'p95', label: 'P95 Latency', unit: 'ms' },
  { value: 'p99', label: 'P99 Latency', unit: 'ms' },
  { value: 'error_rate', label: 'Error Rate', unit: '%' },
  { value: 'throughput', label: 'Throughput', unit: 'rps' },
  { value: 'availability', label: 'Availability', unit: '%' },
  { value: 'stability', label: 'Stability', unit: '%' },
];

const OPERATORS: { value: SloOperator; label: string }[] = [
  { value: 'less_than', label: '<' },
  { value: 'greater_than', label: '>' },
  { value: 'equals', label: '=' },
];

interface Props {
  assertions: ScenarioAssertion[];
  onChange: (assertions: ScenarioAssertion[]) => void;
}

export default function AssertionsSection({ assertions, onChange }: Props) {
  return (
    <SectionCard title="SLO Assertions" description="Scenario-level performance targets. Enforced as hard gates in Gatekeeper mode (set on the plan).">
      <div
        className="flex items-start gap-2.5 rounded-lg px-3.5 py-3 mb-3 text-[12px] leading-[1.5]"
        style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text-secondary)' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0" style={{ color: 'var(--rm-text-muted)' }}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>
          Assertions are enforced as pass/fail gates when the plan&apos;s evaluation mode is set to <strong>Gatekeeper</strong>.
        </span>
      </div>
      <DynamicListEditor
        items={assertions}
        onChange={onChange}
        createDefault={create_default_scenario_assertion}
        addLabel="Add Assertion"
        emptyMessage="No SLO assertions defined."
        renderItem={(item, _index, update) => {
          const metricInfo = METRICS.find(m => m.value === item.metric);
          return (
            <div className="flex items-center gap-2">
              <RmSelect
                value={item.metric}
                onChange={v => {
                  const metric = v as SloMetric;
                  const info = METRICS.find(m => m.value === metric);
                  update('metric', metric);
                  if (info) update('unit', info.unit);
                }}
                options={METRICS}
                size="sm"
              />
              <RmSelect
                value={item.operator}
                onChange={v => update('operator', v as SloOperator)}
                options={OPERATORS}
                size="sm"
              />
              <input
                type="number"
                value={item.threshold}
                onChange={e => update('threshold', parseFloat(e.target.value) || 0)}
                className="w-24 text-[13px] px-3 py-2 rounded-lg border-none outline-none"
                style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text)' }}
              />
              <span className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>{metricInfo?.unit || item.unit}</span>
            </div>
          );
        }}
      />
    </SectionCard>
  );
}
