import type { NodeId, NetworkId, Timestamp } from '../types';

export interface PresenceLease {
  nodeId: NodeId;
  networkId: NetworkId;
  lastHeartbeatAt: Timestamp;
  leaseExpiresAt: Timestamp;
  instanceId?: string; // which discovery instance last processed the heartbeat
}

export enum NodeAvailability {
  Online = 'online',
  Offline = 'offline',
  Stale = 'stale',    // heartbeat received but nearing expiry
  Unknown = 'unknown', // no heartbeat ever received
}

export interface NodePresenceState {
  nodeId: NodeId;
  networkId: NetworkId;
  availability: NodeAvailability;
  lastHeartbeatAt?: Timestamp;
  leaseExpiresAt?: Timestamp;
  staleSinceMs?: number; // how long since last heartbeat
}

export interface HeartbeatPayload {
  nodeId: NodeId;
  networkId: NetworkId;
  timestamp: Timestamp;
  instanceId?: string; // populated by discovery server
}

export interface HeartbeatAck {
  nodeId: NodeId;
  networkId: NetworkId;
  leaseExpiresAt: Timestamp;
  serverTimestamp: Timestamp;
  instanceId: string;
}
