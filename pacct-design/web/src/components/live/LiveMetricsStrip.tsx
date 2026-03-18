'use client';

import { useEffect, useRef, useState } from 'react';
import { MetricPoint } from '@/data/types';

interface Tile {
  label: string;
  value: string;
  color: string;
}

function MetricTile({ tile, isLive }: { tile: Tile; isLive: boolean }) {
  const [flash, setFlash] = useState(false);
  const prevValue = useRef(tile.value);

  useEffect(() => {
    if (tile.value !== prevValue.current) {
      prevValue.current = tile.value;
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 400);
      return () => clearTimeout(t);
    }
  }, [tile.value]);

  return (
    <div
      className="card flex-1 min-w-[120px] px-3 py-2 text-center transition-all duration-300"
      style={{
        background: flash ? 'var(--rm-signal-glow)' : undefined,
      }}
    >
      <div className="flex items-center justify-center gap-1.5 mb-1">
        {isLive && (
          <span
            className="w-[5px] h-[5px] rounded-full flex-shrink-0"
            style={{ background: 'var(--rm-signal)', animation: 'live-pulse 1.5s ease-in-out infinite' }}
          />
        )}
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--rm-text-muted)' }}>{tile.label}</span>
      </div>
      <div className="text-[20px] font-bold tabular-nums" style={{ color: tile.color }}>{tile.value}</div>
    </div>
  );
}

export default function LiveMetricsStrip({ current, isRunning }: {
  current: MetricPoint | null;
  isRunning: boolean;
}) {
  const tiles: Tile[] = current ? [
    {
      label: 'Virtual Users',
      value: Math.round(current.concurrency).toLocaleString(),
      color: 'var(--rm-text)',
    },
    {
      label: 'Requests / sec',
      value: current.throughput.toLocaleString(),
      color: 'var(--rm-signal)',
    },
    {
      label: 'P95 Latency',
      value: `${current.latencyP95}ms`,
      color: current.latencyP95 > 150 ? 'var(--rm-fail)' : current.latencyP95 > 100 ? 'var(--rm-caution)' : 'var(--rm-signal)',
    },
    {
      label: 'Error Rate',
      value: `${current.errorRate}%`,
      color: current.errorRate > 2 ? 'var(--rm-fail)' : current.errorRate > 1 ? 'var(--rm-caution)' : 'var(--rm-signal)',
    },
    {
      label: 'Timeout Rate',
      value: `${(current.timeoutRate ?? 0).toFixed(2)}%`,
      color: (current.timeoutRate ?? 0) > 5 ? 'var(--rm-fail)' : (current.timeoutRate ?? 0) > 1 ? 'var(--rm-caution)' : 'var(--rm-signal)',
    },
  ] : [
    { label: 'Virtual Users', value: '—', color: 'var(--rm-text-muted)' },
    { label: 'Requests / sec', value: '—', color: 'var(--rm-text-muted)' },
    { label: 'P95 Latency', value: '—', color: 'var(--rm-text-muted)' },
    { label: 'Error Rate', value: '—', color: 'var(--rm-text-muted)' },
    { label: 'Timeout Rate', value: '—', color: 'var(--rm-text-muted)' },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {tiles.map(t => <MetricTile key={t.label} tile={t} isLive={isRunning} />)}
    </div>
  );
}
