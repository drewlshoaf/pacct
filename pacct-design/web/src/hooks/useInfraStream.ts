'use client';

import { useState, useEffect, useRef } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface QueueCounts {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed?: number;
}

export interface QueueStats {
  run: QueueCounts;
  segment: QueueCounts;
  timestamp: number;
}

export interface ActiveRun {
  job_id: string;
  run_id: string;
  scenario_name: string;
  phase: string;
  progress_pct: number;
  message: string;
  injector_count: number;
  started_at?: string;
}

export interface ActiveSegment {
  job_id: string;
  run_id: string;
  segment_index: number;
  segment_count: number;
}

export interface WorkerStatus {
  active_runs: ActiveRun[];
  active_segments: ActiveSegment[];
  timestamp: number;
}

export interface InjectorConfig {
  vus_per_injector: number;
  max_injectors: number;
  max_runs: number;
  segment_concurrency: number;
  worker_lock_duration_ms: number;
  worker_replicas: number;
  worker_cpu_limit: string;
  worker_mem_limit: string;
}

export interface CircuitBreakerConfig {
  cb_enabled: boolean;
  cb_error_rate_threshold: number;
  cb_consecutive_breaches: number;
  cb_no_response_timeout_s: number;
  cb_min_requests: number;
  cb_grace_period_s: number;
}

export interface ModelConfig {
  provider: 'claude' | 'openai';
  model: string;
  delay_ms: number;
}

export interface TopologyConfig {
  degraded_error_pct: number;
  critical_error_pct: number;
  error_health_weight: number;
  latency_baseline_ms: number;
  latency_health_weight: number;
  health_green_above: number;
  health_yellow_above: number;
}

export interface ConfigStatus {
  config: InjectorConfig;
  cb_config?: CircuitBreakerConfig;
  model_config?: ModelConfig;
  topo_config?: TopologyConfig;
  has_overrides: boolean;
  has_cb_overrides?: boolean;
  has_model_overrides?: boolean;
  has_topo_overrides?: boolean;
  timestamp: number;
}

export interface UseInfraStreamReturn {
  queues: QueueStats | null;
  workers: WorkerStatus | null;
  config: InjectorConfig | null;
  hasOverrides: boolean;
  cbConfig: CircuitBreakerConfig | null;
  hasCbOverrides: boolean;
  modelConfig: ModelConfig | null;
  hasModelOverrides: boolean;
  topoConfig: TopologyConfig | null;
  hasTopoOverrides: boolean;
  connected: boolean;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * Connects to the infrastructure SSE stream.
 * Receives queue stats, active worker details, and config updates in real-time.
 */
export function useInfraStream(): UseInfraStreamReturn {
  const [queues, setQueues] = useState<QueueStats | null>(null);
  const [workers, setWorkers] = useState<WorkerStatus | null>(null);
  const [config, setConfig] = useState<InjectorConfig | null>(null);
  const [hasOverrides, setHasOverrides] = useState(false);
  const [cbConfig, setCbConfig] = useState<CircuitBreakerConfig | null>(null);
  const [hasCbOverrides, setHasCbOverrides] = useState(false);
  const [modelConfig, setModelConfig] = useState<ModelConfig | null>(null);
  const [hasModelOverrides, setHasModelOverrides] = useState(false);
  const [topoConfig, setTopoConfig] = useState<TopologyConfig | null>(null);
  const [hasTopoOverrides, setHasTopoOverrides] = useState(false);
  const [connected, setConnected] = useState(false);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const source = new EventSource('/api/admin/infrastructure/stream');
    sourceRef.current = source;

    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);

    source.addEventListener('queues', (e) => {
      try {
        setQueues(JSON.parse(e.data) as QueueStats);
      } catch { /* skip */ }
    });

    source.addEventListener('workers', (e) => {
      try {
        setWorkers(JSON.parse(e.data) as WorkerStatus);
      } catch { /* skip */ }
    });

    source.addEventListener('config', (e) => {
      try {
        const data = JSON.parse(e.data) as ConfigStatus;
        setConfig(data.config);
        setHasOverrides(data.has_overrides);
        if (data.cb_config) setCbConfig(data.cb_config);
        if (data.has_cb_overrides !== undefined) setHasCbOverrides(data.has_cb_overrides);
        if (data.model_config) setModelConfig(data.model_config);
        if (data.has_model_overrides !== undefined) setHasModelOverrides(data.has_model_overrides);
        if (data.topo_config) setTopoConfig(data.topo_config);
        if (data.has_topo_overrides !== undefined) setHasTopoOverrides(data.has_topo_overrides);
      } catch { /* skip */ }
    });

    return () => {
      source.close();
    };
  }, []);

  return { queues, workers, config, hasOverrides, cbConfig, hasCbOverrides, modelConfig, hasModelOverrides, topoConfig, hasTopoOverrides, connected };
}

/**
 * Lightweight hook that fetches topology config once on mount (no SSE).
 * Use this in live/monitor pages that don't need the full infra stream.
 */
export function useTopoConfig(): TopologyConfig | null {
  const [cfg, setCfg] = useState<TopologyConfig | null>(null);

  useEffect(() => {
    fetch('/api/admin/topology')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.config) setCfg(data.config); })
      .catch(() => {});
  }, []);

  return cfg;
}
