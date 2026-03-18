/**
 * A/B test seed scenarios.
 *
 * A1 — Health Baseline: lightweight GET /health, fast & consistent.
 * B1 — Latency Spike:   GET /scenarios/spike, probabilistic latency bursts.
 *
 * Identical load profile, VUs, duration, ramp, think-time, and assertions.
 * Only the target endpoint differs so runs are directly comparable.
 */

import type { Scenario } from '../types';

// Stable UUIDs so seeds are idempotent (won't duplicate on reload)
const A1_ID = '00000000-ab01-4000-a000-000000000001';
const B1_ID = '00000000-ab01-4000-b000-000000000002';

const now = new Date().toISOString();

// ─── Shared load profile ────────────────────────────────────────────────────

const sharedLoadProfile: Scenario['load_profile'] = {
  virtual_users: 20,
  ramp_up: { duration_seconds: 30, curve: 'linear' },
  ramp_down: { duration_seconds: 10, curve: 'linear' },
  pattern: { type: 'constant' },
  duration: { type: 'fixed', fixed: { seconds: 300 } },
  data_sources: [],
  think_time_defaults: { type: 'fixed', fixed: { duration_ms: 500 } },
};

// ─── Shared advanced config ─────────────────────────────────────────────────

const sharedAdvanced: NonNullable<Scenario['advanced']> = {
  connection: { pool_size: 100, max_idle: 10, keep_alive: true },
  protocol: { http2_multiplexing_limit: 100, tls_verify: true, cert_path: '', key_path: '' },
  network: { proxy_url: '', proxy_auth: { username: '', password: '' }, dns_overrides: [] },
  observability: { trace_injection: false, otel_endpoint: '' },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeStep(id: string, name: string, path: string): Scenario['steps'][number] {
  return {
    id,
    name,
    config: {
      step_type: 'rest',
      rest: {
        method: 'GET',
        path,
        protocol: 'HTTP/1.1',
        follow_redirects: true,
        max_redirects: 5,
        query_params: [],
        headers: [],
        payload: { content_type: 'none' },
      },
    },
    timeout_ms: 30000,
    auth: { type: 'none' },
    assertions: [
      { id: `${id}-assert-status`, source: 'status', property: '', operator: 'equals', expected: '200' },
    ],
    extractions: [],
    think_time: { type: 'fixed', fixed: { duration_ms: 500 } },
    failure: { behavior: 'continue' },
  };
}

// ─── Scenario A1 — Health Baseline ──────────────────────────────────────────

export const scenarioA1: Scenario = {
  metadata: {
    id: A1_ID,
    name: 'A1 A/B — Health Baseline',
    description: 'A/B control: lightweight health check endpoint. Expect fast, consistent latency with near-zero errors.',
    tags: ['ab-test', 'baseline', 'read-heavy'],
    base_url: 'http://localhost:4010',
    version: 1,
    owner: '',
    created_at: now,
    updated_at: now,
    global_variables: [],
    secret_refs: [],
    default_timeout_ms: 30000,
  },
  steps: [makeStep(`${A1_ID}-step-1`, 'Health Check', '/health')],
  load_profile: { ...sharedLoadProfile },
  advanced: { ...sharedAdvanced },
};

// ─── Scenario B1 — Latency Spike ────────────────────────────────────────────

export const scenarioB1: Scenario = {
  metadata: {
    id: B1_ID,
    name: 'B1 A/B — Latency Spike',
    description: 'A/B variant: spike endpoint with probabilistic latency bursts. Expect variable P99 and occasional slow responses.',
    tags: ['ab-test', 'high-frequency', 'concurrency-sensitive'],
    base_url: 'http://localhost:4010',
    version: 1,
    owner: '',
    created_at: now,
    updated_at: now,
    global_variables: [],
    secret_refs: [],
    default_timeout_ms: 30000,
  },
  steps: [makeStep(`${B1_ID}-step-1`, 'Spike Endpoint', '/scenarios/spike?fast=30&slow=5000&probability=0.05')],
  load_profile: { ...sharedLoadProfile },
  advanced: { ...sharedAdvanced },
};

export const AB_SEEDS = [scenarioA1, scenarioB1];
export const AB_SEED_IDS = new Set([A1_ID, B1_ID]);
