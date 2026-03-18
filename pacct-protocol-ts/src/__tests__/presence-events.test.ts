import { describe, it, expect } from 'vitest';
import {
  PresenceEventType,
  NodeAvailability,
} from '../index';
import type {
  NodeId,
  NetworkId,
  Timestamp,
  PresenceChangeEvent,
} from '../index';

describe('PresenceEventType', () => {
  it('has all expected values', () => {
    expect(PresenceEventType.HeartbeatReceived).toBe('presence:heartbeat_received');
    expect(PresenceEventType.NodeWentOnline).toBe('presence:node_online');
    expect(PresenceEventType.NodeWentOffline).toBe('presence:node_offline');
    expect(PresenceEventType.NodeWentStale).toBe('presence:node_stale');
    expect(PresenceEventType.LeaseRenewed).toBe('presence:lease_renewed');
    expect(PresenceEventType.LeaseExpired).toBe('presence:lease_expired');
  });

  it('has exactly 6 members', () => {
    const values = Object.values(PresenceEventType);
    expect(values).toHaveLength(6);
    expect(new Set(values).size).toBe(6);
  });
});

describe('PresenceChangeEvent', () => {
  it('can be constructed with all fields', () => {
    const event: PresenceChangeEvent = {
      eventType: PresenceEventType.NodeWentOnline,
      nodeId: 'node-1' as NodeId,
      networkId: 'net-1' as NetworkId,
      previousAvailability: NodeAvailability.Offline,
      newAvailability: NodeAvailability.Online,
      timestamp: Date.now() as Timestamp,
      instanceId: 'discovery-a',
    };
    expect(event.eventType).toBe('presence:node_online');
    expect(event.previousAvailability).toBe('offline');
    expect(event.newAvailability).toBe('online');
    expect(event.instanceId).toBe('discovery-a');
  });

  it('can be constructed without optional fields', () => {
    const event: PresenceChangeEvent = {
      eventType: PresenceEventType.HeartbeatReceived,
      nodeId: 'node-2' as NodeId,
      networkId: 'net-2' as NetworkId,
      newAvailability: NodeAvailability.Online,
      timestamp: Date.now() as Timestamp,
    };
    expect(event.previousAvailability).toBeUndefined();
    expect(event.instanceId).toBeUndefined();
  });
});
