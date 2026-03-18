'use client';

import Link from 'next/link';
import type { InjectorConfig } from '@/hooks/useInfraStream';
import { ConfigCard, ConfigRow, NumberField, SelectField, type StatusType, StatusToast } from './shared';

// ─── Env Var Reference ──────────────────────────────────────────────────────

function EnvVarReference() {
  const vars = [
    { name: 'LT_MAX_RUNS', default: '2', desc: 'Maximum parallel load test runs', runtime: true },
    { name: 'LT_VUS_PER_INJECTOR', default: '250', desc: 'VUs before adding another injector process', runtime: true },
    { name: 'LT_MAX_INJECTORS', default: '10', desc: 'Hard cap on injector count per run', runtime: true },
    { name: 'LT_SEGMENT_CONCURRENCY', default: '10', desc: 'Parallel load segments per worker container', runtime: true },
    { name: 'LT_WORKER_LOCK_DURATION_MS', default: '660000', desc: 'BullMQ stall timeout for long runs', runtime: true },
    { name: 'LT_WORKER_REPLICAS', default: '3', desc: 'Number of worker containers', runtime: false },
    { name: 'LT_WORKER_CPU_LIMIT', default: '2.0', desc: 'CPU cores per worker', runtime: false },
    { name: 'LT_WORKER_MEM_LIMIT', default: '2G', desc: 'Memory per worker', runtime: false },
  ];

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[15px] font-semibold" style={{ color: 'var(--rm-text)' }}>Environment Variables</h3>
        <Link href="/dashboard/workspace" className="text-[12px] font-medium no-underline" style={{ color: 'var(--rm-signal)' }}>
          Open Workspace
        </Link>
      </div>
      <p className="text-[12px] mb-4" style={{ color: 'var(--rm-text-muted)' }}>
        Set in <span className="font-mono">.env</span> or <span className="font-mono">docker-compose.yml</span>. Runtime-configurable values can also be set from the admin panel above.
      </p>

      <div className="overflow-hidden rounded-lg" style={{ border: '1px solid var(--rm-border)' }}>
        <table className="w-full text-[12px]">
          <thead>
            <tr style={{ background: 'var(--rm-bg-raised)' }}>
              <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--rm-text-secondary)' }}>Variable</th>
              <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--rm-text-secondary)' }}>Default</th>
              <th className="text-left px-3 py-2 font-medium" style={{ color: 'var(--rm-text-secondary)' }}>Description</th>
              <th className="text-center px-3 py-2 font-medium" style={{ color: 'var(--rm-text-secondary)' }}>Hot Reload</th>
            </tr>
          </thead>
          <tbody>
            {vars.map(v => (
              <tr key={v.name} style={{ borderTop: '1px solid var(--rm-border)' }}>
                <td className="px-3 py-2 font-mono" style={{ color: 'var(--rm-caution)' }}>{v.name}</td>
                <td className="px-3 py-2 font-mono" style={{ color: 'var(--rm-text)' }}>{v.default}</td>
                <td className="px-3 py-2" style={{ color: 'var(--rm-text-muted)' }}>{v.desc}</td>
                <td className="px-3 py-2 text-center">
                  {v.runtime ? (
                    <span className="inline-block w-4 h-4 rounded-full text-[10px] leading-4 text-center" style={{ background: 'rgba(59,167,118,0.15)', color: 'var(--rm-pass)' }}>&#10003;</span>
                  ) : (
                    <span className="text-[10px]" style={{ color: 'var(--rm-text-muted)' }}>redeploy</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Configuration View ─────────────────────────────────────────────────────

interface ConfigurationViewProps {
  config: InjectorConfig;
  update: <K extends keyof InjectorConfig>(key: K, value: InjectorConfig[K]) => void;
  hasOverrides: boolean;
  status: StatusType;
}

export default function ConfigurationView({ config, update, hasOverrides, status }: ConfigurationViewProps) {
  return (
    <>
      {status && <StatusToast status={status} />}

      {hasOverrides && (
        <div className="mb-4 px-3 py-2 rounded-lg text-[11px]" style={{ background: 'rgba(217,164,65,0.08)', color: 'var(--rm-caution)' }}>
          Runtime overrides are active. These values may differ from the environment defaults.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-6">
        <ConfigCard title="Scaling Formula" description="Controls how VUs are split across injector processes">
          <ConfigRow label="Max Runs" description="Maximum number of parallel load test runs" badge="runtime">
            <NumberField value={config.max_runs} onChange={v => update('max_runs', v)} min={1} max={20} />
          </ConfigRow>
          <ConfigRow label="VUs per Injector" description="Max virtual users before spawning another injector process" badge="runtime">
            <NumberField value={config.vus_per_injector} onChange={v => update('vus_per_injector', v)} unit="VUs" min={50} max={2000} />
          </ConfigRow>
          <ConfigRow label="Max Injectors" description="Hard cap on injector count per run" badge="runtime">
            <NumberField value={config.max_injectors} onChange={v => update('max_injectors', v)} min={1} max={50} />
          </ConfigRow>
          <ConfigRow label="Segment Concurrency" description="Parallel load segments each worker can run" badge="runtime">
            <NumberField value={config.segment_concurrency} onChange={v => update('segment_concurrency', v)} min={1} max={8} />
          </ConfigRow>
          <ConfigRow label="Lock Duration" description="BullMQ stall timeout for coordinator jobs" badge="runtime">
            <NumberField value={config.worker_lock_duration_ms} onChange={v => update('worker_lock_duration_ms', v)} unit="ms" min={60000} max={3600000} />
          </ConfigRow>
        </ConfigCard>

        <ConfigCard title="Worker Infrastructure" description="Docker Compose deployment — requires redeploy to take effect">
          <ConfigRow label="Worker Replicas" description="Number of worker containers in the cluster">
            <NumberField value={config.worker_replicas} onChange={v => update('worker_replicas', v)} min={1} max={20} />
          </ConfigRow>
          <ConfigRow label="CPU Limit" description="CPU cores allocated per worker container">
            <SelectField value={config.worker_cpu_limit} onChange={v => update('worker_cpu_limit', v)} options={[
              { value: '0.5', label: '0.5 cores' },
              { value: '1.0', label: '1 core' },
              { value: '2.0', label: '2 cores' },
              { value: '4.0', label: '4 cores' },
              { value: '8.0', label: '8 cores' },
            ]} />
          </ConfigRow>
          <ConfigRow label="Memory Limit" description="RAM allocated per worker container">
            <SelectField value={config.worker_mem_limit} onChange={v => update('worker_mem_limit', v)} options={[
              { value: '512M', label: '512 MB' },
              { value: '1G', label: '1 GB' },
              { value: '2G', label: '2 GB' },
              { value: '4G', label: '4 GB' },
              { value: '8G', label: '8 GB' },
            ]} />
          </ConfigRow>
          <div className="mt-3 px-3 py-2 rounded-lg text-[11px]" style={{ background: 'rgba(217,164,65,0.08)', color: 'var(--rm-caution)' }}>
            Replica, CPU, and memory changes are stored as recommendations. Apply them by running:
            <code className="block mt-1 font-mono text-[11px]" style={{ color: 'var(--rm-text)' }}>
              LT_WORKER_REPLICAS={config.worker_replicas} LT_WORKER_CPU_LIMIT={config.worker_cpu_limit} LT_WORKER_MEM_LIMIT={config.worker_mem_limit} docker compose up -d
            </code>
          </div>
        </ConfigCard>
      </div>

      <EnvVarReference />
    </>
  );
}
