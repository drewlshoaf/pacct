import { getPool } from '../db/pool';
import { LeaseEngine, LeaseEngineConfig } from './lease-engine';

let leaseEngine: LeaseEngine | null = null;

function getConfig(): LeaseEngineConfig {
  return {
    leaseTimeoutMs: parseInt(process.env.LEASE_TIMEOUT_MS || '90000', 10),
    sweepIntervalMs: parseInt(process.env.LEASE_SWEEP_INTERVAL_MS || '15000', 10),
    staleThresholdMs: parseInt(process.env.STALE_THRESHOLD_MS || '60000', 10),
  };
}

export function getLeaseEngine(): LeaseEngine {
  if (!leaseEngine) {
    leaseEngine = new LeaseEngine(getPool(), getConfig());
  }
  return leaseEngine;
}

export function startLeaseEngine(): LeaseEngine {
  const engine = getLeaseEngine();
  engine.startSweep();
  return engine;
}

export function stopLeaseEngine(): void {
  if (leaseEngine) {
    leaseEngine.stopSweep();
  }
}
