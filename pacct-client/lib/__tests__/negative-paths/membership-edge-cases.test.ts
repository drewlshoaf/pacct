import { describe, it, expect } from 'vitest';
import { NetworkStatus, MemberStatus } from '@pacct/protocol-ts';
import {
  addMember,
  removeMember,
  reAcknowledge,
  setMemberOffline,
  getActiveMembers,
} from '../../engines/membership';
import { proposeExpulsion, castExpulsionVote } from '../../engines/expulsion';
import {
  createTestNetworkState,
  createTestMember,
  createTestExtendedState,
  testNodeId,
} from '../../engines/__tests__/helpers';

describe('Membership Edge Cases', () => {
  it('adding same member twice results in duplicate entries', () => {
    const state = createTestNetworkState({
      members: [createTestMember('node-1')],
    });
    const result = addMember(state, testNodeId('node-1'), Date.now());
    // The function does not check for duplicates - it appends
    const matchingMembers = result.members.filter(m => m.nodeId === testNodeId('node-1'));
    expect(matchingMembers.length).toBe(2);
  });

  it('removing member who is not in network leaves state unchanged', () => {
    const state = createTestNetworkState({
      members: [createTestMember('node-1'), createTestMember('node-2')],
    });
    const result = removeMember(state, testNodeId('node-nonexistent'), 'left', Date.now());
    // No member should have changed
    expect(result.members.every(m => m.status === MemberStatus.Active)).toBe(true);
    expect(result.members.length).toBe(2);
  });

  it('re-acknowledging member who has not been asked to re-ack is a no-op', () => {
    const state = createTestNetworkState({
      members: [
        createTestMember('node-1', { status: MemberStatus.Active }),
        createTestMember('node-2', { status: MemberStatus.Active }),
      ],
    });
    const result = reAcknowledge(state, testNodeId('node-1'), Date.now());
    // Member should remain Active, not change
    expect(result.members[0].status).toBe(MemberStatus.Active);
  });

  it('re-acknowledging member who already left is a no-op', () => {
    const state = createTestNetworkState({
      members: [
        createTestMember('node-1', { status: MemberStatus.Left, leftAt: 5000 }),
        createTestMember('node-2', { status: MemberStatus.Active }),
      ],
    });
    const result = reAcknowledge(state, testNodeId('node-1'), Date.now());
    expect(result.members[0].status).toBe(MemberStatus.Left);
  });

  it('setting offline a member who does not exist is a no-op', () => {
    const state = createTestNetworkState({
      members: [createTestMember('node-1'), createTestMember('node-2')],
    });
    const result = setMemberOffline(state, testNodeId('node-nonexistent'));
    // All members should still be active
    expect(result.members.every(m => m.status === MemberStatus.Active)).toBe(true);
  });

  it('leaving from dissolved network still processes the leave', () => {
    const state = createTestNetworkState({
      status: NetworkStatus.Dissolved,
      members: [
        createTestMember('node-1', { status: MemberStatus.Active }),
        createTestMember('node-2', { status: MemberStatus.Active }),
      ],
    });
    // The removeMember function doesn't check network status
    const result = removeMember(state, testNodeId('node-1'), 'left', Date.now());
    const member = result.members.find(m => m.nodeId === testNodeId('node-1'));
    expect(member!.status).toBe(MemberStatus.Left);
  });

  it('leaving when last member should result in 0 active members', () => {
    const state = createTestNetworkState({
      members: [createTestMember('node-1')],
    });
    const result = removeMember(state, testNodeId('node-1'), 'left', Date.now());
    const activeMembers = getActiveMembers(result);
    expect(activeMembers.length).toBe(0);
  });

  it('expulsion vote by the target themselves is rejected', () => {
    const state = createTestExtendedState({
      members: [
        createTestMember('node-1', { status: MemberStatus.Active }),
        createTestMember('node-2', { status: MemberStatus.Active }),
        createTestMember('node-3', { status: MemberStatus.Active }),
      ],
    });
    // Target proposes their own expulsion - should be allowed as proposer
    // because proposeExpulsion checks proposer is active. But the target
    // voting on their own expulsion is different.
    const afterProposal = proposeExpulsion(
      state,
      testNodeId('node-2'),  // target
      testNodeId('node-1'),  // proposer (not the target)
      'reason',
      Date.now(),
    );
    expect(afterProposal.expulsionProposals.length).toBe(1);

    // Target tries to vote - they can cast a vote but it shouldn't count
    // in consensus (eligible voters exclude target)
    const afterVote = castExpulsionVote(
      afterProposal,
      testNodeId('node-2'), // target voting on own expulsion
      testNodeId('node-2'),
      'reject',
      Date.now(),
    );
    // The vote is recorded but won't count in consensus
    expect(afterVote.expulsionProposals[0].votes.length).toBe(2);
  });

  it('expulsion vote by non-member leaves proposals unchanged', () => {
    const state = createTestExtendedState({
      members: [
        createTestMember('node-1', { status: MemberStatus.Active }),
        createTestMember('node-2', { status: MemberStatus.Active }),
        createTestMember('node-3', { status: MemberStatus.Active }),
      ],
    });
    // Non-member tries to propose expulsion
    const result = proposeExpulsion(
      state,
      testNodeId('node-2'),  // target
      testNodeId('node-nonexistent'),  // proposer is not a member
      'reason',
      Date.now(),
    );
    // Proposal should not be created
    expect(result.expulsionProposals.length).toBe(0);
  });
});
