import { describe, it, expect } from 'vitest';
import { MemberStatus } from '@pacct/protocol-ts';
import {
  addMember,
  removeMember,
  reAcknowledge,
  allMembersReAcknowledged,
  getActiveMembers,
  getActiveAcknowledgedMembers,
  isNetworkComputationCapable,
  setMemberOffline,
  setMemberOnline,
  allRequiredMembersOnline,
} from '../membership';
import {
  createTestNetworkState,
  createTestMember,
  testNodeId,
} from './helpers';

describe('addMember', () => {
  it('adds a new member with Active status', () => {
    const state = createTestNetworkState({ members: [] });
    const result = addMember(state, testNodeId('new-node'), 5000);
    expect(result.members).toHaveLength(1);
    expect(result.members[0].nodeId).toBe('new-node');
    expect(result.members[0].status).toBe(MemberStatus.Active);
    expect(result.members[0].joinedAt).toBe(5000);
  });

  it('does not mutate original state', () => {
    const state = createTestNetworkState({ members: [] });
    const result = addMember(state, testNodeId('new-node'), 5000);
    expect(state.members).toHaveLength(0);
    expect(result.members).toHaveLength(1);
  });
});

describe('removeMember', () => {
  it('marks member as left', () => {
    const state = createTestNetworkState({
      members: [createTestMember('node-1')],
    });
    const result = removeMember(state, testNodeId('node-1'), 'left', 5000);
    expect(result.members[0].status).toBe(MemberStatus.Left);
    expect(result.members[0].leftAt).toBe(5000);
  });

  it('marks member as expelled', () => {
    const state = createTestNetworkState({
      members: [createTestMember('node-1')],
    });
    const result = removeMember(state, testNodeId('node-1'), 'expelled', 5000);
    expect(result.members[0].status).toBe(MemberStatus.Expelled);
  });
});

describe('reAcknowledge', () => {
  it('re-acknowledges a pending_reack member', () => {
    const state = createTestNetworkState({
      members: [
        createTestMember('node-1', { status: MemberStatus.PendingReAck }),
      ],
    });
    const result = reAcknowledge(state, testNodeId('node-1'), 5000);
    expect(result.members[0].status).toBe(MemberStatus.Active);
    expect(result.members[0].acknowledgedAt).toBe(5000);
  });

  it('does not change active members', () => {
    const state = createTestNetworkState({
      members: [createTestMember('node-1', { status: MemberStatus.Active })],
    });
    const result = reAcknowledge(state, testNodeId('node-1'), 5000);
    expect(result.members[0].status).toBe(MemberStatus.Active);
  });
});

describe('allMembersReAcknowledged', () => {
  it('returns true when no pending_reack members', () => {
    const state = createTestNetworkState({
      members: [
        createTestMember('node-1', { status: MemberStatus.Active }),
        createTestMember('node-2', { status: MemberStatus.Left }),
      ],
    });
    expect(allMembersReAcknowledged(state)).toBe(true);
  });

  it('returns false when pending_reack members exist', () => {
    const state = createTestNetworkState({
      members: [
        createTestMember('node-1', { status: MemberStatus.Active }),
        createTestMember('node-2', { status: MemberStatus.PendingReAck }),
      ],
    });
    expect(allMembersReAcknowledged(state)).toBe(false);
  });
});

describe('getActiveMembers', () => {
  it('returns active and offline members', () => {
    const state = createTestNetworkState({
      members: [
        createTestMember('node-1', { status: MemberStatus.Active }),
        createTestMember('node-2', { status: MemberStatus.Offline }),
        createTestMember('node-3', { status: MemberStatus.Left }),
        createTestMember('node-4', { status: MemberStatus.Expelled }),
      ],
    });
    const active = getActiveMembers(state);
    expect(active).toHaveLength(2);
  });
});

describe('getActiveAcknowledgedMembers', () => {
  it('returns only active (not offline) members', () => {
    const state = createTestNetworkState({
      members: [
        createTestMember('node-1', { status: MemberStatus.Active }),
        createTestMember('node-2', { status: MemberStatus.Offline }),
      ],
    });
    const acked = getActiveAcknowledgedMembers(state);
    expect(acked).toHaveLength(1);
    expect(acked[0].nodeId).toBe(testNodeId('node-1'));
  });
});

describe('isNetworkComputationCapable', () => {
  it('returns true when enough active members', () => {
    const state = createTestNetworkState({
      members: [
        createTestMember('node-1'),
        createTestMember('node-2'),
        createTestMember('node-3'),
      ],
    });
    expect(isNetworkComputationCapable(state, 3)).toBe(true);
  });

  it('returns false when not enough active members', () => {
    const state = createTestNetworkState({
      members: [createTestMember('node-1')],
    });
    expect(isNetworkComputationCapable(state, 3)).toBe(false);
  });
});

describe('setMemberOffline / setMemberOnline', () => {
  it('sets an active member offline', () => {
    const state = createTestNetworkState({
      members: [createTestMember('node-1', { status: MemberStatus.Active })],
    });
    const result = setMemberOffline(state, testNodeId('node-1'));
    expect(result.members[0].status).toBe(MemberStatus.Offline);
  });

  it('sets an offline member online', () => {
    const state = createTestNetworkState({
      members: [createTestMember('node-1', { status: MemberStatus.Offline })],
    });
    const result = setMemberOnline(state, testNodeId('node-1'));
    expect(result.members[0].status).toBe(MemberStatus.Active);
  });

  it('does not change non-active member when setting offline', () => {
    const state = createTestNetworkState({
      members: [createTestMember('node-1', { status: MemberStatus.Left })],
    });
    const result = setMemberOffline(state, testNodeId('node-1'));
    expect(result.members[0].status).toBe(MemberStatus.Left);
  });
});

describe('allRequiredMembersOnline', () => {
  it('returns true when all living members are active', () => {
    const state = createTestNetworkState({
      members: [
        createTestMember('node-1', { status: MemberStatus.Active }),
        createTestMember('node-2', { status: MemberStatus.Active }),
        createTestMember('node-3', { status: MemberStatus.Left }),
      ],
    });
    expect(allRequiredMembersOnline(state)).toBe(true);
  });

  it('returns false when some living members are offline', () => {
    const state = createTestNetworkState({
      members: [
        createTestMember('node-1', { status: MemberStatus.Active }),
        createTestMember('node-2', { status: MemberStatus.Offline }),
      ],
    });
    expect(allRequiredMembersOnline(state)).toBe(false);
  });
});
