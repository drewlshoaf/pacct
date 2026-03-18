'use client';

import { useState, useEffect, useRef } from 'react';
import type { MetricPoint } from '@/data/types';

/** Lightweight step summary from the scenario */
export interface StepSummary {
  name: string;
  step_type: string;
  method?: string;
  path?: string;
  operation_type?: string;
}

/** Load profile summary */
export interface LoadProfileSummary {
  virtual_users: number;
  pattern_type?: string;
  duration_seconds?: number;
  ramp_up_seconds?: number;
}

/** Status event from SSE */
export interface RunStreamStatus {
  run_id: string;
  job_id: string;
  state: string;
  phase: string;
  progress_pct: number;
  message: string;
  injector_count?: number;
  total_duration?: number;
  scenario_name?: string;
  scenario_description?: string;
  base_url?: string;
  steps?: StepSummary[];
  load_profile?: LoadProfileSummary;
  result?: {
    run_id: string;
    status: string;
    artifact_id?: string;
    duration_seconds: number;
  };
  error?: string;
  attempts: number;
  created_at?: string;
  finished_at?: string;
}

/** Live metric event from SSE */
export interface RunStreamMetric {
  timestamp: number;
  rps: number;
  latency_p50: number;
  latency_p95: number;
  latency_p99: number;
  error_rate: number;
  vus: number;
  timeout_count?: number;
  bytes_received?: number;
  bytes_sent?: number;
}

export interface UseRunStreamReturn {
  status: RunStreamStatus | null;
  metrics: MetricPoint[];
  currentMetric: MetricPoint | null;
  previousMetric: MetricPoint | null;
  connected: boolean;
  phase: string;
  elapsed: number;
  injectorCount: number;
  totalDuration: number;
}

const METRIC_WINDOW = 120; // keep last 120 data points
const STORAGE_PREFIX = 'sv-stream-';

interface RunCacheData {
  status: RunStreamStatus | null;
  metrics: MetricPoint[];
  currentMetric: MetricPoint | null;
  previousMetric: MetricPoint | null;
}

/**
 * Module-level cache so metrics and status survive React re-mounts
 * (e.g. navigating away from Live page and back).
 * Backed by sessionStorage so data also survives full page refreshes.
 */
const runCache: Record<string, RunCacheData> = {};

function loadFromStorage(runId: string): RunCacheData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + runId);
    if (!raw) return null;
    return JSON.parse(raw) as RunCacheData;
  } catch {
    return null;
  }
}

function saveToStorage(runId: string, data: RunCacheData) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_PREFIX + runId, JSON.stringify(data));
  } catch {
    // Storage full or unavailable — ignore
  }
}

function getCache(runId: string) {
  if (!runCache[runId]) {
    // Try to restore from sessionStorage on first access
    const stored = loadFromStorage(runId);
    runCache[runId] = stored ?? { status: null, metrics: [], currentMetric: null, previousMetric: null };
  }
  return runCache[runId];
}

function flushCache(runId: string) {
  if (runCache[runId]) {
    saveToStorage(runId, runCache[runId]);
  }
}

/**
 * Parse SSE lines from a text chunk.
 * Returns parsed events as { event, data } pairs.
 */
function parseSSEChunk(text: string): { event: string; data: string }[] {
  const events: { event: string; data: string }[] = [];
  let currentEvent = '';
  let currentData = '';

  for (const line of text.split('\n')) {
    if (line.startsWith('event: ')) {
      currentEvent = line.slice(7).trim();
    } else if (line.startsWith('data: ')) {
      currentData = line.slice(6).trim();
    } else if (line === '' && currentEvent && currentData) {
      events.push({ event: currentEvent, data: currentData });
      currentEvent = '';
      currentData = '';
    }
  }

  return events;
}

const POST_RUN_PHASES = ['parsing', 'analyzing', 'ai_narrative', 'scoring', 'ingesting', 'completed', 'failed', 'stopped'];

/**
 * React hook that connects to the SSE stream for a run.
 * Uses fetch() + ReadableStream instead of EventSource to avoid the
 * browser's 6-connection-per-origin limit (HTTP/1.1). This allows
 * multiple tabs to receive live metrics simultaneously.
 */
export function useRunStream(runId: string | null): UseRunStreamReturn {
  const cache = runId ? getCache(runId) : null;

  const [status, setStatus] = useState<RunStreamStatus | null>(cache?.status ?? null);
  const [metrics, setMetrics] = useState<MetricPoint[]>(cache?.metrics ?? []);
  const [currentMetric, setCurrentMetric] = useState<MetricPoint | null>(cache?.currentMetric ?? null);
  const [previousMetric, setPreviousMetric] = useState<MetricPoint | null>(cache?.previousMetric ?? null);
  const [connected, setConnected] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const createdAtRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const frozenElapsedRef = useRef<number | null>(null);
  // Track current runId so stale async callbacks can detect they're outdated
  const activeRunIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Abort any previous stream immediately
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    activeRunIdRef.current = runId;

    if (!runId) {
      // Clear stale state so we don't show a previous run's metrics
      setStatus(null);
      setMetrics([]);
      setCurrentMetric(null);
      setPreviousMetric(null);
      setConnected(false);
      setElapsed(0);
      return;
    }

    // Immediately clear state for the transition — prevents showing stale
    // metrics from the previous run during the brief window before new
    // data arrives from the SSE stream.
    setConnected(false);

    const c = getCache(runId);

    // If we already have a terminal status cached, don't reconnect
    if (c.status?.state === 'completed' || c.status?.state === 'failed') {
      setStatus(c.status);
      setMetrics(c.metrics);
      setCurrentMetric(c.currentMetric);
      setPreviousMetric(c.previousMetric);
      // Use total_duration as the final elapsed (represents load test run time, not pipeline time)
      setElapsed(c.status.total_duration ?? 60);
      return;
    }

    // Reset state for fresh stream (important when switching between scenarios)
    createdAtRef.current = null;
    frozenElapsedRef.current = null;

    // Restore cached state if reconnecting (or reset to empty for a new run)
    if (c.metrics.length > 0) {
      setMetrics(c.metrics);
      setCurrentMetric(c.currentMetric);
      setPreviousMetric(c.previousMetric);
    } else {
      setMetrics([]);
      setCurrentMetric(null);
      setPreviousMetric(null);
    }
    if (c.status) {
      setStatus(c.status);
      if (c.status.created_at) {
        createdAtRef.current = new Date(c.status.created_at).getTime();
      }
    } else {
      setStatus(null);
    }
    setElapsed(0);

    // Use fetch + ReadableStream instead of EventSource to avoid connection limits
    const controller = new AbortController();
    abortRef.current = controller;

    const handleStatus = (data: RunStreamStatus) => {
      // Guard against stale callbacks from a previous stream
      if (activeRunIdRef.current !== runId) return;
      setStatus(data);
      c.status = data;
      flushCache(runId);

      if (data.created_at && !createdAtRef.current) {
        createdAtRef.current = new Date(data.created_at).getTime();
      }

      if (POST_RUN_PHASES.includes(data.phase) && frozenElapsedRef.current === null && createdAtRef.current) {
        frozenElapsedRef.current = Math.floor((Date.now() - createdAtRef.current) / 1000);
        setElapsed(frozenElapsedRef.current);
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      }

      // Close on terminal BullMQ state
      if (data.state === 'completed' || data.state === 'failed') {
        controller.abort();
      }
    };

    const handleMetric = (m: RunStreamMetric) => {
      // Guard against stale callbacks from a previous stream
      if (activeRunIdRef.current !== runId) return;
      const windowReqs = m.rps * 2; // ~2s window
      const point: MetricPoint = {
        timestamp: m.timestamp,
        latencyP50: m.latency_p50,
        latencyP95: m.latency_p95,
        latencyP99: m.latency_p99,
        throughput: m.rps,
        errorRate: m.error_rate,
        concurrency: m.vus,
        timeoutRate: m.timeout_count != null && windowReqs > 0
          ? Math.round(((m.timeout_count) / windowReqs) * 10000) / 100
          : 0,
        bytesReceived: m.bytes_received ?? 0,
        bytesSent: m.bytes_sent ?? 0,
      };

      setPreviousMetric(_prev => _prev);
      setCurrentMetric(prev => {
        setPreviousMetric(prev);
        c.previousMetric = prev;
        return point;
      });
      c.currentMetric = point;

      setMetrics(prev => {
        const next = [...prev, point];
        const trimmed = next.length > METRIC_WINDOW ? next.slice(-METRIC_WINDOW) : next;
        c.metrics = trimmed;
        flushCache(runId);
        return trimmed;
      });
    };

    // Start the fetch-based SSE connection
    (async () => {
      try {
        const response = await fetch(`/api/runs/${runId}/stream`, {
          signal: controller.signal,
          headers: { Accept: 'text/event-stream' },
        });
        if (!response.ok || !response.body) return;

        setConnected(true);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete events (delimited by double newline)
          const parts = buffer.split('\n\n');
          // Keep the last part as buffer (might be incomplete)
          buffer = parts.pop() ?? '';

          for (const part of parts) {
            const events = parseSSEChunk(part + '\n\n');
            for (const evt of events) {
              try {
                if (evt.event === 'status') {
                  handleStatus(JSON.parse(evt.data));
                } else if (evt.event === 'metric') {
                  handleMetric(JSON.parse(evt.data));
                }
              } catch { /* skip malformed */ }
            }
          }
        }
        // Stream ended — do a final status poll in case we missed the terminal event
        try {
          const statusRes = await fetch(`/api/runs/${runId}/status`);
          if (statusRes.ok) {
            const finalStatus = await statusRes.json();
            handleStatus(finalStatus);
          }
        } catch { /* ignore */ }
      } catch (err) {
        // AbortError is expected on cleanup
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setConnected(false);

        // SSE connection dropped — do a status poll fallback
        try {
          const statusRes = await fetch(`/api/runs/${runId}/status`);
          if (statusRes.ok) {
            const finalStatus = await statusRes.json();
            handleStatus(finalStatus);
          }
        } catch { /* ignore */ }
      }
    })();

    // Elapsed timer — uses job created_at for accuracy, stops when load test finishes
    timerRef.current = setInterval(() => {
      if (frozenElapsedRef.current !== null) return;
      if (createdAtRef.current) {
        setElapsed(Math.floor((Date.now() - createdAtRef.current) / 1000));
      }
    }, 1000);

    return () => {
      controller.abort();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [runId]);

  return {
    status,
    metrics,
    currentMetric,
    previousMetric,
    connected,
    phase: status?.phase ?? (status?.state === 'completed' ? 'completed' : status?.state === 'failed' ? 'failed' : 'queued'),
    elapsed,
    injectorCount: status?.injector_count ?? 1,
    totalDuration: status?.total_duration ?? 60,
  };
}
