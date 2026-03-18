'use client';

import type { TopologyConfig } from '@/hooks/useInfraStream';
import { ConfigCard, ConfigRow, NumberField, type StatusType, StatusToast } from './shared';

interface TopologyConfigViewProps {
  config: TopologyConfig;
  update: <K extends keyof TopologyConfig>(key: K, value: TopologyConfig[K]) => void;
  hasOverrides: boolean;
  status: StatusType;
  save: () => void;
  reset: () => void;
  saving: boolean;
}

export default function TopologyConfigView({ config, update, hasOverrides, status, save, reset, saving }: TopologyConfigViewProps) {
  return (
    <ConfigCard title="Topology Display" description="Thresholds that control how the Load Topology visualization renders target health during live runs">
      {status && <StatusToast status={status} />}

      <ConfigRow label="Degraded Threshold" description="Error rate (%) above which the target shows 'Degraded' with an orange indicator" badge="runtime">
        <NumberField value={config.degraded_error_pct} onChange={v => update('degraded_error_pct', v)} unit="%" min={0.5} max={50} />
      </ConfigRow>
      <ConfigRow label="Critical Threshold" description="Error rate (%) above which the target shows 'Critical' with a red indicator" badge="runtime">
        <NumberField value={config.critical_error_pct} onChange={v => update('critical_error_pct', v)} unit="%" min={1} max={100} />
      </ConfigRow>
      <ConfigRow label="Error Health Weight" description="How much each 1% of errors reduces the health bar (health = 100 - errorRate × weight)" badge="runtime">
        <NumberField value={config.error_health_weight} onChange={v => update('error_health_weight', v)} min={1} max={50} />
      </ConfigRow>
      <ConfigRow label="Latency Baseline" description="P95 latency (ms) below which no health penalty applies — set to your app's normal response time" badge="runtime">
        <NumberField value={config.latency_baseline_ms} onChange={v => update('latency_baseline_ms', v)} unit="ms" min={10} max={5000} />
      </ConfigRow>
      <ConfigRow label="Latency Health Weight" description="Health penalty per ms above the baseline (health -= (p95 - baseline) × weight)" badge="runtime">
        <NumberField value={config.latency_health_weight} onChange={v => update('latency_health_weight', v)} min={0.01} max={2} />
      </ConfigRow>
      <ConfigRow label="Health Green Above" description="Health percentage above which the bar shows green" badge="runtime">
        <NumberField value={config.health_green_above} onChange={v => update('health_green_above', v)} unit="%" min={10} max={99} />
      </ConfigRow>
      <ConfigRow label="Health Yellow Above" description="Health percentage above which the bar shows yellow (below = red)" badge="runtime">
        <NumberField value={config.health_yellow_above} onChange={v => update('health_yellow_above', v)} unit="%" min={5} max={90} />
      </ConfigRow>

      <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: '1px solid var(--rm-border)' }}>
        <div className="flex items-center gap-2">
          {hasOverrides && (
            <span className="text-[11px] px-2 py-0.5 rounded" style={{ background: 'rgba(217,164,65,0.12)', color: 'var(--rm-caution)' }}>Overrides active</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={reset} disabled={saving} className="btn btn-ghost text-[12px]">Reset</button>
          <button onClick={save} disabled={saving} className="btn btn-primary text-[12px]">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </ConfigCard>
  );
}
