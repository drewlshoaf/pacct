// Version constants
export { PROTOCOL_VERSION, SPEC_VERSION, MANIFEST_VERSION } from './version';

// Common types
export type { NodeId, NetworkId, RunId, SpecId, Hash, Timestamp, Vote } from './types';

// Enums
export {
  NetworkStatus,
  MemberStatus,
  ApplicantStatus,
  RunStatus,
  SpecLifecycle,
  ComputationType,
  EconomicMode,
  RunInitiationMode,
  VisibilityMode,
  SectionVisibility,
  DisconnectBehavior,
} from './enums';

// Protocol messages
export {
  ProtocolMessageType,
  type JoinRequestMessage,
  type JoinApprovalMessage,
  type ContractRevealMessage,
  type AcceptanceMessage,
  type LeaveMessage,
  type ReAckMessage,
  type RunInitiateMessage,
  type RunAbortMessage,
  type ExpulsionProposalMessage,
  type ExpulsionVoteMessage,
  type HeartbeatMessage,
  type PresenceUpdateMessage,
  type DissolveProposalMessage,
  type DissolveVoteMessage,
  type SignalingMessage,
  type SignalingType,
  type ProtocolMessage,
} from './messages';

// Manifests
export type { SpecManifest, NetworkManifest, SpecType } from './manifests';

// State
export type {
  ApprovalVote,
  MemberInfo,
  ApplicantInfo,
  RunSummary,
  NetworkState,
} from './state';

// Identity
export type { NodeIdentity, NodeKeypair, Signature } from './identity';

// Events
export {
  PacctEventType,
  type NetworkCreatedEvent,
  type NetworkActivatedEvent,
  type NetworkDegradedEvent,
  type NetworkDissolvedEvent,
  type MemberJoinedEvent,
  type MemberLeftEvent,
  type MemberExpelledEvent,
  type MemberReAcknowledgedEvent,
  type ApplicantSubmittedEvent,
  type ApplicantApprovedEvent,
  type ApplicantRejectedEvent,
  type ApplicantAcceptedEvent,
  type ApplicantWithdrawnEvent,
  type ApplicantExpiredEvent,
  type RunStartedEvent,
  type RunCompletedEvent,
  type RunAbortedEvent,
  type PacctEvent,
} from './events';

// Presence
export {
  NodeAvailability,
  type PresenceLease,
  type NodePresenceState,
  type HeartbeatPayload,
  type HeartbeatAck,
} from './presence';

// Health
export {
  DiscoveryHealthStatus,
  type DiscoveryInstanceHealth,
  type DiscoveryServiceHealth,
} from './health';

// Presence events
export {
  PresenceEventType,
  type PresenceChangeEvent,
} from './events/presence-events';
