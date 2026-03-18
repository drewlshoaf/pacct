import { describe, it, expect } from 'vitest';
import { MemberStatus } from '@pacct/protocol-ts';
import {
  proposeExpulsion,
  castExpulsionVote,
  checkExpulsionConsensus,
  executeExpulsion,
} from '../expulsion';
import {
  createTestExtendedState,
  createTestMember,
  testNodeId,
} from './helpers';

describe('proposeExpulsion', () => {
  it('creates an expulsion proposal with proposer auto-vote', () => {
    const state = createTestExtendedState({
      members: [
        createTestMember('node-1'),
        createTestMember('node-2'),
        createTestMember('node-3'),
      ],
    });
    const result = proposeExpulsion(
      state,
      testNodeId('node-2'),
      testNodeId('node-1'),
      'bad behavior',
      5000,
    );
    expect(result.expulsionProposals).toHaveLength(1);
    expect(result.expulsionProposals[0].targetNodeId).toBe(testNodeId('node-2'));
    expect(result.expulsionProposals[0].votes).toHaveLength(1);
    expect(result.expulsionProposals[0].votes[0].voterNodeId).toBe(
      testNodeId('node-1'),
    );
  });

  it('does not create duplicate proposal for same target', () => {
    const state = createTestExtendedState({
      members: [
        createTestMember('node-1'),
        createTestMember('node-2'),
      ],
      expulsionProposals: [
        {
          targetNodeId: testNodeId('node-2'),
          proposerNodeId: testNodeId('node-1'),
          reason: 'existing',
          votes: [],
          createdAt: 4000,
        },
      ],
    });
    const result = proposeExpulsion(
      state,
      testNodeId('node-2'),
      testNodeId('node-1'),
      'duplicate',
      5000,
    );
    expect(result.expulsionProposals).toHaveLength(1);
  });

  it('does not allow proposal against non-active member', () => {
    const state = createTestExtendedState({
      members: [
        createTestMember('node-1'),
        createTestMember('node-2', { status: MemberStatus.Left }),
      ],
    });
    const result = proposeExpulsion(
      state,
      testNodeId('node-2'),
      testNodeId('node-1'),
      'already left',
      5000,
    );
    expect(result.expulsionProposals).toHaveLength(0);
  });
});

describe('castExpulsionVote', () => {
  it('adds a vote to the proposal', () => {
    const state = createTestExtendedState({
      members: [
        createTestMember('node-1'),
        createTestMember('node-2'),
        createTestMember('node-3'),
      ],
      expulsionProposals: [
        {
          targetNodeId: testNodeId('node-3'),
          proposerNodeId: testNodeId('node-1'),
          reason: 'test',
          votes: [{ voterNodeId: testNodeId('node-1'), vote: 'approve', timestamp: 4000 }],
          createdAt: 4000,
        },
      ],
    });
    const result = castExpulsionVote(
      state,
      testNodeId('node-3'),
      testNodeId('node-2'),
      'approve',
      5000,
    );
    expect(result.expulsionProposals[0].votes).toHaveLength(2);
  });

  it('prevents duplicate votes', () => {
    const state = createTestExtendedState({
      expulsionProposals: [
        {
          targetNodeId: testNodeId('node-3'),
          proposerNodeId: testNodeId('node-1'),
          reason: 'test',
          votes: [{ voterNodeId: testNodeId('node-1'), vote: 'approve', timestamp: 4000 }],
          createdAt: 4000,
        },
      ],
    });
    const result = castExpulsionVote(
      state,
      testNodeId('node-3'),
      testNodeId('node-1'),
      'reject',
      5000,
    );
    expect(result.expulsionProposals[0].votes).toHaveLength(1);
  });
});

describe('checkExpulsionConsensus', () => {
  it('returns approved when threshold met', () => {
    const state = createTestExtendedState({
      members: [
        createTestMember('node-1'),
        createTestMember('node-2'),
        createTestMember('node-3'),
      ],
      expulsionProposals: [
        {
          targetNodeId: testNodeId('node-3'),
          proposerNodeId: testNodeId('node-1'),
          reason: 'test',
          votes: [
            { voterNodeId: testNodeId('node-1'), vote: 'approve', timestamp: 4000 },
            { voterNodeId: testNodeId('node-2'), vote: 'approve', timestamp: 5000 },
          ],
          createdAt: 4000,
        },
      ],
    });
    // 2 eligible voters (node-1, node-2), both approved => 100% >= 0.67
    expect(checkExpulsionConsensus(state, testNodeId('node-3'), 0.67)).toBe(
      'approved',
    );
  });

  it('returns rejected when enough rejections', () => {
    const state = createTestExtendedState({
      members: [
        createTestMember('node-1'),
        createTestMember('node-2'),
        createTestMember('node-3'),
      ],
      expulsionProposals: [
        {
          targetNodeId: testNodeId('node-3'),
          proposerNodeId: testNodeId('node-1'),
          reason: 'test',
          votes: [
            { voterNodeId: testNodeId('node-1'), vote: 'reject', timestamp: 4000 },
            { voterNodeId: testNodeId('node-2'), vote: 'reject', timestamp: 5000 },
          ],
          createdAt: 4000,
        },
      ],
    });
    expect(checkExpulsionConsensus(state, testNodeId('node-3'), 0.67)).toBe(
      'rejected',
    );
  });

  it('returns pending when no proposal exists', () => {
    const state = createTestExtendedState();
    expect(checkExpulsionConsensus(state, testNodeId('node-3'), 0.67)).toBe(
      'pending',
    );
  });
});

describe('executeExpulsion', () => {
  it('removes the member and clears the proposal', () => {
    const state = createTestExtendedState({
      members: [
        createTestMember('node-1'),
        createTestMember('node-2'),
        createTestMember('node-3'),
      ],
      expulsionProposals: [
        {
          targetNodeId: testNodeId('node-3'),
          proposerNodeId: testNodeId('node-1'),
          reason: 'test',
          votes: [
            { voterNodeId: testNodeId('node-1'), vote: 'approve', timestamp: 4000 },
            { voterNodeId: testNodeId('node-2'), vote: 'approve', timestamp: 5000 },
          ],
          createdAt: 4000,
        },
      ],
    });
    const result = executeExpulsion(state, testNodeId('node-3'), 6000);
    expect(
      result.members.find((m) => m.nodeId === testNodeId('node-3'))?.status,
    ).toBe(MemberStatus.Expelled);
    expect(result.expulsionProposals).toHaveLength(0);
  });
});

describe('full expulsion flow', () => {
  it('propose -> vote -> check consensus -> execute', () => {
    let state = createTestExtendedState({
      members: [
        createTestMember('node-1'),
        createTestMember('node-2'),
        createTestMember('node-3'),
      ],
    });

    // Propose
    state = proposeExpulsion(
      state,
      testNodeId('node-3'),
      testNodeId('node-1'),
      'bad behavior',
      1000,
    );
    expect(state.expulsionProposals).toHaveLength(1);
    expect(checkExpulsionConsensus(state, testNodeId('node-3'), 1.0)).toBe(
      'pending',
    );

    // Second vote
    state = castExpulsionVote(
      state,
      testNodeId('node-3'),
      testNodeId('node-2'),
      'approve',
      2000,
    );
    expect(checkExpulsionConsensus(state, testNodeId('node-3'), 1.0)).toBe(
      'approved',
    );

    // Execute
    state = executeExpulsion(state, testNodeId('node-3'), 3000);
    expect(
      state.members.find((m) => m.nodeId === testNodeId('node-3'))?.status,
    ).toBe(MemberStatus.Expelled);
    expect(state.expulsionProposals).toHaveLength(0);
  });
});
