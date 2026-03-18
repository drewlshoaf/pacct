import { describe, it, expect } from 'vitest';
import {
  NodeAvailability,
} from '../index';
import type {
  NodeId,
  NetworkId,
  Timestamp,
  PresenceLease,
  NodePresenceState,
  HeartbeatPayload,
  HeartbeatAck,
} from '../index';

describe('PresenceLease', () => {
  it('can be constructed with all fields', () => {
    const lease: PresenceLease = {
      nodeId: 'node-1' as NodeId,
      networkId: 'net-1' as NetworkId,
      lastHeartbeatAt: 1000 as Timestamp,
      leaseExpiresAt: 2000 as Timestamp,
      instanceId: 'discovery-a',
    };
    expect(lease.nodeId).toBe('node-1');
    expect(lease.networkId).toBe('net-1');
    expect(lease.lastHeartbeatAt).toBe(1000);
    expect(lease.leaseExpiresAt).toBe(2000);
    expect(lease.instanceId).toBe('discovery-a');
  });

  it('can be constructed without optional instanceId', () => {
    const lease: PresenceLease = {
      nodeId: 'node-2' as NodeId,
      networkId: 'net-2' as NetworkId,
      lastHeartbeatAt: 3000 as Timestamp,
      leaseExpiresAt: 4000 as Timestamp,
    };
    expect(lease.instanceId).toBeUndefined();
  });
});

describe('NodeAvailability', () => {
  it('has all expected values', () => {
    expect(NodeAvailability.Online).toBe('online');
    expect(NodeAvailability.Offline).toBe('offline');
    expect(NodeAvailability.Stale).toBe('stale');
    expect(NodeAvailability.Unknown).toBe('unknown');
  });

  it('has exactly 4 members', () => {
    const values = Object.values(NodeAvailability);
    expect(values).toHaveLength(4);
    expect(new Set(values).size).toBe(4);
  });
});

describe('NodePresenceState', () => {
  it('can be constructed with all fields', () => {
    const state: NodePresenceState = {
      nodeId: 'node-1' as NodeId,
      networkId: 'net-1' as NetworkId,
      availability: NodeAvailability.Online,
      lastHeartbeatAt: 1000 as Timestamp,
      leaseExpiresAt: 2000 as Timestamp,
      staleSinceMs: 500,
    };
    expect(state.availability).toBe('online');
    expect(state.staleSinceMs).toBe(500);
  });

  it('can be constructed with only required fields', () => {
    const state: NodePresenceState = {
      nodeId: 'node-1' as NodeId,
      networkId: 'net-1' as NetworkId,
      availability: NodeAvailability.Unknown,
    };
    expect(state.lastHeartbeatAt).toBeUndefined();
    expect(state.leaseExpiresAt).toBeUndefined();
    expect(state.staleSinceMs).toBeUndefined();
  });
});

describe('HeartbeatPayload', () => {
  it('can be constructed with all fields', () => {
    const payload: HeartbeatPayload = {
      nodeId: 'node-1' as NodeId,
      networkId: 'net-1' as NetworkId,
      timestamp: Date.now() as Timestamp,
      instanceId: 'discovery-a',
    };
    expect(payload.nodeId).toBe('node-1');
    expect(typeof payload.timestamp).toBe('number');
    expect(payload.instanceId).toBe('discovery-a');
  });

  it('can be constructed without optional instanceId', () => {
    const payload: HeartbeatPayload = {
      nodeId: 'node-1' as NodeId,
      networkId: 'net-1' as NetworkId,
      timestamp: Date.now() as Timestamp,
    };
    expect(payload.instanceId).toBeUndefined();
  });
});

describe('HeartbeatAck', () => {
  it('can be constructed with all fields', () => {
    const ack: HeartbeatAck = {
      nodeId: 'node-1' as NodeId,
      networkId: 'net-1' as NetworkId,
      leaseExpiresAt: 5000 as Timestamp,
      serverTimestamp: 4000 as Timestamp,
      instanceId: 'discovery-a',
    };
    expect(ack.leaseExpiresAt).toBe(5000);
    expect(ack.serverTimestamp).toBe(4000);
    expect(ack.instanceId).toBe('discovery-a');
  });
});
