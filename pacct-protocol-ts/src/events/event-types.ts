import type { NodeId, NetworkId, RunId, Timestamp } from '../types';

export enum PacctEventType {
  NetworkCreated = 'network_created',
  NetworkActivated = 'network_activated',
  NetworkDegraded = 'network_degraded',
  NetworkDissolved = 'network_dissolved',
  MemberJoined = 'member_joined',
  MemberLeft = 'member_left',
  MemberExpelled = 'member_expelled',
  MemberReAcknowledged = 'member_reacknowledged',
  ApplicantSubmitted = 'applicant_submitted',
  ApplicantApproved = 'applicant_approved',
  ApplicantRejected = 'applicant_rejected',
  ApplicantAccepted = 'applicant_accepted',
  ApplicantWithdrawn = 'applicant_withdrawn',
  ApplicantExpired = 'applicant_expired',
  RunStarted = 'run_started',
  RunCompleted = 'run_completed',
  RunAborted = 'run_aborted',
}

interface BaseEvent {
  eventId: string;
  networkId: NetworkId;
  timestamp: Timestamp;
}

export interface NetworkCreatedEvent extends BaseEvent {
  eventType: PacctEventType.NetworkCreated;
  creatorNodeId: NodeId;
}

export interface NetworkActivatedEvent extends BaseEvent {
  eventType: PacctEventType.NetworkActivated;
}

export interface NetworkDegradedEvent extends BaseEvent {
  eventType: PacctEventType.NetworkDegraded;
  reason: string;
}

export interface NetworkDissolvedEvent extends BaseEvent {
  eventType: PacctEventType.NetworkDissolved;
  reason: string;
}

export interface MemberJoinedEvent extends BaseEvent {
  eventType: PacctEventType.MemberJoined;
  nodeId: NodeId;
}

export interface MemberLeftEvent extends BaseEvent {
  eventType: PacctEventType.MemberLeft;
  nodeId: NodeId;
}

export interface MemberExpelledEvent extends BaseEvent {
  eventType: PacctEventType.MemberExpelled;
  nodeId: NodeId;
  reason: string;
}

export interface MemberReAcknowledgedEvent extends BaseEvent {
  eventType: PacctEventType.MemberReAcknowledged;
  nodeId: NodeId;
}

export interface ApplicantSubmittedEvent extends BaseEvent {
  eventType: PacctEventType.ApplicantSubmitted;
  nodeId: NodeId;
}

export interface ApplicantApprovedEvent extends BaseEvent {
  eventType: PacctEventType.ApplicantApproved;
  nodeId: NodeId;
}

export interface ApplicantRejectedEvent extends BaseEvent {
  eventType: PacctEventType.ApplicantRejected;
  nodeId: NodeId;
}

export interface ApplicantAcceptedEvent extends BaseEvent {
  eventType: PacctEventType.ApplicantAccepted;
  nodeId: NodeId;
}

export interface ApplicantWithdrawnEvent extends BaseEvent {
  eventType: PacctEventType.ApplicantWithdrawn;
  nodeId: NodeId;
}

export interface ApplicantExpiredEvent extends BaseEvent {
  eventType: PacctEventType.ApplicantExpired;
  nodeId: NodeId;
}

export interface RunStartedEvent extends BaseEvent {
  eventType: PacctEventType.RunStarted;
  runId: RunId;
  initiatorNodeId: NodeId;
}

export interface RunCompletedEvent extends BaseEvent {
  eventType: PacctEventType.RunCompleted;
  runId: RunId;
}

export interface RunAbortedEvent extends BaseEvent {
  eventType: PacctEventType.RunAborted;
  runId: RunId;
  reason: string;
}

export type PacctEvent =
  | NetworkCreatedEvent
  | NetworkActivatedEvent
  | NetworkDegradedEvent
  | NetworkDissolvedEvent
  | MemberJoinedEvent
  | MemberLeftEvent
  | MemberExpelledEvent
  | MemberReAcknowledgedEvent
  | ApplicantSubmittedEvent
  | ApplicantApprovedEvent
  | ApplicantRejectedEvent
  | ApplicantAcceptedEvent
  | ApplicantWithdrawnEvent
  | ApplicantExpiredEvent
  | RunStartedEvent
  | RunCompletedEvent
  | RunAbortedEvent;
