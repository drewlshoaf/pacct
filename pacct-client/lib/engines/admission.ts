import type {
  NetworkState,
  NodeId,
  Timestamp,
  Vote,
  ApplicantInfo,
} from '@pacct/protocol-ts';
import { ApplicantStatus, MemberStatus } from '@pacct/protocol-ts';
import type { ConsensusScheduleEntry } from './types';
import { addMember } from './membership';

export function submitApplication(
  state: NetworkState,
  nodeId: NodeId,
  timestamp: Timestamp,
): NetworkState {
  const applicant: ApplicantInfo = {
    nodeId,
    status: ApplicantStatus.PendingApproval,
    appliedAt: timestamp,
    votes: [],
  };
  return {
    ...state,
    applicants: [...state.applicants, applicant],
  };
}

export function castApprovalVote(
  state: NetworkState,
  applicantNodeId: NodeId,
  voterNodeId: NodeId,
  vote: Vote,
  timestamp: Timestamp,
  signature: string,
): NetworkState {
  return {
    ...state,
    applicants: state.applicants.map((a) => {
      if (a.nodeId !== applicantNodeId) return a;
      // Prevent duplicate votes
      if (a.votes.some((v) => v.voterNodeId === voterNodeId)) return a;
      return {
        ...a,
        votes: [
          ...a.votes,
          { voterNodeId, vote, timestamp, signature },
        ],
      };
    }),
  };
}

export function checkApprovalConsensus(
  state: NetworkState,
  applicantNodeId: NodeId,
  schedule: ConsensusScheduleEntry[],
): 'approved' | 'rejected' | 'pending' {
  const applicant = state.applicants.find(
    (a) => a.nodeId === applicantNodeId,
  );
  if (!applicant) return 'pending';

  const activeMembers = state.members.filter(
    (m) =>
      m.status === MemberStatus.Active ||
      m.status === MemberStatus.Offline,
  );
  const memberCount = activeMembers.length;

  // Find matching schedule entry
  const entry = schedule.find(
    (e) => memberCount >= e.memberCountMin && memberCount <= e.memberCountMax,
  );
  if (!entry) return 'pending';

  const approveCount = applicant.votes.filter(
    (v) => v.vote === 'approve',
  ).length;
  const rejectCount = applicant.votes.filter(
    (v) => v.vote === 'reject',
  ).length;
  const totalVotes = applicant.votes.length;

  // Check if enough votes to determine outcome
  const approvalRatio = memberCount > 0 ? approveCount / memberCount : 0;
  const rejectionRatio = memberCount > 0 ? rejectCount / memberCount : 0;

  if (approvalRatio >= entry.threshold) return 'approved';
  // If enough rejections that approval is impossible
  if (rejectionRatio > 1 - entry.threshold) return 'rejected';
  // If all votes are in and threshold not met
  if (totalVotes >= memberCount && approvalRatio < entry.threshold)
    return 'rejected';

  return 'pending';
}

export function approveApplicant(
  state: NetworkState,
  applicantNodeId: NodeId,
  timestamp: Timestamp,
): NetworkState {
  return {
    ...state,
    applicants: state.applicants.map((a) =>
      a.nodeId === applicantNodeId
        ? {
            ...a,
            status: ApplicantStatus.ApprovedPendingAcceptance,
            approvedAt: timestamp,
          }
        : a,
    ),
  };
}

export function acceptContract(
  state: NetworkState,
  applicantNodeId: NodeId,
  timestamp: Timestamp,
): NetworkState {
  const updated = {
    ...state,
    applicants: state.applicants.map((a) =>
      a.nodeId === applicantNodeId
        ? { ...a, status: ApplicantStatus.Active, acceptedAt: timestamp }
        : a,
    ),
  };
  return addMember(updated, applicantNodeId, timestamp);
}

export function withdrawApplication(
  state: NetworkState,
  applicantNodeId: NodeId,
  timestamp: Timestamp,
): NetworkState {
  return {
    ...state,
    applicants: state.applicants.map((a) =>
      a.nodeId === applicantNodeId
        ? {
            ...a,
            status: ApplicantStatus.Withdrawn,
            withdrawnAt: timestamp,
          }
        : a,
    ),
  };
}

export function checkApprovalTimeout(
  state: NetworkState,
  applicantNodeId: NodeId,
  now: Timestamp,
  timeoutMs: number,
): boolean {
  const applicant = state.applicants.find(
    (a) => a.nodeId === applicantNodeId,
  );
  if (!applicant) return false;
  if (applicant.status !== ApplicantStatus.PendingApproval) return false;
  return now - applicant.appliedAt >= timeoutMs;
}

export function checkAcceptanceTimeout(
  state: NetworkState,
  applicantNodeId: NodeId,
  now: Timestamp,
  timeoutMs: number,
): boolean {
  const applicant = state.applicants.find(
    (a) => a.nodeId === applicantNodeId,
  );
  if (!applicant) return false;
  if (applicant.status !== ApplicantStatus.ApprovedPendingAcceptance)
    return false;
  if (!applicant.approvedAt) return false;
  return now - applicant.approvedAt >= timeoutMs;
}

export function expireApplication(
  state: NetworkState,
  applicantNodeId: NodeId,
  reason: 'approval_timeout' | 'acceptance_timeout',
  timestamp: Timestamp,
): NetworkState {
  const expiredStatus =
    reason === 'approval_timeout'
      ? ApplicantStatus.ExpiredPendingApproval
      : ApplicantStatus.ExpiredPendingAcceptance;

  return {
    ...state,
    applicants: state.applicants.map((a) =>
      a.nodeId === applicantNodeId
        ? { ...a, status: expiredStatus, expiredAt: timestamp }
        : a,
    ),
  };
}

export function rejectApplicant(
  state: NetworkState,
  applicantNodeId: NodeId,
  timestamp: Timestamp,
): NetworkState {
  return {
    ...state,
    applicants: state.applicants.map((a) =>
      a.nodeId === applicantNodeId
        ? {
            ...a,
            status: ApplicantStatus.Rejected,
            rejectedAt: timestamp,
          }
        : a,
    ),
  };
}
