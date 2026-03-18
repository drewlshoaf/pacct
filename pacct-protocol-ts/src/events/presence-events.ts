import type { NodeId, NetworkId, Timestamp } from '../types';
import { NodeAvailability } from '../presence/presence-types';

export enum PresenceEventType {
  HeartbeatReceived = 'presence:heartbeat_received',
  NodeWentOnline = 'presence:node_online',
  NodeWentOffline = 'presence:node_offline',
  NodeWentStale = 'presence:node_stale',
  LeaseRenewed = 'presence:lease_renewed',
  LeaseExpired = 'presence:lease_expired',
}

export interface PresenceChangeEvent {
  eventType: PresenceEventType;
  nodeId: NodeId;
  networkId: NetworkId;
  previousAvailability?: NodeAvailability;
  newAvailability: NodeAvailability;
  timestamp: Timestamp;
  instanceId?: string; // which discovery instance detected the change
}
