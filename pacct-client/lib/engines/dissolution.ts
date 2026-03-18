import type { NodeId, Timestamp, Vote } from '@pacct/protocol-ts';
import { MemberStatus, NetworkStatus } from '@pacct/protocol-ts';
import type { ExtendedNetworkState } from './types';

export function proposeDissolve(
  state: ExtendedNetworkState,
  proposerNodeId: NodeId,
  reason: string,
  timestamp: Timestamp,
): ExtendedNetworkState {
  // Only active/degraded networks can be dissolved
  if (
    state.status !== NetworkStatus.Active &&
    state.status !== NetworkStatus.Degraded
  ) {
    return state;
  }

  // Proposer must be an active member
  const proposer = state.members.find((m) => m.nodeId === proposerNodeId);
  if (!proposer || (proposer.status !== MemberStatus.Active && proposer.status !== MemberStatus.PendingReAck)) {
    return state;
  }

  // Only one dissolve proposal at a time
  if (state.dissolveProposal) {
    return state;
  }

  return {
    ...state,
    dissolveProposal: {
      proposerNodeId,
      reason,
      votes: [{ voterNodeId: proposerNodeId, vote: 'approve' as Vote, timestamp }],
      createdAt: timestamp,
    },
  };
}

export function castDissolveVote(
  state: ExtendedNetworkState,
  voterNodeId: NodeId,
  vote: Vote,
  timestamp: Timestamp,
): ExtendedNetworkState {
  if (!state.dissolveProposal) return state;

  // Prevent duplicate votes
  if (state.dissolveProposal.votes.some((v) => v.voterNodeId === voterNodeId)) {
    return state;
  }

  return {
    ...state,
    dissolveProposal: {
      ...state.dissolveProposal,
      votes: [
        ...state.dissolveProposal.votes,
        { voterNodeId, vote, timestamp },
      ],
    },
  };
}

export function checkDissolveConsensus(
  state: ExtendedNetworkState,
  threshold: number,
): 'approved' | 'rejected' | 'pending' {
  if (!state.dissolveProposal) return 'pending';

  const eligibleMembers = state.members.filter(
    (m) =>
      m.status === MemberStatus.Active ||
      m.status === MemberStatus.Offline ||
      m.status === MemberStatus.PendingReAck,
  );
  const memberCount = eligibleMembers.length;
  if (memberCount === 0) return 'pending';

  const approveCount = state.dissolveProposal.votes.filter(
    (v) => v.vote === 'approve',
  ).length;
  const rejectCount = state.dissolveProposal.votes.filter(
    (v) => v.vote === 'reject',
  ).length;
  const totalVotes = state.dissolveProposal.votes.length;

  const approvalRatio = approveCount / memberCount;
  const rejectionRatio = rejectCount / memberCount;

  if (approvalRatio >= threshold) return 'approved';
  if (rejectionRatio > 1 - threshold) return 'rejected';
  if (totalVotes >= memberCount && approvalRatio < threshold) return 'rejected';

  return 'pending';
}

export function executeDissolve(
  state: ExtendedNetworkState,
  timestamp: Timestamp,
): ExtendedNetworkState {
  return {
    ...state,
    status: NetworkStatus.Dissolved,
    dissolvedAt: timestamp,
    dissolveProposal: undefined,
    expulsionProposals: [],
  };
}
