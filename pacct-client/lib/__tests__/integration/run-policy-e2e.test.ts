/**
 * Run Policy Integration Test
 *
 * Tests run policy enforcement end-to-end: cooldown, budget cap,
 * member online requirements, concurrent run blocking, and mid-run abort.
 */

import { describe, it, expect } from 'vitest';
import { NetworkStatus, MemberStatus, RunStatus } from '@pacct/protocol-ts';
import type { RunId } from '@pacct/protocol-ts';

import {
  canInitiateRun,
  initiateRun,
  completeRun,
  abortRun,
  getActiveRun,
} from '../../engines/run';
import {
  setMemberOffline,
  setMemberOnline,
} from '../../engines/membership';
import type { ExtendedNetworkState, RunPolicyConfig } from '../../engines/types';
import {
  createTestNetwork,
  makeRunId,
  advanceTime,
} from './test-helpers';

describe('Run Policy E2E', () => {
  it('enforces all run policy constraints end-to-end', async () => {
    // ── Step 1: Create active network with 3 members ──
    const { state: initialState, members, specs } = await createTestNetwork(3);
    let state = initialState;
    const [nodeA, nodeB, nodeC] = members.map((m) => m.nodeId);

    expect(state.status).toBe(NetworkStatus.Active);

    // ── Step 2: Configure run policy ──
    const runPolicy: RunPolicyConfig = {
      ...specs.governance.runPolicy,
      maxRunsPerPeriod: 2,
      periodLengthDays: 7,
      minimumIntervalMs: 60000,
      allMembersOnlineRequired: true,
    };

    const baseTime = state.createdAt + 200000;

    // ── Step 3: Run 1 succeeds ──
    const runId1 = makeRunId();
    const t1 = baseTime;

    let canRun1 = canInitiateRun(state, nodeA, runPolicy, t1);
    expect(canRun1.allowed).toBe(true);

    state = initiateRun(state, runId1, nodeA, t1) as ExtendedNetworkState;
    expect(state.runHistory).toHaveLength(1);
    expect(state.runHistory[0].status).toBe(RunStatus.Pending);

    // Complete run 1
    const t1Complete = advanceTime(t1, 5000);
    state = completeRun(state, runId1, t1Complete) as ExtendedNetworkState;
    expect(state.runHistory[0].status).toBe(RunStatus.Completed);

    // ── Step 4: Run 2 immediately -> blocked by cooldown ──
    const runId2 = makeRunId();
    const t2Immediate = advanceTime(t1Complete, 1000); // only 1s after completion

    const canRun2Immediate = canInitiateRun(state, nodeA, runPolicy, t2Immediate);
    expect(canRun2Immediate.allowed).toBe(false);
    expect(canRun2Immediate.reason).toContain('interval');

    // ── Step 5: Advance time past cooldown, Run 2 succeeds ──
    const t2 = advanceTime(t1Complete, runPolicy.minimumIntervalMs + 1000);

    const canRun2 = canInitiateRun(state, nodeA, runPolicy, t2);
    expect(canRun2.allowed).toBe(true);

    state = initiateRun(state, runId2, nodeA, t2) as ExtendedNetworkState;
    const t2Complete = advanceTime(t2, 5000);
    state = completeRun(state, runId2, t2Complete) as ExtendedNetworkState;
    expect(state.runHistory).toHaveLength(2);
    expect(state.runHistory.filter((r) => r.status === RunStatus.Completed)).toHaveLength(2);

    // ── Step 6: Run 3 -> blocked by budget cap (2 runs in period) ──
    const runId3 = makeRunId();
    const t3Soon = advanceTime(t2Complete, runPolicy.minimumIntervalMs + 1000);

    const canRun3Budget = canInitiateRun(state, nodeA, runPolicy, t3Soon);
    expect(canRun3Budget.allowed).toBe(false);
    expect(canRun3Budget.reason).toContain('Maximum runs per period');

    // ── Step 7: Advance time past period, Run 3 succeeds ──
    const periodMs = runPolicy.periodLengthDays * 24 * 60 * 60 * 1000;
    const t3 = advanceTime(t1, periodMs + runPolicy.minimumIntervalMs + 1000);

    const canRun3 = canInitiateRun(state, nodeA, runPolicy, t3);
    expect(canRun3.allowed).toBe(true);

    state = initiateRun(state, runId3, nodeA, t3) as ExtendedNetworkState;
    const t3Complete = advanceTime(t3, 5000);
    state = completeRun(state, runId3, t3Complete) as ExtendedNetworkState;
    expect(state.runHistory).toHaveLength(3);

    // ── Step 8: Set member C offline, attempt run -> blocked ──
    state = setMemberOffline(state, nodeC) as ExtendedNetworkState;
    const runId4 = makeRunId();
    const t4 = advanceTime(t3Complete, runPolicy.minimumIntervalMs + 1000);

    const canRun4Offline = canInitiateRun(state, nodeA, runPolicy, t4);
    expect(canRun4Offline.allowed).toBe(false);
    expect(canRun4Offline.reason).toContain('online');

    // ── Step 9: Set C online, attempt run during active run -> blocked ──
    state = setMemberOnline(state, nodeC) as ExtendedNetworkState;

    state = initiateRun(state, runId4, nodeA, t4) as ExtendedNetworkState;
    expect(getActiveRun(state)).toBeDefined();

    const runId5 = makeRunId();
    const t5 = advanceTime(t4, 1000);
    const canRun5During = canInitiateRun(state, nodeA, runPolicy, t5);
    expect(canRun5During.allowed).toBe(false);
    expect(canRun5During.reason).toContain('already in progress');

    // ── Step 10: Mid-run: set C offline -> run aborts ──
    state = setMemberOffline(state, nodeC) as ExtendedNetworkState;

    // Simulate abort due to disconnect behavior
    state = abortRun(state, runId4, 'Member disconnected mid-run', advanceTime(t4, 3000)) as ExtendedNetworkState;
    const abortedRun = state.runHistory.find((r) => r.runId === runId4);
    expect(abortedRun!.status).toBe(RunStatus.Aborted);
    expect(getActiveRun(state)).toBeUndefined();
  });

  it('enforces creator-only initiator policy', async () => {
    const { state: initialState, members, specs } = await createTestNetwork(3);
    let state = initialState;
    const [nodeA, nodeB] = members.map((m) => m.nodeId);

    const creatorOnlyPolicy: RunPolicyConfig = {
      ...specs.governance.runPolicy,
      allowedInitiators: 'creator_only',
    };

    const t = state.createdAt + 200000;

    // Node A is creator -> allowed
    const canRunA = canInitiateRun(state, nodeA, creatorOnlyPolicy, t);
    expect(canRunA.allowed).toBe(true);

    // Node B is not creator -> blocked
    const canRunB = canInitiateRun(state, nodeB, creatorOnlyPolicy, t);
    expect(canRunB.allowed).toBe(false);
    expect(canRunB.reason).toContain('creator');
  });
});
