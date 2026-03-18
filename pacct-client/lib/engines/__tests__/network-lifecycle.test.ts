import { describe, it, expect } from 'vitest';
import { NetworkStatus, MemberStatus } from '@pacct/protocol-ts';
import {
  canTransition,
  transition,
  checkPreActivationTimeout,
  checkPostActivationInactivity,
  shouldDissolve,
} from '../network-lifecycle';
import { createTestNetworkState, createTestMember } from './helpers';

describe('canTransition', () => {
  const validTransitions: [NetworkStatus, NetworkStatus][] = [
    [NetworkStatus.Draft, NetworkStatus.Pending],
    [NetworkStatus.Pending, NetworkStatus.Active],
    [NetworkStatus.Pending, NetworkStatus.Dissolved],
    [NetworkStatus.Active, NetworkStatus.Degraded],
    [NetworkStatus.Active, NetworkStatus.Dissolved],
    [NetworkStatus.Degraded, NetworkStatus.Active],
    [NetworkStatus.Degraded, NetworkStatus.Dissolved],
    [NetworkStatus.Dissolved, NetworkStatus.Archived],
  ];

  it.each(validTransitions)('allows %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  const invalidTransitions: [NetworkStatus, NetworkStatus][] = [
    [NetworkStatus.Draft, NetworkStatus.Active],
    [NetworkStatus.Draft, NetworkStatus.Dissolved],
    [NetworkStatus.Pending, NetworkStatus.Degraded],
    [NetworkStatus.Active, NetworkStatus.Pending],
    [NetworkStatus.Active, NetworkStatus.Archived],
    [NetworkStatus.Degraded, NetworkStatus.Pending],
    [NetworkStatus.Dissolved, NetworkStatus.Active],
    [NetworkStatus.Archived, NetworkStatus.Draft],
    [NetworkStatus.Archived, NetworkStatus.Active],
  ];

  it.each(invalidTransitions)('rejects %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });
});

describe('transition', () => {
  it('transitions to a valid state', () => {
    const state = createTestNetworkState({ status: NetworkStatus.Active });
    const result = transition(state, NetworkStatus.Degraded, 'member offline');
    expect('error' in result && (result as any).error === true).toBe(false);
    expect((result as any).status).toBe(NetworkStatus.Degraded);
  });

  it('returns an error for invalid transitions', () => {
    const state = createTestNetworkState({ status: NetworkStatus.Draft });
    const result = transition(state, NetworkStatus.Active, 'invalid');
    expect((result as any).error).toBe(true);
  });

  it('sets activatedAt on first activation', () => {
    const state = createTestNetworkState({
      status: NetworkStatus.Pending,
      activatedAt: undefined,
    });
    const result = transition(state, NetworkStatus.Active, 'ready');
    expect((result as any).activatedAt).toBeDefined();
  });

  it('sets dissolvedAt on dissolution', () => {
    const state = createTestNetworkState({ status: NetworkStatus.Active });
    const result = transition(state, NetworkStatus.Dissolved, 'done');
    expect((result as any).dissolvedAt).toBeDefined();
  });

  it('marks active members as pending_reack on degraded transition', () => {
    const state = createTestNetworkState({
      status: NetworkStatus.Active,
      members: [
        createTestMember('node-1', { status: MemberStatus.Active }),
        createTestMember('node-2', { status: MemberStatus.Offline }),
      ],
    });
    const result = transition(state, NetworkStatus.Degraded, 'degraded');
    const members = (result as any).members;
    expect(members[0].status).toBe(MemberStatus.PendingReAck);
    // Offline member stays offline
    expect(members[1].status).toBe(MemberStatus.Offline);
  });
});

describe('checkPreActivationTimeout', () => {
  it('returns true when timeout elapsed in pending state', () => {
    const state = createTestNetworkState({
      status: NetworkStatus.Pending,
      createdAt: 1000,
    });
    expect(checkPreActivationTimeout(state, 11000, 10000)).toBe(true);
  });

  it('returns false when not enough time has elapsed', () => {
    const state = createTestNetworkState({
      status: NetworkStatus.Pending,
      createdAt: 1000,
    });
    expect(checkPreActivationTimeout(state, 5000, 10000)).toBe(false);
  });

  it('returns false when not in pending state', () => {
    const state = createTestNetworkState({
      status: NetworkStatus.Active,
      createdAt: 1000,
    });
    expect(checkPreActivationTimeout(state, 100000, 10000)).toBe(false);
  });
});

describe('checkPostActivationInactivity', () => {
  it('returns true when no runs and timeout elapsed since activation', () => {
    const state = createTestNetworkState({
      status: NetworkStatus.Active,
      activatedAt: 1000,
      runHistory: [],
    });
    expect(checkPostActivationInactivity(state, 11000, 10000)).toBe(true);
  });

  it('returns false when not active', () => {
    const state = createTestNetworkState({
      status: NetworkStatus.Degraded,
      activatedAt: 1000,
    });
    expect(checkPostActivationInactivity(state, 100000, 10000)).toBe(false);
  });
});

describe('shouldDissolve', () => {
  it('returns true when active members below minimum', () => {
    const state = createTestNetworkState({
      members: [
        createTestMember('node-1', { status: MemberStatus.Left }),
        createTestMember('node-2', { status: MemberStatus.Left }),
      ],
    });
    expect(shouldDissolve(state, 2)).toBe(true);
  });

  it('returns false when enough active members', () => {
    const state = createTestNetworkState({
      members: [
        createTestMember('node-1', { status: MemberStatus.Active }),
        createTestMember('node-2', { status: MemberStatus.Active }),
        createTestMember('node-3', { status: MemberStatus.Offline }),
      ],
    });
    expect(shouldDissolve(state, 2)).toBe(false);
  });
});
