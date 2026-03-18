import { describe, it, expect } from 'vitest';
import { RunStatus, NetworkStatus, MemberStatus } from '@pacct/protocol-ts';
import {
  canInitiateRun,
  initiateRun,
  abortRun,
  completeRun,
  failRun,
  checkCooldown,
  checkBudgetCap,
  getActiveRun,
} from '../run';
import {
  createTestNetworkState,
  createTestMember,
  createTestRunSummary,
  createTestRunPolicy,
  testNodeId,
  testRunId,
} from './helpers';

describe('canInitiateRun', () => {
  it('allows run when all conditions met', () => {
    const state = createTestNetworkState();
    const policy = createTestRunPolicy();
    const result = canInitiateRun(
      state,
      testNodeId('node-creator'),
      policy,
      100000,
    );
    expect(result.allowed).toBe(true);
  });

  it('rejects when network is not active', () => {
    const state = createTestNetworkState({ status: NetworkStatus.Degraded });
    const policy = createTestRunPolicy();
    const result = canInitiateRun(
      state,
      testNodeId('node-creator'),
      policy,
      100000,
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('not active');
  });

  it('rejects non-creator when creator_only policy', () => {
    const state = createTestNetworkState();
    const policy = createTestRunPolicy({ allowedInitiators: 'creator_only' });
    const result = canInitiateRun(
      state,
      testNodeId('node-2'),
      policy,
      100000,
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('creator');
  });

  it('rejects when initiator is not an active member', () => {
    const state = createTestNetworkState({
      members: [
        createTestMember('node-creator', { status: MemberStatus.Offline }),
      ],
    });
    const policy = createTestRunPolicy();
    const result = canInitiateRun(
      state,
      testNodeId('node-creator'),
      policy,
      100000,
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('not an active member');
  });

  it('rejects when not all members online and policy requires it', () => {
    const state = createTestNetworkState({
      members: [
        createTestMember('node-creator'),
        createTestMember('node-2', { status: MemberStatus.Offline }),
      ],
    });
    const policy = createTestRunPolicy({ allMembersOnlineRequired: true });
    const result = canInitiateRun(
      state,
      testNodeId('node-creator'),
      policy,
      100000,
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('online');
  });

  it('rejects when a run is already in progress', () => {
    const state = createTestNetworkState({
      runHistory: [createTestRunSummary({ status: RunStatus.Pending })],
    });
    const policy = createTestRunPolicy();
    const result = canInitiateRun(
      state,
      testNodeId('node-creator'),
      policy,
      100000,
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('already in progress');
  });

  it('rejects when cooldown not elapsed', () => {
    const state = createTestNetworkState({
      runHistory: [
        createTestRunSummary({
          status: RunStatus.Completed,
          completedAt: 90000,
        }),
      ],
    });
    const policy = createTestRunPolicy({ minimumIntervalMs: 60000 });
    const result = canInitiateRun(
      state,
      testNodeId('node-creator'),
      policy,
      100000, // only 10000ms since last completion
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('interval');
  });

  it('rejects when budget cap exceeded', () => {
    const runs = Array.from({ length: 10 }, (_, i) =>
      createTestRunSummary({
        runId: testRunId(`run-${i}`),
        status: RunStatus.Completed,
        startedAt: 50000 + i * 1000,
        completedAt: 51000 + i * 1000,
      }),
    );
    const state = createTestNetworkState({ runHistory: runs });
    const policy = createTestRunPolicy({
      maxRunsPerPeriod: 10,
      periodLengthDays: 30,
      minimumIntervalMs: 0,
    });
    const result = canInitiateRun(
      state,
      testNodeId('node-creator'),
      policy,
      100000,
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('exceeded');
  });
});

describe('initiateRun', () => {
  it('adds a new run with Pending status', () => {
    const state = createTestNetworkState();
    const result = initiateRun(
      state,
      testRunId('new-run'),
      testNodeId('node-creator'),
      5000,
    );
    expect(result.runHistory).toHaveLength(1);
    expect(result.runHistory[0].status).toBe(RunStatus.Pending);
    expect(result.runHistory[0].runId).toBe(testRunId('new-run'));
  });
});

describe('abortRun', () => {
  it('sets run status to Aborted', () => {
    const state = createTestNetworkState({
      runHistory: [createTestRunSummary({ runId: testRunId('run-1') })],
    });
    const result = abortRun(state, testRunId('run-1'), 'cancelled', 5000);
    expect(result.runHistory[0].status).toBe(RunStatus.Aborted);
    expect(result.runHistory[0].abortedAt).toBe(5000);
  });
});

describe('completeRun', () => {
  it('sets run status to Completed', () => {
    const state = createTestNetworkState({
      runHistory: [createTestRunSummary({ runId: testRunId('run-1') })],
    });
    const result = completeRun(state, testRunId('run-1'), 5000);
    expect(result.runHistory[0].status).toBe(RunStatus.Completed);
    expect(result.runHistory[0].completedAt).toBe(5000);
  });
});

describe('failRun', () => {
  it('sets run status to Failed', () => {
    const state = createTestNetworkState({
      runHistory: [createTestRunSummary({ runId: testRunId('run-1') })],
    });
    const result = failRun(state, testRunId('run-1'), 'error', 5000);
    expect(result.runHistory[0].status).toBe(RunStatus.Failed);
  });
});

describe('checkCooldown', () => {
  it('returns true when no previous run', () => {
    expect(checkCooldown(undefined, 5000, 60000)).toBe(true);
  });

  it('returns true when enough time elapsed', () => {
    expect(checkCooldown(1000, 70000, 60000)).toBe(true);
  });

  it('returns false when not enough time elapsed', () => {
    expect(checkCooldown(1000, 50000, 60000)).toBe(false);
  });
});

describe('checkBudgetCap', () => {
  it('returns true when under budget', () => {
    expect(checkBudgetCap([], 100000, 10, 30)).toBe(true);
  });

  it('returns false when at budget cap', () => {
    const runs = Array.from({ length: 10 }, (_, i) =>
      createTestRunSummary({
        runId: testRunId(`run-${i}`),
        status: RunStatus.Completed,
        startedAt: 50000 + i * 1000,
      }),
    );
    expect(checkBudgetCap(runs, 100000, 10, 30)).toBe(false);
  });

  it('does not count aborted runs', () => {
    const runs = Array.from({ length: 10 }, (_, i) =>
      createTestRunSummary({
        runId: testRunId(`run-${i}`),
        status: RunStatus.Aborted,
        startedAt: 50000 + i * 1000,
      }),
    );
    expect(checkBudgetCap(runs, 100000, 10, 30)).toBe(true);
  });
});

describe('getActiveRun', () => {
  it('returns undefined when no active runs', () => {
    const state = createTestNetworkState({
      runHistory: [
        createTestRunSummary({ status: RunStatus.Completed }),
      ],
    });
    expect(getActiveRun(state)).toBeUndefined();
  });

  it('returns the active run', () => {
    const state = createTestNetworkState({
      runHistory: [
        createTestRunSummary({ runId: testRunId('run-1'), status: RunStatus.Computing }),
      ],
    });
    const active = getActiveRun(state);
    expect(active).toBeDefined();
    expect(active!.runId).toBe(testRunId('run-1'));
  });
});

describe('run lifecycle', () => {
  it('goes through initiate -> complete flow', () => {
    let state = createTestNetworkState();

    state = initiateRun(state, testRunId('run-1'), testNodeId('node-creator'), 1000);
    expect(getActiveRun(state)).toBeDefined();

    state = completeRun(state, testRunId('run-1'), 2000);
    expect(getActiveRun(state)).toBeUndefined();
    expect(state.runHistory[0].status).toBe(RunStatus.Completed);
  });

  it('goes through initiate -> abort flow', () => {
    let state = createTestNetworkState();

    state = initiateRun(state, testRunId('run-1'), testNodeId('node-creator'), 1000);
    state = abortRun(state, testRunId('run-1'), 'cancelled', 2000);
    expect(getActiveRun(state)).toBeUndefined();
    expect(state.runHistory[0].status).toBe(RunStatus.Aborted);
  });
});
