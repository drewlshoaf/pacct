/**
 * Expulsion + Dissolution Integration Test
 *
 * Tests expulsion voting and threshold logic, network degradation after
 * expulsion, re-acknowledgment, dissolution voting, and post-dissolution
 * operation rejection.
 */

import { describe, it, expect } from 'vitest';
import { NetworkStatus, MemberStatus } from '@pacct/protocol-ts';

import {
  proposeExpulsion,
  castExpulsionVote,
  checkExpulsionConsensus,
  executeExpulsion,
} from '../../engines/expulsion';
import {
  proposeDissolve,
  castDissolveVote,
  checkDissolveConsensus,
  executeDissolve,
} from '../../engines/dissolution';
import { transition } from '../../engines/network-lifecycle';
import {
  reAcknowledge,
  allMembersReAcknowledged,
  getActiveMembers,
} from '../../engines/membership';
import { canInitiateRun } from '../../engines/run';
import type { ExtendedNetworkState, RunPolicyConfig } from '../../engines/types';
import { createTestNetwork, makeNodeId, advanceTime } from './test-helpers';

describe('Governance E2E', () => {
  describe('Expulsion', () => {
    it('rejects expulsion when threshold not met (4 members, threshold=0.75)', async () => {
      // ── Step 1: Create active network (A, B, C, D) ──
      const { state: initialState, members, specs } = await createTestNetwork(4);
      let state = initialState;
      const [nodeA, nodeB, nodeC, nodeD] = members.map((m) => m.nodeId);

      expect(state.status).toBe(NetworkStatus.Active);
      expect(state.members.filter((m) => m.status === MemberStatus.Active)).toHaveLength(4);

      const expulsionThreshold = specs.governance.consensusPolicy.expulsionThreshold!;
      expect(expulsionThreshold).toBe(0.75);
      const now = Date.now();

      // ── Step 2: A proposes expelling D ──
      state = proposeExpulsion(state, nodeD, nodeA, 'Policy violation', now);
      expect(state.expulsionProposals).toHaveLength(1);
      // proposeExpulsion auto-casts the proposer's approve vote
      expect(state.expulsionProposals[0].votes).toHaveLength(1);

      // ── Step 3: A (already voted), B votes approve, C votes reject ──
      state = castExpulsionVote(state, nodeD, nodeB, 'approve', now + 100);
      state = castExpulsionVote(state, nodeD, nodeC, 'reject', now + 200);

      // ── Step 4-5: Eligible voters = A, B, C = 3 (D cannot vote on own expulsion)
      // 2/3 approve = 0.67 < 0.75 threshold -> rejected
      const consensus1 = checkExpulsionConsensus(state, nodeD, expulsionThreshold);
      // All 3 eligible voters have voted. 2/3 = 0.67 < 0.75 -> rejected
      expect(consensus1).toBe('rejected');
    });

    it('approves expulsion when threshold is met (5 members, threshold=0.75)', async () => {
      // ── Step 6: New scenario: 5 members (A-E), expel E ──
      const { state: initialState, members, specs } = await createTestNetwork(5);
      let state = initialState;
      const [nodeA, nodeB, nodeC, nodeD, nodeE] = members.map((m) => m.nodeId);
      const expulsionThreshold = specs.governance.consensusPolicy.expulsionThreshold!;
      const now = Date.now();

      state = proposeExpulsion(state, nodeE, nodeA, 'Data quality issues', now);

      // ── Step 7: A (auto), B, C vote approve → 3/4 = 0.75 >= 0.75 ──
      state = castExpulsionVote(state, nodeE, nodeB, 'approve', now + 100);
      state = castExpulsionVote(state, nodeE, nodeC, 'approve', now + 200);

      const consensus = checkExpulsionConsensus(state, nodeE, expulsionThreshold);
      expect(consensus).toBe('approved');

      // ── Step 8: Execute expulsion -> network degrades ──
      state = executeExpulsion(state, nodeE, now + 300);
      const expelledMember = state.members.find((m) => m.nodeId === nodeE);
      expect(expelledMember!.status).toBe(MemberStatus.Expelled);

      // Transition to degraded
      const degradedResult = transition(state, NetworkStatus.Degraded, 'Member expelled');
      expect('error' in degradedResult).toBe(false);
      state = {
        ...(degradedResult as typeof state),
        expulsionProposals: state.expulsionProposals,
        dissolveProposal: state.dissolveProposal,
      };
      expect(state.status).toBe(NetworkStatus.Degraded);

      // ── Step 9: A, B, C, D re-acknowledge -> network re-activates ──
      state = reAcknowledge(state, nodeA, now + 400);
      state = reAcknowledge(state, nodeB, now + 401);
      state = reAcknowledge(state, nodeC, now + 402);
      state = reAcknowledge(state, nodeD, now + 403);
      expect(allMembersReAcknowledged(state)).toBe(true);

      const reactivateResult = transition(state, NetworkStatus.Active, 'All members re-acknowledged');
      expect('error' in reactivateResult).toBe(false);
      state = {
        ...(reactivateResult as typeof state),
        expulsionProposals: state.expulsionProposals,
        dissolveProposal: state.dissolveProposal,
      };
      expect(state.status).toBe(NetworkStatus.Active);
      expect(getActiveMembers(state)).toHaveLength(4); // E is expelled
    });

    it('excludes target from eligible voters in expulsion consensus', async () => {
      const { state: initialState, members } = await createTestNetwork(4);
      let state = initialState;
      const [nodeA, nodeB, nodeC, nodeD] = members.map((m) => m.nodeId);
      const now = Date.now();

      // Propose expelling D. A auto-votes approve.
      state = proposeExpulsion(state, nodeD, nodeA, 'Reason', now);

      // Eligible voters = A, B, C (3 voters, D excluded)
      // Only A has voted so far (1/3 = 0.33 < 0.75)
      const consensus1 = checkExpulsionConsensus(state, nodeD, 0.75);
      expect(consensus1).toBe('pending');

      // B votes approve (2/3 = 0.67 < 0.75) - still pending
      state = castExpulsionVote(state, nodeD, nodeB, 'approve', now + 100);
      const consensus2 = checkExpulsionConsensus(state, nodeD, 0.75);
      expect(consensus2).toBe('pending');

      // C votes approve (3/3 = 1.0 >= 0.75) - approved
      state = castExpulsionVote(state, nodeD, nodeC, 'approve', now + 200);
      const consensus3 = checkExpulsionConsensus(state, nodeD, 0.75);
      expect(consensus3).toBe('approved');
    });
  });

  describe('Dissolution', () => {
    it('dissolves network when all members vote approve', async () => {
      // ── Step 10: Dissolution flow ──
      const { state: initialState, members, specs } = await createTestNetwork(3);
      let state = initialState;
      const [nodeA, nodeB, nodeC] = members.map((m) => m.nodeId);
      const dissolutionThreshold = specs.governance.consensusPolicy.dissolutionThreshold;
      expect(dissolutionThreshold).toBe(1.0); // unanimous
      const now = Date.now();

      // A proposes dissolution (auto-casts approve)
      state = proposeDissolve(state, nodeA, 'Project concluded', now);
      expect(state.dissolveProposal).toBeDefined();
      expect(state.dissolveProposal!.votes).toHaveLength(1);

      // B and C vote approve
      state = castDissolveVote(state, nodeB, 'approve', now + 100);
      state = castDissolveVote(state, nodeC, 'approve', now + 200);

      const consensus = checkDissolveConsensus(state, dissolutionThreshold);
      expect(consensus).toBe('approved');

      // Execute dissolution
      state = executeDissolve(state, now + 300);
      expect(state.status).toBe(NetworkStatus.Dissolved);
      expect(state.dissolvedAt).toBeDefined();
      expect(state.dissolveProposal).toBeUndefined();

      // ── Step 11: Verify dissolved network rejects all operations ──
      const runPolicy: RunPolicyConfig = {
        ...specs.governance.runPolicy,
      };

      const canRun = canInitiateRun(state, nodeA, runPolicy, now + 1000);
      expect(canRun.allowed).toBe(false);
      expect(canRun.reason).toContain('not active');

      // Cannot propose dissolution again on dissolved network
      const dissolveAgain = proposeDissolve(state, nodeA, 'Again', now + 2000);
      expect(dissolveAgain.dissolveProposal).toBeUndefined(); // no new proposal, network is dissolved
    });

    it('rejects dissolution when threshold not met', async () => {
      const { state: initialState, members } = await createTestNetwork(3);
      let state = initialState;
      const [nodeA, nodeB, nodeC] = members.map((m) => m.nodeId);
      const now = Date.now();

      // Unanimous threshold
      state = proposeDissolve(state, nodeA, 'Let us dissolve', now);
      state = castDissolveVote(state, nodeB, 'approve', now + 100);
      state = castDissolveVote(state, nodeC, 'reject', now + 200);

      // 2/3 approve = 0.67 < 1.0 -> rejected
      const consensus = checkDissolveConsensus(state, 1.0);
      expect(consensus).toBe('rejected');
    });

    it('prevents duplicate dissolution votes', async () => {
      const { state: initialState, members } = await createTestNetwork(3);
      let state = initialState;
      const [nodeA, nodeB] = members.map((m) => m.nodeId);
      const now = Date.now();

      state = proposeDissolve(state, nodeA, 'Test', now);
      // A tries to vote again
      state = castDissolveVote(state, nodeA, 'approve', now + 100);
      expect(state.dissolveProposal!.votes).toHaveLength(1); // duplicate prevented

      state = castDissolveVote(state, nodeB, 'approve', now + 200);
      expect(state.dissolveProposal!.votes).toHaveLength(2); // new vote accepted
    });

    it('prevents multiple simultaneous dissolution proposals', async () => {
      const { state: initialState, members } = await createTestNetwork(3);
      let state = initialState;
      const [nodeA, nodeB] = members.map((m) => m.nodeId);
      const now = Date.now();

      state = proposeDissolve(state, nodeA, 'First proposal', now);
      expect(state.dissolveProposal).toBeDefined();

      // B tries to make another proposal
      const stateAfterSecond = proposeDissolve(state, nodeB, 'Second proposal', now + 100);
      // Should still be the first proposal
      expect(stateAfterSecond.dissolveProposal!.proposerNodeId).toBe(nodeA);
    });
  });
});
