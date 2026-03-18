import type {
  NetworkState,
  NodeId,
  Timestamp,
  Vote,
  RunId,
  RunSummary,
} from '@pacct/protocol-ts';
import { RunInitiationMode, DisconnectBehavior } from '@pacct/protocol-ts';

// ── Extended state types ──

export interface ExpulsionProposal {
  targetNodeId: NodeId;
  proposerNodeId: NodeId;
  reason: string;
  votes: { voterNodeId: NodeId; vote: Vote; timestamp: Timestamp }[];
  createdAt: Timestamp;
}

export interface DissolveProposal {
  proposerNodeId: NodeId;
  reason: string;
  votes: { voterNodeId: NodeId; vote: Vote; timestamp: Timestamp }[];
  createdAt: Timestamp;
}

export interface ExtendedNetworkState extends NetworkState {
  expulsionProposals: ExpulsionProposal[];
  dissolveProposal?: DissolveProposal;
}

// ── Consensus schedule ──

export interface ConsensusScheduleEntry {
  memberCountMin: number;
  memberCountMax: number;
  threshold: number;
}

// ── Run policy ──

export interface RunPolicyConfig {
  initiationMode: RunInitiationMode;
  allowedInitiators: 'any_member' | 'creator_only';
  minimumIntervalMs: number;
  maxRunsPerPeriod: number;
  periodLengthDays: number;
  requireCostEstimate: boolean;
  allMembersOnlineRequired: boolean;
  midRunDisconnectBehavior: DisconnectBehavior;
}

// ── Transition error ──

export interface TransitionError {
  error: true;
  message: string;
  from: string;
  to: string;
}
