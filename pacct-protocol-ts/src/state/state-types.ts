import type { NodeId, NetworkId, RunId, Timestamp, Vote } from '../types';
import type { NetworkStatus } from '../enums/network-status';
import type { MemberStatus } from '../enums/member-status';
import type { ApplicantStatus } from '../enums/applicant-status';
import type { RunStatus } from '../enums/run-status';
import type { NetworkManifest } from '../manifests/manifest-types';

export interface ApprovalVote {
  voterNodeId: NodeId;
  vote: Vote;
  timestamp: Timestamp;
  signature: string;
}

export interface MemberInfo {
  nodeId: NodeId;
  status: MemberStatus;
  joinedAt: Timestamp;
  leftAt?: Timestamp;
  acknowledgedAt?: Timestamp;
}

export interface ApplicantInfo {
  nodeId: NodeId;
  status: ApplicantStatus;
  appliedAt: Timestamp;
  approvedAt?: Timestamp;
  acceptedAt?: Timestamp;
  rejectedAt?: Timestamp;
  withdrawnAt?: Timestamp;
  expiredAt?: Timestamp;
  votes: ApprovalVote[];
}

export interface RunSummary {
  runId: RunId;
  networkId: NetworkId;
  status: RunStatus;
  initiatorNodeId: NodeId;
  startedAt: Timestamp;
  completedAt?: Timestamp;
  abortedAt?: Timestamp;
  participantNodeIds: NodeId[];
}

export interface NetworkState {
  networkId: NetworkId;
  alias: string;
  status: NetworkStatus;
  creatorNodeId: NodeId;
  members: MemberInfo[];
  applicants: ApplicantInfo[];
  manifest: NetworkManifest;
  createdAt: Timestamp;
  activatedAt?: Timestamp;
  dissolvedAt?: Timestamp;
  runHistory: RunSummary[];
}
