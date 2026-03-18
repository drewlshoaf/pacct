'use client';

import type { InjectorConfig, QueueStats, WorkerStatus } from '@/hooks/useInfraStream';
import { MetricBox, INJECTOR_COLORS } from './shared';

// ─── Queue Status Panel ─────────────────────────────────────────────────────

function QueueStatusPanel({ stats, connected }: { stats: QueueStats | null; connected: boolean }) {
  if (!stats) {
    return (
      <div className="card">
        <h3 className="text-[15px] font-semibold mb-2" style={{ color: 'var(--rm-text)' }}>Queue Status</h3>
        <p className="text-[12px]" style={{ color: 'var(--rm-text-muted)' }}>
          {connected ? 'Waiting for data...' : 'Connecting to stream...'}
        </p>
      </div>
    );
  }

  const runCounts = stats.run;
  const segCounts = stats.segment;
  const totalActive = runCounts.active + segCounts.active;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[15px] font-semibold" style={{ color: 'var(--rm-text)' }}>Queue Status</h3>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: totalActive > 0 ? 'var(--rm-pass)' : 'var(--rm-text-muted)' }} />
          <span className="text-[11px]" style={{ color: totalActive > 0 ? 'var(--rm-pass)' : 'var(--rm-text-muted)' }}>
            {totalActive > 0 ? 'Processing' : 'Idle'}
          </span>
        </div>
      </div>

      {/* Run queue */}
      <div className="text-[11px] font-medium mb-2" style={{ color: 'var(--rm-text-secondary)' }}>Run Queue</div>
      <div className="grid grid-cols-5 gap-2 mb-4">
        {[
          { label: 'Waiting', value: runCounts.waiting, color: 'var(--rm-caution)' },
          { label: 'Active', value: runCounts.active, color: 'var(--rm-pass)' },
          { label: 'Delayed', value: runCounts.delayed ?? 0, color: 'var(--rm-text-muted)' },
          { label: 'Done', value: runCounts.completed, color: 'var(--rm-signal)' },
          { label: 'Failed', value: runCounts.failed, color: 'var(--rm-fail)' },
        ].map(item => (
          <div key={item.label} className="text-center py-2 rounded-lg" style={{ background: 'var(--rm-bg-raised)' }}>
            <div className="text-[16px] font-bold" style={{ color: item.value > 0 ? item.color : 'var(--rm-text-muted)' }}>{item.value}</div>
            <div className="text-[10px]" style={{ color: 'var(--rm-text-muted)' }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Segment queue */}
      <div className="text-[11px] font-medium mb-2" style={{ color: 'var(--rm-text-secondary)' }}>Segment Queue</div>
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Waiting', value: segCounts.waiting, color: 'var(--rm-caution)' },
          { label: 'Active', value: segCounts.active, color: 'var(--rm-pass)' },
          { label: 'Done', value: segCounts.completed, color: 'var(--rm-signal)' },
          { label: 'Failed', value: segCounts.failed, color: 'var(--rm-fail)' },
        ].map(item => (
          <div key={item.label} className="text-center py-2 rounded-lg" style={{ background: 'var(--rm-bg-raised)' }}>
            <div className="text-[16px] font-bold" style={{ color: item.value > 0 ? item.color : 'var(--rm-text-muted)' }}>{item.value}</div>
            <div className="text-[10px]" style={{ color: 'var(--rm-text-muted)' }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Combined progress bar */}
      {totalActive > 0 && (
        <div className="mt-3">
          <div className="h-1.5 rounded-full flex overflow-hidden" style={{ background: 'var(--rm-border)' }}>
            <div className="h-full" style={{ width: '100%', background: 'var(--rm-pass)', animation: 'pulse 2s ease-in-out infinite' }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Active Workers Panel ───────────────────────────────────────────────────

function ActiveWorkersPanel({ workers }: { workers: WorkerStatus | null }) {
  if (!workers) return null;

  const { active_runs, active_segments } = workers;
  const hasActivity = active_runs.length > 0 || active_segments.length > 0;

  if (!hasActivity) return null;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[15px] font-semibold" style={{ color: 'var(--rm-text)' }}>Active Work</h3>
        <span className="text-[11px] px-2 py-0.5 rounded font-medium"
          style={{ background: 'rgba(59,167,118,0.12)', color: 'var(--rm-pass)' }}>
          {active_runs.length} run{active_runs.length !== 1 ? 's' : ''}, {active_segments.length} segment{active_segments.length !== 1 ? 's' : ''}
        </span>
      </div>

      {active_runs.map(run => (
        <div key={run.job_id} className="px-3 py-2.5 rounded-lg mb-2" style={{ background: 'var(--rm-bg-raised)' }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[13px] font-medium" style={{ color: 'var(--rm-text)' }}>{run.scenario_name}</span>
            <span className="text-[11px] px-1.5 py-0.5 rounded font-mono" style={{ background: 'var(--rm-bg-surface)', color: 'var(--rm-text-secondary)' }}>
              {run.phase}
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>
            <span>{run.injector_count} injector{run.injector_count !== 1 ? 's' : ''}</span>
            {run.message && <span>{run.message}</span>}
          </div>
          {run.progress_pct > 0 && (
            <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'var(--rm-border)' }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${run.progress_pct}%`, background: 'var(--rm-pass)' }} />
            </div>
          )}
        </div>
      ))}

      {active_segments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {active_segments.map(seg => (
            <div key={seg.job_id} className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono"
              style={{ background: 'var(--rm-bg-surface)', color: 'var(--rm-text-secondary)' }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: INJECTOR_COLORS[seg.segment_index % INJECTOR_COLORS.length] }} />
              seg {seg.segment_index + 1}/{seg.segment_count}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Overview View ──────────────────────────────────────────────────────────

interface OverviewViewProps {
  config: InjectorConfig;
  queues: QueueStats | null;
  workers: WorkerStatus | null;
  connected: boolean;
}

export default function OverviewView({ config, queues, workers, connected }: OverviewViewProps) {
  const totalSlots = config.worker_replicas * config.segment_concurrency;
  const maxVUs = config.max_injectors * config.vus_per_injector;
  const totalCPU = config.worker_replicas * parseFloat(config.worker_cpu_limit);
  const memNum = parseFloat(config.worker_mem_limit);
  const memUnit = config.worker_mem_limit.replace(/[\d.]/g, '');
  const totalMem = config.worker_replicas * memNum;

  return (
    <>
      {/* Capacity stats */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
        <MetricBox label="Worker Replicas" value={config.worker_replicas} />
        <MetricBox label="Segment Slots" value={totalSlots} unit="concurrent injector processes" />
        <MetricBox label="Max VUs / Run" value={maxVUs.toLocaleString()} />
        <MetricBox label="Total CPU" value={totalCPU.toFixed(1)} unit="cores" />
        <MetricBox label="Total Memory" value={`${totalMem}${memUnit}`} />
      </div>

      {/* Queue + Active Work */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <QueueStatusPanel stats={queues} connected={connected} />
        <ActiveWorkersPanel workers={workers} />
      </div>
    </>
  );
}
