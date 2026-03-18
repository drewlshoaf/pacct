'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MetricPoint, RunEvent } from '@/data/types';

export type TestPhase = 'idle' | 'ramp-up' | 'steady' | 'ramp-down' | 'completed';

interface StreamingState {
  metrics: MetricPoint[];
  currentMetric: MetricPoint | null;
  previousMetric: MetricPoint | null;
  events: RunEvent[];
  phase: TestPhase;
  elapsed: number;
  isRunning: boolean;
  currentBucket: number;
  start: () => void;
  pause: () => void;
  stop: () => void;
}

const TARGET_VUS = 250;
const TOTAL_DURATION = 300; // 5 minutes
const TICK_MS = 1500;
const WINDOW_SIZE = 60;

// Event schedule
const EVENT_SCHEDULE: { at: number; type: RunEvent['type']; severity: RunEvent['severity']; title: string; description: string }[] = [
  { at: 0, type: 'ramp', severity: 'info', title: 'Ramp-up started', description: 'Load injectors beginning to generate traffic against target.' },
  { at: 30, type: 'stabilization', severity: 'info', title: '50% target load reached', description: 'Concurrency at 125 VUs. All health checks passing.' },
  { at: 60, type: 'stabilization', severity: 'info', title: 'Target load reached (250 VUs)', description: 'Full concurrency achieved. Entering steady state.' },
  { at: 90, type: 'stabilization', severity: 'info', title: 'Steady state confirmed', description: 'Metrics stable for 30 seconds. Baseline established.' },
  { at: 140, type: 'threshold-breach', severity: 'warning', title: 'P95 latency anomaly detected', description: 'P95 latency spiked above 150ms threshold. Investigating.' },
  { at: 155, type: 'error-spike', severity: 'critical', title: 'Error rate elevated (2.8%)', description: 'Error rate exceeded 2% threshold. 503 responses from checkout-api.' },
  { at: 175, type: 'recovery', severity: 'info', title: 'Metrics returning to baseline', description: 'Latency and error rate normalizing after auto-scaling event.' },
  { at: 240, type: 'ramp', severity: 'info', title: 'Ramp-down initiated', description: 'Gracefully reducing concurrency to zero.' },
  { at: 295, type: 'stabilization', severity: 'info', title: 'Test complete', description: 'All virtual users finished. Final metrics captured.' },
];

function generatePoint(elapsed: number, phase: TestPhase): MetricPoint {
  let concurrency: number;

  if (phase === 'ramp-up') {
    concurrency = (elapsed / 60) * TARGET_VUS;
  } else if (phase === 'steady') {
    concurrency = TARGET_VUS + (Math.random() - 0.5) * 20;
  } else if (phase === 'ramp-down') {
    const progress = Math.min(1, (elapsed - 240) / 60);
    concurrency = TARGET_VUS * (1 - progress);
  } else {
    concurrency = 0;
  }

  const jitter = () => 0.85 + Math.random() * 0.3;
  const baseLatency = 35 + (concurrency / TARGET_VUS) * 40;

  // Spike around 140-170s
  const inSpike = elapsed > 135 && elapsed < 175;
  const spikeIntensity = inSpike ? Math.sin(((elapsed - 135) / 40) * Math.PI) * 80 : 0;

  return {
    timestamp: elapsed,
    latencyP50: Math.max(5, +(((baseLatency + spikeIntensity * 0.5) * jitter()).toFixed(1))),
    latencyP95: Math.max(10, +(((baseLatency * 1.8 + spikeIntensity) * jitter()).toFixed(1))),
    latencyP99: Math.max(15, +(((baseLatency * 3 + spikeIntensity * 1.5) * jitter()).toFixed(1))),
    throughput: Math.max(0, +((concurrency * 4.5 * jitter()).toFixed(1))),
    errorRate: Math.max(0, +(((0.2 + (inSpike ? 2.5 * Math.sin(((elapsed - 135) / 40) * Math.PI) : 0)) * jitter()).toFixed(2))),
    concurrency: Math.max(0, +(concurrency * jitter()).toFixed(0)),
  };
}

function getPhase(elapsed: number): TestPhase {
  if (elapsed < 60) return 'ramp-up';
  if (elapsed < 240) return 'steady';
  if (elapsed < TOTAL_DURATION) return 'ramp-down';
  return 'completed';
}

export function useStreamingSimulation(): StreamingState {
  const [metrics, setMetrics] = useState<MetricPoint[]>([]);
  const [currentMetric, setCurrentMetric] = useState<MetricPoint | null>(null);
  const [previousMetric, setPreviousMetric] = useState<MetricPoint | null>(null);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [phase, setPhase] = useState<TestPhase>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [currentBucket, setCurrentBucket] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedRef = useRef(0);
  const firedEventsRef = useRef<Set<number>>(new Set());

  const tick = useCallback(() => {
    elapsedRef.current += 1.5;
    const e = elapsedRef.current;

    if (e >= TOTAL_DURATION) {
      setIsRunning(false);
      setPhase('completed');
      setElapsed(TOTAL_DURATION);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const p = getPhase(e);
    const point = generatePoint(e, p);

    setPreviousMetric(prev => prev);
    setCurrentMetric(prev => {
      setPreviousMetric(prev);
      return point;
    });
    setMetrics(prev => {
      const next = [...prev, point];
      return next.length > WINDOW_SIZE ? next.slice(-WINDOW_SIZE) : next;
    });
    setPhase(p);
    setElapsed(e);
    setCurrentBucket(b => b + 1);

    // Check event schedule
    EVENT_SCHEDULE.forEach(ev => {
      if (e >= ev.at && !firedEventsRef.current.has(ev.at)) {
        firedEventsRef.current.add(ev.at);
        setEvents(prev => [...prev, {
          id: `live-${ev.at}`,
          bucket: Math.floor(ev.at / 10) + 1,
          timestamp: ev.at,
          type: ev.type,
          severity: ev.severity,
          title: ev.title,
          description: ev.description,
        }]);
      }
    });
  }, []);

  const start = useCallback(() => {
    if (phase === 'completed' || phase === 'idle') {
      // Reset
      setMetrics([]);
      setCurrentMetric(null);
      setPreviousMetric(null);
      setEvents([]);
      setPhase('ramp-up');
      setElapsed(0);
      setCurrentBucket(0);
      elapsedRef.current = 0;
      firedEventsRef.current.clear();
    }
    setIsRunning(true);
  }, [phase]);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const stop = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPhase('completed');
  }, []);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(tick, TICK_MS);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, tick]);

  return { metrics, currentMetric, previousMetric, events, phase, elapsed, isRunning, currentBucket, start, pause, stop };
}
