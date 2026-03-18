'use client';

import { useMemo } from 'react';
import { MetricPoint } from '@/data/types';
import type { TopologyConfig } from '@/hooks/useInfraStream';

// ─── Defaults (used when no Redis config is loaded yet) ─────────────
const DEFAULTS: TopologyConfig = {
  degraded_error_pct: 5,
  critical_error_pct: 15,
  error_health_weight: 10,
  latency_baseline_ms: 200,
  latency_health_weight: 0.15,
  health_green_above: 75,
  health_yellow_above: 40,
};

// Non-configurable animation constants
const ANIM = {
  minDots: 3,
  maxDots: 8,
  dotThroughputDivisor: 150,
  dotSpeedSlowMs: 300,
  dotSpeedSlowDur: 3,
  dotSpeedMedMs: 150,
  dotSpeedMedDur: 2.2,
  dotSpeedFastDur: 1.5,
};

// Generate layout dynamically for any injector count (1–N, displayed up to 3 visually)
function buildLayout(count: number): { injectors: { x: number; y: number; label: string }[]; paths: string[] } {
  const displayCount = Math.max(1, Math.min(3, count));
  if (displayCount === 1) {
    return {
      injectors: [{ x: 8, y: 62, label: count === 1 ? 'LI-1' : `LI ×${count}` }],
      paths: ['M 96,86 C 140,86 170,86 200,88'],
    };
  }
  if (displayCount === 2) {
    return {
      injectors: [
        { x: 8, y: 30, label: 'LI-1' },
        { x: 8, y: 100, label: count === 2 ? 'LI-2' : `LI ×${count}` },
      ],
      paths: [
        'M 96,54 C 140,54 170,65 200,72',
        'M 96,124 C 140,124 170,112 200,105',
      ],
    };
  }
  // 3+ injectors: show 3 nodes, label the last to indicate total
  return {
    injectors: [
      { x: 8, y: 5, label: 'LI-1' },
      { x: 8, y: 62, label: 'LI-2' },
      { x: 8, y: 119, label: count === 3 ? 'LI-3' : `+${count - 2} more` },
    ],
    paths: [
      'M 96,29 C 140,29 170,48 200,58',
      'M 96,86 C 140,86 170,86 200,88',
      'M 96,143 C 140,143 170,125 200,118',
    ],
  };
}

function InjectorNode({ x, y, label, isActive }: { x: number; y: number; label: string; isActive: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={88} height={48} rx={6}
        fill="var(--rm-bg-raised)" stroke={isActive ? 'var(--rm-signal)' : 'var(--rm-border)'} strokeWidth={1.5}
        style={isActive ? { filter: 'drop-shadow(0 0 6px rgba(10,239,207,0.3))' } : {}}
      />
      {/* Server icon */}
      <rect x={x + 10} y={y + 11} width={20} height={5} rx={1.5} fill={isActive ? 'var(--rm-signal)' : 'var(--rm-text-muted)'} opacity={0.6} />
      <rect x={x + 10} y={y + 19} width={20} height={5} rx={1.5} fill={isActive ? 'var(--rm-signal)' : 'var(--rm-text-muted)'} opacity={0.4} />
      <rect x={x + 10} y={y + 27} width={20} height={5} rx={1.5} fill={isActive ? 'var(--rm-signal)' : 'var(--rm-text-muted)'} opacity={0.3} />
      <text x={x + 38} y={y + 21} fill={isActive ? 'var(--rm-text)' : 'var(--rm-text-muted)'} fontSize={12} fontWeight={600}>{label}</text>
      <text x={x + 38} y={y + 33} fill="var(--rm-text-muted)" fontSize={9}>injector</text>
      {/* Status dot */}
      <circle cx={x + 78} cy={y + 10} r={3.5} fill={isActive ? 'var(--rm-signal)' : 'var(--rm-text-muted)'}>
        {isActive && <animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />}
      </circle>
    </g>
  );
}

function extractHost(url?: string): string {
  if (!url) return '';
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.port ? `${u.hostname}:${u.port}` : u.hostname;
  } catch {
    return url;
  }
}

function TargetNode({ x, y, isActive, healthPct, errorRate, targetHost, cfg }: { x: number; y: number; isActive: boolean; healthPct: number; errorRate: number; targetHost?: string; cfg: TopologyConfig }) {
  const isCritical = errorRate > cfg.critical_error_pct;
  const isDegraded = errorRate > cfg.degraded_error_pct;
  const statusLabel = !isActive ? '' : isCritical ? 'Critical' : isDegraded ? 'Degraded' : 'Healthy';
  const borderColor = !isActive ? 'var(--rm-border)' : isDegraded ? 'var(--rm-fail)' : 'var(--rm-signal)';
  const glowColor = !isActive ? 'none' : isDegraded ? 'drop-shadow(0 0 8px rgba(211,93,93,0.3))' : 'drop-shadow(0 0 8px rgba(10,239,207,0.3))';
  const dotColor = !isActive ? 'var(--rm-text-muted)' : isCritical ? 'var(--rm-fail)' : isDegraded ? 'var(--rm-caution)' : 'var(--rm-signal)';
  const hostLabel = extractHost(targetHost) || 'target';

  return (
    <g>
      <rect x={x} y={y} width={100} height={140} rx={7}
        fill="var(--rm-bg-raised)" stroke={borderColor} strokeWidth={1.5}
        style={{ filter: glowColor }}
      />
      {/* App icon — layered boxes */}
      <rect x={x + 30} y={y + 14} width={40} height={24} rx={4} fill="none" stroke={isActive ? 'var(--rm-signal)' : 'var(--rm-text-muted)'} strokeWidth={1.5} opacity={0.6} />
      <rect x={x + 34} y={y + 18} width={32} height={16} rx={3} fill={isActive ? 'var(--rm-signal-glow)' : 'var(--rm-bg-surface)'} />
      <circle cx={x + 50} cy={y + 26} r={4} fill={isActive ? 'var(--rm-signal)' : 'var(--rm-text-muted)'} opacity={0.5} />

      <text x={x + 50} y={y + 56} textAnchor="middle" fill="var(--rm-text)" fontSize={12} fontWeight={600}>Target App</text>
      <text x={x + 50} y={y + 70} textAnchor="middle" fill="var(--rm-text-muted)" fontSize={9} style={{ fontFamily: 'monospace' }}>{hostLabel.length > 18 ? hostLabel.slice(0, 17) + '…' : hostLabel}</text>

      {/* Health bar */}
      <text x={x + 12} y={y + 93} fill="var(--rm-text-muted)" fontSize={10}>Health</text>
      <rect x={x + 12} y={y + 98} width={76} height={6} rx={3} fill="var(--rm-border)" />
      <rect x={x + 12} y={y + 98} width={Math.max(0, (76 * healthPct) / 100)} height={6} rx={3}
        fill={healthPct > cfg.health_green_above ? 'var(--rm-signal)' : healthPct > cfg.health_yellow_above ? 'var(--rm-caution)' : 'var(--rm-fail)'}
      />

      {/* Status */}
      <circle cx={x + 17} cy={y + 123} r={4.5} fill={dotColor}>
        {isActive && <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />}
      </circle>
      <text x={x + 28} y={y + 127} fill={isActive ? 'var(--rm-text-secondary)' : 'var(--rm-text-muted)'} fontSize={10}>
        {statusLabel}
      </text>
    </g>
  );
}

export default function TopologyVisualization({ currentMetric, isRunning, injectorCount = 1, targetHost, topoConfig }: {
  currentMetric: MetricPoint | null;
  isRunning: boolean;
  injectorCount?: number;
  targetHost?: string;
  topoConfig?: TopologyConfig | null;
}) {
  const cfg = topoConfig ?? DEFAULTS;
  const throughput = currentMetric?.throughput ?? 0;
  const errorRate = currentMetric?.errorRate ?? 0;
  const latencyP95 = currentMetric?.latencyP95 ?? 50;

  const layout = buildLayout(injectorCount);

  // Dot count scales with throughput
  const dotCount = useMemo(() => {
    if (!isRunning) return 0;
    return Math.max(ANIM.minDots, Math.min(ANIM.maxDots, Math.round(throughput / ANIM.dotThroughputDivisor)));
  }, [throughput, isRunning]);

  // Dot speed inversely correlates with latency
  const animDuration = useMemo(() => {
    if (latencyP95 > ANIM.dotSpeedSlowMs) return ANIM.dotSpeedSlowDur;
    if (latencyP95 > ANIM.dotSpeedMedMs) return ANIM.dotSpeedMedDur;
    return ANIM.dotSpeedFastDur;
  }, [latencyP95]);

  const dotColor = errorRate > cfg.degraded_error_pct ? 'var(--rm-fail)' : 'var(--rm-signal)';
  const healthPct = Math.max(0, 100 - errorRate * cfg.error_health_weight - Math.max(0, latencyP95 - cfg.latency_baseline_ms) * cfg.latency_health_weight);

  return (
    <svg viewBox="0 0 310 175" width="100%" style={{ display: 'block' }}>
      {/* Background grid pattern */}
      <defs>
        <pattern id="topo-grid" width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M 30 0 L 0 0 0 30" fill="none" stroke="var(--rm-border)" strokeWidth={0.5} opacity={0.5} />
        </pattern>
      </defs>
      <rect width="310" height="175" fill="url(#topo-grid)" />

      {/* Connection paths */}
      {layout.paths.map((d, i) => (
        <path key={`path-${i}`} d={d} fill="none" stroke="var(--rm-border)" strokeWidth={1.5} />
      ))}

      {/* Animated traffic dots */}
      {isRunning && layout.paths.map((d, pathIdx) => (
        Array.from({ length: dotCount }).map((_, dotIdx) => (
          <circle
            key={`dot-${pathIdx}-${dotIdx}`}
            r={3}
            fill={dotColor}
            opacity={0.7}
          >
            <animateMotion
              dur={`${animDuration}s`}
              repeatCount="indefinite"
              path={d}
              begin={`${(dotIdx / dotCount) * animDuration}s`}
            />
          </circle>
        ))
      ))}

      {/* Injector nodes */}
      {layout.injectors.map((inj) => (
        <InjectorNode key={inj.label} x={inj.x} y={inj.y} label={inj.label} isActive={isRunning} />
      ))}

      {/* Target node */}
      <TargetNode x={200} y={18} isActive={isRunning} healthPct={healthPct} errorRate={errorRate} targetHost={targetHost} cfg={cfg} />

      {/* Injector count badge — bottom-left */}
      {injectorCount > 0 && (
        <g>
          <rect x={8} y={155} width={88} height={18} rx={4} fill="var(--rm-bg-surface)" stroke="var(--rm-border)" strokeWidth={1} />
          <text x={52} y={167} textAnchor="middle" fill="var(--rm-signal)" fontSize={10} fontWeight={600}>
            {injectorCount} injector{injectorCount !== 1 ? 's' : ''}
          </text>
        </g>
      )}
    </svg>
  );
}
