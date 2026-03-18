import { Run, RunDetail, MetricPoint, RunEvent, Scorecard, AiAnalysis } from '../types';

// --- Helper: generate time-series metrics ---
function generateMetrics(
  durationSeconds: number,
  intervalSeconds: number,
  profile: 'clean' | 'degraded' | 'failing'
): MetricPoint[] {
  const points: MetricPoint[] = [];
  const steps = Math.floor(durationSeconds / intervalSeconds);

  for (let i = 0; i <= steps; i++) {
    const t = i * intervalSeconds;
    const progress = t / durationSeconds;

    let baseLat: number, baseTP: number, baseErr: number, baseConcurrency: number;

    if (profile === 'clean') {
      baseConcurrency = Math.min(200, 50 + progress * 200);
      baseLat = 45 + Math.sin(progress * Math.PI) * 15;
      baseTP = 800 + progress * 400 - Math.sin(progress * Math.PI * 2) * 50;
      baseErr = 0.1 + Math.random() * 0.3;
    } else if (profile === 'degraded') {
      baseConcurrency = Math.min(300, 50 + progress * 350);
      baseLat = 55 + progress * 80 + (progress > 0.6 ? (progress - 0.6) * 200 : 0);
      baseTP = 750 + progress * 200 - (progress > 0.7 ? (progress - 0.7) * 800 : 0);
      baseErr = 0.2 + progress * 2 + (progress > 0.65 ? (progress - 0.65) * 8 : 0);
    } else {
      baseConcurrency = Math.min(400, 50 + progress * 500);
      baseLat = 80 + progress * 300 + (progress > 0.4 ? (progress - 0.4) * 500 : 0);
      baseTP = 600 - progress * 300 + (progress > 0.5 ? -(progress - 0.5) * 600 : 0);
      baseErr = 0.5 + progress * 5 + (progress > 0.4 ? (progress - 0.4) * 25 : 0);
    }

    const jitter = () => 0.9 + Math.random() * 0.2;

    points.push({
      timestamp: t,
      latencyP50: Math.max(5, baseLat * jitter()),
      latencyP95: Math.max(10, baseLat * 1.8 * jitter()),
      latencyP99: Math.max(15, baseLat * 3.2 * jitter()),
      throughput: Math.max(0, baseTP * jitter()),
      errorRate: Math.max(0, Math.min(100, baseErr * jitter())),
      concurrency: Math.max(1, baseConcurrency * jitter()),
    });
  }
  return points;
}

// ===================== RUN 1: Clean =====================
const run1: Run = {
  id: 'run-001',
  name: 'Checkout API Stress Test',
  planName: 'Checkout Flow v2.1',
  environment: 'staging',
  status: 'completed',
  stabilityScore: 94,
  startTime: '2025-02-24T14:00:00Z',
  endTime: '2025-02-24T14:30:00Z',
  durationSeconds: 1800,
  scenarioCount: 3,
  peakConcurrency: 200,
};

const run1Events: RunEvent[] = [
  { id: 'e1-1', bucket: 1, timestamp: 0, type: 'ramp', severity: 'info', title: 'Ramp-up started', description: 'Concurrency ramping from 0 to 200 users over 5 minutes' },
  { id: 'e1-2', bucket: 31, timestamp: 300, type: 'stabilization', severity: 'info', title: 'Steady state reached', description: 'Target concurrency of 200 reached. Metrics stabilized.' },
  { id: 'e1-3', bucket: 121, timestamp: 1200, type: 'ramp', severity: 'info', title: 'Ramp-down initiated', description: 'Graceful ramp-down from 200 to 0 users' },
];

const run1Scorecard: Scorecard = {
  overallScore: 94,
  categories: [
    { name: 'Latency', score: 96, weight: 0.3 },
    { name: 'Reliability', score: 98, weight: 0.25 },
    { name: 'Throughput', score: 92, weight: 0.2 },
    { name: 'Resilience', score: 90, weight: 0.15 },
    { name: 'Stability', score: 94, weight: 0.1 },
  ],
  penalties: [],
};

const run1Ai: AiAnalysis = {
  primaryFinding: 'The Checkout API handles 200 concurrent users with consistent sub-200ms P95 latency and near-zero error rates. The system is well within operational bounds for the target load.',
  secondaryObservations: [
    'P99 latency shows minor tail variance (180-220ms) during peak concurrency — expected behavior, not concerning.',
    'Throughput scaled linearly with concurrency, indicating no bottlenecks in the current range.',
    'No saturation or error-spike events detected during the entire 30-minute window.',
  ],
  riskAssessment: { level: 'low', summary: 'No performance risks identified at the tested load level.' },
  recommendations: [
    { text: 'Consider testing at 2x concurrency (400 users) to find the system\'s breaking point.', priority: 'medium' },
    { text: 'Monitor P99 tail latency under sustained load beyond 30 minutes.', priority: 'low' },
  ],
  confidence: 95,
  evidenceLinks: [
    { label: 'Steady state reached at 5min', eventId: 'e1-2', metric: 'latencyP95', timestamp: 300 },
    { label: 'Consistent throughput during peak', eventId: 'e1-2', metric: 'throughput', timestamp: 600 },
  ],
  testGoalMet: true,
  actionRequired: false,
  decisionSpine: [
    { basis: 'All metrics within acceptable range', evidencePointers: ['P95 at 112ms', 'Error rate 0.2%'] },
    { basis: 'No degradation events', evidencePointers: ['Clean ramp-up/down cycle', 'Zero recovery events triggered'] },
  ],
};

// ===================== RUN 2: Degraded =====================
const run2: Run = {
  id: 'run-002',
  name: 'Payment Gateway Load Test',
  planName: 'Payment Processing v1.4',
  environment: 'staging',
  status: 'completed',
  stabilityScore: 72,
  startTime: '2025-02-24T16:00:00Z',
  endTime: '2025-02-24T16:45:00Z',
  durationSeconds: 2700,
  scenarioCount: 4,
  peakConcurrency: 300,
};

const run2Events: RunEvent[] = [
  { id: 'e2-1', bucket: 1, timestamp: 0, type: 'ramp', severity: 'info', title: 'Ramp-up started', description: 'Concurrency ramping from 0 to 300 users over 8 minutes' },
  { id: 'e2-2', bucket: 49, timestamp: 480, type: 'stabilization', severity: 'info', title: 'Target load reached', description: '300 concurrent users active' },
  { id: 'e2-3', bucket: 163, timestamp: 1620, type: 'saturation', severity: 'warning', title: 'Connection pool saturation', description: 'Database connection pool utilization exceeded 85%. Latency increasing.' },
  { id: 'e2-4', bucket: 193, timestamp: 1920, type: 'error-spike', severity: 'warning', title: 'Elevated error rate', description: 'Error rate spiked to 3.8% — timeout errors from payment provider gateway.' },
  { id: 'e2-5', bucket: 211, timestamp: 2100, type: 'recovery', severity: 'info', title: 'Partial recovery', description: 'Error rate decreased to 1.5% after connection pool rebalancing.' },
  { id: 'e2-6', bucket: 241, timestamp: 2400, type: 'ramp', severity: 'info', title: 'Ramp-down initiated', description: 'Graceful ramp-down from 300 to 0 users' },
];

const run2Scorecard: Scorecard = {
  overallScore: 72,
  categories: [
    { name: 'Latency', score: 78, weight: 0.3 },
    { name: 'Reliability', score: 58, weight: 0.25 },
    { name: 'Throughput', score: 82, weight: 0.2 },
    { name: 'Resilience', score: 75, weight: 0.15 },
    { name: 'Stability', score: 68, weight: 0.1 },
  ],
  penalties: [
    { reason: 'Error rate exceeded threshold (-8)', amount: 8 },
    { reason: 'Saturation event detected (-5)', amount: 5 },
  ],
};

const run2Ai: AiAnalysis = {
  primaryFinding: 'The Payment Gateway system shows acceptable baseline performance but degrades under sustained 300-user load due to database connection pool saturation, leading to a 3.8% error spike at the 27-minute mark.',
  secondaryObservations: [
    'Latency remained acceptable (P95 < 300ms) but trended upward after the saturation event at 27 minutes.',
    'Throughput held above floor but declined 18% post-saturation — recovery was incomplete.',
    'Error spike was dominated by timeout errors from the payment provider gateway, not application errors.',
    'Recovery time of 45s was within threshold, suggesting the connection pool rebalancing mechanism works but triggers too late.',
  ],
  riskAssessment: { level: 'medium', summary: 'Connection pool sizing is insufficient for 300-user sustained load. Risk of cascading timeouts under real-world traffic patterns.' },
  recommendations: [
    { text: 'Increase database connection pool size from 50 to 80 connections and retest.', priority: 'high' },
    { text: 'Add circuit breaker on payment provider calls with 2s timeout.', priority: 'high' },
    { text: 'Lower connection pool saturation alert threshold from 85% to 70%.', priority: 'medium' },
  ],
  confidence: 82,
  evidenceLinks: [
    { label: 'Connection pool saturation at 27min', eventId: 'e2-3', metric: 'latencyP95', timestamp: 1620 },
    { label: 'Error spike at 32min', eventId: 'e2-4', metric: 'errorRate', timestamp: 1920 },
    { label: 'Partial recovery at 35min', eventId: 'e2-5', metric: 'errorRate', timestamp: 2100 },
  ],
  testGoalMet: true,
  actionRequired: true,
  decisionSpine: [
    { basis: 'Error rate exceeded threshold (2.1% vs 1%)', evidencePointers: ['Spike to 3.8% at 32min', 'Timeout errors from payment gateway'] },
    { basis: 'Stability score below threshold (72 vs 80)', evidencePointers: ['Latency variance after saturation', 'Incomplete throughput recovery'] },
    { basis: 'Root cause identified and addressable', evidencePointers: ['Connection pool saturation at 85%', 'Recovery mechanism functional but delayed'] },
  ],
};

// ===================== RUN 3: Failing =====================
const run3: Run = {
  id: 'run-003',
  name: 'Search Index Capacity Test',
  planName: 'Search Platform v3.0',
  environment: 'staging',
  status: 'completed',
  stabilityScore: 41,
  startTime: '2025-02-25T09:00:00Z',
  endTime: '2025-02-25T09:35:00Z',
  durationSeconds: 2100,
  scenarioCount: 2,
  peakConcurrency: 400,
};

const run3Events: RunEvent[] = [
  { id: 'e3-1', bucket: 1, timestamp: 0, type: 'ramp', severity: 'info', title: 'Ramp-up started', description: 'Concurrency ramping from 0 to 400 users over 10 minutes' },
  { id: 'e3-2', bucket: 49, timestamp: 480, type: 'threshold-breach', severity: 'warning', title: 'P95 latency threshold breach', description: 'P95 latency crossed 500ms threshold at 250 concurrent users' },
  { id: 'e3-3', bucket: 61, timestamp: 600, type: 'saturation', severity: 'critical', title: 'Index shard saturation', description: 'Search index shards at 100% capacity. Query queue depth growing.' },
  { id: 'e3-4', bucket: 79, timestamp: 780, type: 'error-spike', severity: 'critical', title: 'Cascading failures', description: 'Error rate exceeded 15%. Query timeouts causing upstream service failures.' },
  { id: 'e3-5', bucket: 103, timestamp: 1020, type: 'error-spike', severity: 'critical', title: 'Service degradation', description: 'Throughput collapsed to 120 rps. System operating in degraded mode.' },
  { id: 'e3-6', bucket: 151, timestamp: 1500, type: 'ramp', severity: 'info', title: 'Test aborted — ramp-down', description: 'Test terminated early due to sustained failures beyond recovery threshold.' },
];

const run3Scorecard: Scorecard = {
  overallScore: 41,
  categories: [
    { name: 'Latency', score: 28, weight: 0.3 },
    { name: 'Reliability', score: 22, weight: 0.25 },
    { name: 'Throughput', score: 35, weight: 0.2 },
    { name: 'Resilience', score: 15, weight: 0.15 },
    { name: 'Stability', score: 30, weight: 0.1 },
  ],
  penalties: [
    { reason: 'All metrics exceeded thresholds (-20)', amount: 20 },
    { reason: 'Cascading failure detected (-15)', amount: 15 },
    { reason: 'Test aborted early (-10)', amount: 10 },
  ],
};

const run3Ai: AiAnalysis = {
  primaryFinding: 'The Search Platform cannot sustain 400 concurrent users. Index shard saturation at 250 users triggers cascading failures — query timeouts, throughput collapse, and upstream service degradation. The system requires architectural changes before retesting.',
  secondaryObservations: [
    'Performance was acceptable up to ~200 concurrent users. Degradation began sharply at 250.',
    'The failure mode is deterministic: shard saturation → query queue buildup → timeouts → cascading failures.',
    'No recovery was observed even after partial ramp-down, indicating the failure state is sticky.',
    'Upstream services experienced knock-on effects, suggesting insufficient isolation/bulkheading.',
  ],
  riskAssessment: { level: 'critical', summary: 'The search platform will fail under production-scale traffic. Deploying at current capacity risks production outages.' },
  recommendations: [
    { text: 'Add horizontal shard scaling or increase shard count from 3 to 6 before retesting.', priority: 'high' },
    { text: 'Implement query-level circuit breaker with 1s timeout to prevent cascade.', priority: 'high' },
    { text: 'Add bulkhead isolation between search and upstream services.', priority: 'high' },
    { text: 'Retest at 200-user baseline to establish safe operating threshold.', priority: 'medium' },
  ],
  confidence: 92,
  evidenceLinks: [
    { label: 'Latency breach at 8min', eventId: 'e3-2', metric: 'latencyP95', timestamp: 480 },
    { label: 'Shard saturation at 10min', eventId: 'e3-3', metric: 'throughput', timestamp: 600 },
    { label: 'Cascading failures at 13min', eventId: 'e3-4', metric: 'errorRate', timestamp: 780 },
    { label: 'Throughput collapse at 17min', eventId: 'e3-5', metric: 'throughput', timestamp: 1020 },
  ],
  testGoalMet: false,
  actionRequired: true,
  decisionSpine: [
    { basis: 'All metrics exceeded thresholds', evidencePointers: ['P95 at 1,840ms (3.7x threshold)', 'Error rate 18.4% (9.2x threshold)', 'Throughput at 40% of floor'] },
    { basis: 'Cascading failure with no recovery', evidencePointers: ['Shard saturation at 250 users', 'Upstream services impacted', 'Test aborted at 25min'] },
    { basis: 'Architectural limitation identified', evidencePointers: ['3-shard config insufficient for 400-user load', 'No circuit breaker protection'] },
  ],
};

// ===================== RUN 4: Another clean run for comparison =====================
const run4: Run = {
  id: 'run-004',
  name: 'User Auth Service Baseline',
  planName: 'Auth Service v5.2',
  environment: 'production',
  status: 'completed',
  stabilityScore: 97,
  startTime: '2025-02-23T10:00:00Z',
  endTime: '2025-02-23T10:20:00Z',
  durationSeconds: 1200,
  scenarioCount: 2,
  peakConcurrency: 150,
};

// ===================== Exports =====================
export const allRuns: Run[] = [run1, run2, run3, run4];

export const runDetails: Record<string, RunDetail> = {
  'run-001': {
    run: run1,
    metrics: generateMetrics(1800, 10, 'clean'),
    events: run1Events,
    scorecard: run1Scorecard,
    aiAnalysis: run1Ai,
  },
  'run-002': {
    run: run2,
    metrics: generateMetrics(2700, 10, 'degraded'),
    events: run2Events,
    scorecard: run2Scorecard,
    aiAnalysis: run2Ai,
  },
  'run-003': {
    run: run3,
    metrics: generateMetrics(2100, 10, 'failing'),
    events: run3Events,
    scorecard: run3Scorecard,
    aiAnalysis: run3Ai,
  },
};

export function getRunById(id: string): Run | undefined {
  return allRuns.find(r => r.id === id);
}

export function getRunDetail(id: string): RunDetail | undefined {
  return runDetails[id];
}
