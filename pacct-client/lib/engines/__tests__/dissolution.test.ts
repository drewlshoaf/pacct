import { describe, it, expect } from 'vitest';
import { NetworkStatus, MemberStatus } from '@pacct/protocol-ts';
import {
  proposeDissolve,
  castDissolveVote,
  checkDissolveConsensus,
  executeDissolve,
} from '../dissolution';
import {
  createTestExtendedState,
  createTestMember,
  testNodeId,
} from './helpers';

describe('proposeDissolve', () => {
  it('creates a dissolve proposal with proposer auto-vote', () => {
    const state = createTestExtendedState({
      status: NetworkStatus.Active,
      members: [createTestMember('node-1'), createTestMember('node-2')],
    });
    const result = proposeDissolve(
      state,
      testNodeId('node-1'),
      'no longer needed',
      5000,
    );
    expect(result.dissolveProposal).toBeDefined();
    expect(result.dissolveProposal!.proposerNodeId).toBe(testNodeId('node-1'));
    expect(result.dissolveProposal!.votes).toHaveLength(1);
    expect(result.dissolveProposal!.votes[0].vote).toBe('approve');
  });

  it('does not allow dissolve proposal when already one exists', () => {
    const state = createTestExtendedState({
      status: NetworkStatus.Active,
      members: [createTestMember('node-1')],
      dissolveProposal: {
        proposerNodeId: testNodeId('node-1'),
        reason: 'existing',
        votes: [],
        createdAt: 4000,
      },
    });
    const result = proposeDissolve(
      state,
      testNodeId('node-1'),
      'another',
      5000,
    );
    expect(result.dissolveProposal!.reason).toBe('existing');
  });

  it('does not allow dissolve when network is dissolved', () => {
    const state = createTestExtendedState({
      status: NetworkStatus.Dissolved,
      members: [createTestMember('node-1')],
    });
    const result = proposeDissolve(
      state,
      testNodeId('node-1'),
      'test',
      5000,
    );
    expect(result.dissolveProposal).toBeUndefined();
  });

  it('allows dissolve in degraded state', () => {
    const state = createTestExtendedState({
      status: NetworkStatus.Degraded,
      members: [
        createTestMember('node-1', { status: MemberStatus.PendingReAck }),
      ],
    });
    const result = proposeDissolve(
      state,
      testNodeId('node-1'),
      'degraded network',
      5000,
    );
    expect(result.dissolveProposal).toBeDefined();
  });
});

describe('castDissolveVote', () => {
  it('adds a vote', () => {
    const state = createTestExtendedState({
      dissolveProposal: {
        proposerNodeId: testNodeId('node-1'),
        reason: 'test',
        votes: [{ voterNodeId: testNodeId('node-1'), vote: 'approve', timestamp: 4000 }],
        createdAt: 4000,
      },
    });
    const result = castDissolveVote(
      state,
      testNodeId('node-2'),
      'approve',
      5000,
    );
    expect(result.dissolveProposal!.votes).toHaveLength(2);
  });

  it('prevents duplicate votes', () => {
    const state = createTestExtendedState({
      dissolveProposal: {
        proposerNodeId: testNodeId('node-1'),
        reason: 'test',
        votes: [{ voterNodeId: testNodeId('node-1'), vote: 'approve', timestamp: 4000 }],
        createdAt: 4000,
      },
    });
    const result = castDissolveVote(
      state,
      testNodeId('node-1'),
      'reject',
      5000,
    );
    expect(result.dissolveProposal!.votes).toHaveLength(1);
  });

  it('returns unchanged state when no proposal exists', () => {
    const state = createTestExtendedState({ dissolveProposal: undefined });
    const result = castDissolveVote(
      state,
      testNodeId('node-1'),
      'approve',
      5000,
    );
    expect(result.dissolveProposal).toBeUndefined();
  });
});

describe('checkDissolveConsensus', () => {
  it('returns approved when threshold met', () => {
    const state = createTestExtendedState({
      members: [createTestMember('node-1'), createTestMember('node-2')],
      dissolveProposal: {
        proposerNodeId: testNodeId('node-1'),
        reason: 'test',
        votes: [
          { voterNodeId: testNodeId('node-1'), vote: 'approve', timestamp: 4000 },
          { voterNodeId: testNodeId('node-2'), vote: 'approve', timestamp: 5000 },
        ],
        createdAt: 4000,
      },
    });
    expect(checkDissolveConsensus(state, 1.0)).toBe('approved');
  });

  it('returns rejected when all voted and threshold not met', () => {
    const state = createTestExtendedState({
      members: [createTestMember('node-1'), createTestMember('node-2')],
      dissolveProposal: {
        proposerNodeId: testNodeId('node-1'),
        reason: 'test',
        votes: [
          { voterNodeId: testNodeId('node-1'), vote: 'approve', timestamp: 4000 },
          { voterNodeId: testNodeId('node-2'), vote: 'reject', timestamp: 5000 },
        ],
        createdAt: 4000,
      },
    });
    expect(checkDissolveConsensus(state, 1.0)).toBe('rejected');
  });

  it('returns pending when not enough votes', () => {
    const state = createTestExtendedState({
      members: [
        createTestMember('node-1'),
        createTestMember('node-2'),
        createTestMember('node-3'),
      ],
      dissolveProposal: {
        proposerNodeId: testNodeId('node-1'),
        reason: 'test',
        votes: [
          { voterNodeId: testNodeId('node-1'), vote: 'approve', timestamp: 4000 },
        ],
        createdAt: 4000,
      },
    });
    expect(checkDissolveConsensus(state, 1.0)).toBe('pending');
  });

  it('returns pending when no proposal', () => {
    const state = createTestExtendedState({ dissolveProposal: undefined });
    expect(checkDissolveConsensus(state, 1.0)).toBe('pending');
  });
});

describe('executeDissolve', () => {
  it('sets network to Dissolved and clears proposals', () => {
    const state = createTestExtendedState({
      status: NetworkStatus.Active,
      dissolveProposal: {
        proposerNodeId: testNodeId('node-1'),
        reason: 'done',
        votes: [{ voterNodeId: testNodeId('node-1'), vote: 'approve', timestamp: 4000 }],
        createdAt: 4000,
      },
      expulsionProposals: [
        {
          targetNodeId: testNodeId('node-2'),
          proposerNodeId: testNodeId('node-1'),
          reason: 'stale',
          votes: [],
          createdAt: 3000,
        },
      ],
    });
    const result = executeDissolve(state, 6000);
    expect(result.status).toBe(NetworkStatus.Dissolved);
    expect(result.dissolvedAt).toBe(6000);
    expect(result.dissolveProposal).toBeUndefined();
    expect(result.expulsionProposals).toHaveLength(0);
  });
});

describe('full dissolution flow', () => {
  it('propose -> vote -> check consensus -> execute', () => {
    let state = createTestExtendedState({
      status: NetworkStatus.Active,
      members: [
        createTestMember('node-1'),
        createTestMember('node-2'),
      ],
    });

    // Propose (auto-votes approve)
    state = proposeDissolve(state, testNodeId('node-1'), 'shutting down', 1000);
    expect(checkDissolveConsensus(state, 1.0)).toBe('pending');

    // Second member votes
    state = castDissolveVote(state, testNodeId('node-2'), 'approve', 2000);
    expect(checkDissolveConsensus(state, 1.0)).toBe('approved');

    // Execute
    state = executeDissolve(state, 3000);
    expect(state.status).toBe(NetworkStatus.Dissolved);
    expect(state.dissolvedAt).toBe(3000);
  });
});
