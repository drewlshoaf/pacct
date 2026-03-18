import { describe, it, expect } from 'vitest';
import { NetworkStatus, MemberStatus, RunStatus } from '@pacct/protocol-ts';
import { canInitiateRun, checkCooldown, checkBudgetCap } from '../../engines/run';
import {
  createTestNetworkState,
  createTestMember,
  createTestRunSummary,
  createTestRunPolicy,
  testNodeId,
  testRunId,
} from '../../engines/__tests__/helpers';

describe('Run Policy Edge Cases', () => {
  it('rejects run initiation when network is dissolved', () => {
    const state = createTestNetworkState({
      status: NetworkStatus.Dissolved,
      members: [
        createTestMember('node-creator', { status: MemberStatus.Active }),
        createTestMember('node-2', { status: MemberStatus.Active }),
        createTestMember('node-3', { status: MemberStatus.Active }),
      ],
    });
    const result = canInitiateRun(state, testNodeId('node-creator'), createTestRunPolicy(), Date.now());
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('not active');
  });

  it('rejects run initiation when network is degraded', () => {
    const state = createTestNetworkState({ status: NetworkStatus.Degraded });
    const result = canInitiateRun(state, testNodeId('node-creator'), createTestRunPolicy(), Date.now());
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('not active');
  });

  it('rejects run initiation when network is pending', () => {
    const state = createTestNetworkState({ status: NetworkStatus.Pending });
    const result = canInitiateRun(state, testNodeId('node-creator'), createTestRunPolicy(), Date.now());
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('not active');
  });

  it('rejects run initiation when network is draft', () => {
    const state = createTestNetworkState({ status: NetworkStatus.Draft });
    const result = canInitiateRun(state, testNodeId('node-creator'), createTestRunPolicy(), Date.now());
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('not active');
  });

  it('rejects run initiation with 0 active members online', () => {
    const state = createTestNetworkState({
      status: NetworkStatus.Active,
      members: [
        createTestMember('node-creator', { status: MemberStatus.Offline }),
        createTestMember('node-2', { status: MemberStatus.Offline }),
        createTestMember('node-3', { status: MemberStatus.Offline }),
      ],
    });
    const policy = createTestRunPolicy({ allMembersOnlineRequired: true });
    const result = canInitiateRun(state, testNodeId('node-creator'), policy, Date.now());
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('not an active member');
  });

  it('rejects run initiation with only 1 of 3 members online', () => {
    const state = createTestNetworkState({
      status: NetworkStatus.Active,
      members: [
        createTestMember('node-creator', { status: MemberStatus.Active }),
        createTestMember('node-2', { status: MemberStatus.Offline }),
        createTestMember('node-3', { status: MemberStatus.Offline }),
      ],
    });
    const policy = createTestRunPolicy({ allMembersOnlineRequired: true });
    const result = canInitiateRun(state, testNodeId('node-creator'), policy, Date.now());
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Not all required members are online');
  });

  it('rejects run initiation exactly at cooldown boundary (1ms too early)', () => {
    const lastCompletedAt = 1000;
    const minimumIntervalMs = 60000;
    const now = lastCompletedAt + minimumIntervalMs - 1; // 1ms too early

    const result = checkCooldown(lastCompletedAt, now, minimumIntervalMs);
    expect(result).toBe(false);
  });

  it('allows run initiation at exact cooldown boundary', () => {
    const lastCompletedAt = 1000;
    const minimumIntervalMs = 60000;
    const now = lastCompletedAt + minimumIntervalMs; // exactly at boundary

    const result = checkCooldown(lastCompletedAt, now, minimumIntervalMs);
    expect(result).toBe(true);
  });

  it('rejects run initiation exactly at budget cap', () => {
    const now = Date.now();
    const periodLengthDays = 30;
    const maxRunsPerPeriod = 2;
    const periodMs = periodLengthDays * 24 * 60 * 60 * 1000;

    const runHistory = [
      createTestRunSummary({
        runId: testRunId('run-1'),
        status: RunStatus.Completed,
        startedAt: now - periodMs + 1000,
        completedAt: now - periodMs + 2000,
      }),
      createTestRunSummary({
        runId: testRunId('run-2'),
        status: RunStatus.Completed,
        startedAt: now - 1000,
        completedAt: now - 500,
      }),
    ];

    const result = checkBudgetCap(runHistory, now, maxRunsPerPeriod, periodLengthDays);
    expect(result).toBe(false);
  });

  it('rejects run initiation when there is already an active run', () => {
    const state = createTestNetworkState({
      status: NetworkStatus.Active,
      runHistory: [
        createTestRunSummary({ status: RunStatus.Collecting }),
      ],
    });
    const result = canInitiateRun(state, testNodeId('node-creator'), createTestRunPolicy(), Date.now());
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('already in progress');
  });

  it('rejects creator-only initiation by non-creator', () => {
    const state = createTestNetworkState({
      status: NetworkStatus.Active,
      creatorNodeId: testNodeId('node-creator'),
      members: [
        createTestMember('node-creator', { status: MemberStatus.Active }),
        createTestMember('node-2', { status: MemberStatus.Active }),
        createTestMember('node-3', { status: MemberStatus.Active }),
      ],
    });
    const policy = createTestRunPolicy({ allowedInitiators: 'creator_only' });
    const result = canInitiateRun(state, testNodeId('node-2'), policy, Date.now());
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Only the network creator');
  });

  it('rejects any_member initiation by expelled member', () => {
    const state = createTestNetworkState({
      status: NetworkStatus.Active,
      members: [
        createTestMember('node-creator', { status: MemberStatus.Active }),
        createTestMember('node-2', { status: MemberStatus.Expelled }),
        createTestMember('node-3', { status: MemberStatus.Active }),
      ],
    });
    const policy = createTestRunPolicy({ allowedInitiators: 'any_member' });
    const result = canInitiateRun(state, testNodeId('node-2'), policy, Date.now());
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('not an active member');
  });
});
