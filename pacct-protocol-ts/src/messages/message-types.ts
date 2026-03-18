import type { NodeId, NetworkId, RunId, Timestamp, Vote } from '../types';

export enum ProtocolMessageType {
  JoinRequest = 'join_request',
  JoinApproval = 'join_approval',
  ContractReveal = 'contract_reveal',
  Acceptance = 'acceptance',
  Leave = 'leave',
  ReAck = 'reack',
  RunInitiate = 'run_initiate',
  RunAbort = 'run_abort',
  ExpulsionProposal = 'expulsion_proposal',
  ExpulsionVote = 'expulsion_vote',
  Heartbeat = 'heartbeat',
  PresenceUpdate = 'presence_update',
  DissolveProposal = 'dissolve_proposal',
  DissolveVote = 'dissolve_vote',
  Signaling = 'signaling',
}

export interface JoinRequestMessage {
  type: ProtocolMessageType.JoinRequest;
  networkId: NetworkId;
  nodeId: NodeId;
  timestamp: Timestamp;
  signature: string;
}

export interface JoinApprovalMessage {
  type: ProtocolMessageType.JoinApproval;
  networkId: NetworkId;
  applicantNodeId: NodeId;
  voterNodeId: NodeId;
  vote: Vote;
  timestamp: Timestamp;
  signature: string;
}

export interface ContractRevealMessage {
  type: ProtocolMessageType.ContractReveal;
  networkId: NetworkId;
  specsBundle: unknown;
  manifest: unknown;
}

export interface AcceptanceMessage {
  type: ProtocolMessageType.Acceptance;
  networkId: NetworkId;
  nodeId: NodeId;
  specManifestHashes: string[];
  timestamp: Timestamp;
  signature: string;
}

export interface LeaveMessage {
  type: ProtocolMessageType.Leave;
  networkId: NetworkId;
  nodeId: NodeId;
  timestamp: Timestamp;
  signature: string;
}

export interface ReAckMessage {
  type: ProtocolMessageType.ReAck;
  networkId: NetworkId;
  nodeId: NodeId;
  timestamp: Timestamp;
  signature: string;
}

export interface RunInitiateMessage {
  type: ProtocolMessageType.RunInitiate;
  networkId: NetworkId;
  runId: RunId;
  initiatorNodeId: NodeId;
  timestamp: Timestamp;
  signature: string;
}

export interface RunAbortMessage {
  type: ProtocolMessageType.RunAbort;
  networkId: NetworkId;
  runId: RunId;
  reason: string;
  timestamp: Timestamp;
  signature: string;
}

export interface ExpulsionProposalMessage {
  type: ProtocolMessageType.ExpulsionProposal;
  networkId: NetworkId;
  targetNodeId: NodeId;
  proposerNodeId: NodeId;
  reason: string;
  timestamp: Timestamp;
  signature: string;
}

export interface ExpulsionVoteMessage {
  type: ProtocolMessageType.ExpulsionVote;
  networkId: NetworkId;
  targetNodeId: NodeId;
  voterNodeId: NodeId;
  vote: Vote;
  timestamp: Timestamp;
  signature: string;
}

export interface HeartbeatMessage {
  type: ProtocolMessageType.Heartbeat;
  nodeId: NodeId;
  networkId: NetworkId;
  timestamp: Timestamp;
}

export interface PresenceUpdateMessage {
  type: ProtocolMessageType.PresenceUpdate;
  networkId: NetworkId;
  nodeId: NodeId;
  online: boolean;
  lastSeen: Timestamp;
}

export interface DissolveProposalMessage {
  type: ProtocolMessageType.DissolveProposal;
  networkId: NetworkId;
  proposerNodeId: NodeId;
  reason: string;
  timestamp: Timestamp;
  signature: string;
}

export interface DissolveVoteMessage {
  type: ProtocolMessageType.DissolveVote;
  networkId: NetworkId;
  voterNodeId: NodeId;
  vote: Vote;
  timestamp: Timestamp;
  signature: string;
}

export type SignalingType = 'offer' | 'answer' | 'candidate';

export interface SignalingMessage {
  type: ProtocolMessageType.Signaling;
  fromNodeId: NodeId;
  toNodeId: NodeId;
  networkId: NetworkId;
  signalingType: SignalingType;
  payload: unknown;
}

export type ProtocolMessage =
  | JoinRequestMessage
  | JoinApprovalMessage
  | ContractRevealMessage
  | AcceptanceMessage
  | LeaveMessage
  | ReAckMessage
  | RunInitiateMessage
  | RunAbortMessage
  | ExpulsionProposalMessage
  | ExpulsionVoteMessage
  | HeartbeatMessage
  | PresenceUpdateMessage
  | DissolveProposalMessage
  | DissolveVoteMessage
  | SignalingMessage;
