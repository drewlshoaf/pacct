import type { NodeId, Timestamp, Vote } from '@pacct/protocol-ts';
import { MemberStatus } from '@pacct/protocol-ts';
import type { ExtendedNetworkState } from './types';
import { removeMember } from './membership';

export function proposeExpulsion(
  state: ExtendedNetworkState,
  targetNodeId: NodeId,
  proposerNodeId: NodeId,
  reason: string,
  timestamp: Timestamp,
): ExtendedNetworkState {
  // Check target is an active member
  const target = state.members.find((m) => m.nodeId === targetNodeId);
  if (
    !target ||
    (target.status !== MemberStatus.Active &&
      target.status !== MemberStatus.Offline &&
      target.status !== MemberStatus.PendingReAck)
  ) {
    return state;
  }

  // Check proposer is an active member
  const proposer = state.members.find((m) => m.nodeId === proposerNodeId);
  if (!proposer || proposer.status !== MemberStatus.Active) {
    return state;
  }

  // Check no existing proposal for this target
  if (state.expulsionProposals.some((p) => p.targetNodeId === targetNodeId)) {
    return state;
  }

  const proposal = {
    targetNodeId,
    proposerNodeId,
    reason,
    votes: [{ voterNodeId: proposerNodeId, vote: 'approve' as Vote, timestamp }],
    createdAt: timestamp,
  };

  return {
    ...state,
    expulsionProposals: [...state.expulsionProposals, proposal],
  };
}

export function castExpulsionVote(
  state: ExtendedNetworkState,
  targetNodeId: NodeId,
  voterNodeId: NodeId,
  vote: Vote,
  timestamp: Timestamp,
): ExtendedNetworkState {
  return {
    ...state,
    expulsionProposals: state.expulsionProposals.map((p) => {
      if (p.targetNodeId !== targetNodeId) return p;
      // Prevent duplicate votes
      if (p.votes.some((v) => v.voterNodeId === voterNodeId)) return p;
      return {
        ...p,
        votes: [...p.votes, { voterNodeId, vote, timestamp }],
      };
    }),
  };
}

export function checkExpulsionConsensus(
  state: ExtendedNetworkState,
  targetNodeId: NodeId,
  threshold: number,
): 'approved' | 'rejected' | 'pending' {
  const proposal = state.expulsionProposals.find(
    (p) => p.targetNodeId === targetNodeId,
  );
  if (!proposal) return 'pending';

  // Eligible voters: active members excluding the target
  const eligibleMembers = state.members.filter(
    (m) =>
      m.nodeId !== targetNodeId &&
      (m.status === MemberStatus.Active || m.status === MemberStatus.Offline),
  );
  const memberCount = eligibleMembers.length;
  if (memberCount === 0) return 'pending';

  const approveCount = proposal.votes.filter((v) => v.vote === 'approve').length;
  const rejectCount = proposal.votes.filter((v) => v.vote === 'reject').length;
  const totalVotes = proposal.votes.length;

  const approvalRatio = approveCount / memberCount;
  const rejectionRatio = rejectCount / memberCount;

  if (approvalRatio >= threshold) return 'approved';
  if (rejectionRatio > 1 - threshold) return 'rejected';
  if (totalVotes >= memberCount && approvalRatio < threshold) return 'rejected';

  return 'pending';
}

export function executeExpulsion(
  state: ExtendedNetworkState,
  targetNodeId: NodeId,
  timestamp: Timestamp,
): ExtendedNetworkState {
  const updated = removeMember(state, targetNodeId, 'expelled', timestamp);

  return {
    ...updated,
    expulsionProposals: state.expulsionProposals.filter(
      (p) => p.targetNodeId !== targetNodeId,
    ),
    dissolveProposal: state.dissolveProposal,
  } as ExtendedNetworkState;
}
