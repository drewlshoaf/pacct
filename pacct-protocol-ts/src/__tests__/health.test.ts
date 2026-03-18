import { describe, it, expect } from 'vitest';
import {
  DiscoveryHealthStatus,
} from '../index';
import type {
  DiscoveryInstanceHealth,
  DiscoveryServiceHealth,
} from '../index';

describe('DiscoveryHealthStatus', () => {
  it('has all expected values', () => {
    expect(DiscoveryHealthStatus.Healthy).toBe('healthy');
    expect(DiscoveryHealthStatus.Degraded).toBe('degraded');
    expect(DiscoveryHealthStatus.Unhealthy).toBe('unhealthy');
  });

  it('has exactly 3 members', () => {
    const values = Object.values(DiscoveryHealthStatus);
    expect(values).toHaveLength(3);
    expect(new Set(values).size).toBe(3);
  });
});

describe('DiscoveryInstanceHealth', () => {
  it('can be constructed with all fields', () => {
    const instance: DiscoveryInstanceHealth = {
      instanceId: 'discovery-a',
      status: DiscoveryHealthStatus.Healthy,
      uptime: 60000,
      startedAt: Date.now() - 60000,
      dbConnected: true,
      dbLatencyMs: 5,
      activeWebSockets: 42,
      lastHeartbeatProcessedAt: Date.now(),
      version: '1.0.0',
    };
    expect(instance.instanceId).toBe('discovery-a');
    expect(instance.status).toBe('healthy');
    expect(instance.dbConnected).toBe(true);
    expect(instance.activeWebSockets).toBe(42);
  });

  it('can be constructed without optional fields', () => {
    const instance: DiscoveryInstanceHealth = {
      instanceId: 'discovery-b',
      status: DiscoveryHealthStatus.Degraded,
      uptime: 1000,
      startedAt: Date.now() - 1000,
      dbConnected: false,
      activeWebSockets: 0,
      version: '1.0.0',
    };
    expect(instance.dbLatencyMs).toBeUndefined();
    expect(instance.lastHeartbeatProcessedAt).toBeUndefined();
  });
});

describe('DiscoveryServiceHealth', () => {
  it('can be constructed with nested objects', () => {
    const health: DiscoveryServiceHealth = {
      overallStatus: DiscoveryHealthStatus.Healthy,
      instances: [
        {
          instanceId: 'discovery-a',
          status: DiscoveryHealthStatus.Healthy,
          uptime: 60000,
          startedAt: Date.now() - 60000,
          dbConnected: true,
          dbLatencyMs: 3,
          activeWebSockets: 10,
          version: '1.0.0',
        },
      ],
      dbStatus: {
        connected: true,
        latencyMs: 3,
        poolSize: 10,
        activeConnections: 2,
      },
      presenceStats: {
        totalLeases: 100,
        onlineNodes: 80,
        offlineNodes: 15,
        staleNodes: 5,
      },
      checkedAt: Date.now(),
    };
    expect(health.overallStatus).toBe('healthy');
    expect(health.instances).toHaveLength(1);
    expect(health.dbStatus.connected).toBe(true);
    expect(health.presenceStats.totalLeases).toBe(100);
    expect(health.presenceStats.onlineNodes).toBe(80);
  });

  it('can be constructed with minimal dbStatus', () => {
    const health: DiscoveryServiceHealth = {
      overallStatus: DiscoveryHealthStatus.Unhealthy,
      instances: [],
      dbStatus: {
        connected: false,
      },
      presenceStats: {
        totalLeases: 0,
        onlineNodes: 0,
        offlineNodes: 0,
        staleNodes: 0,
      },
      checkedAt: Date.now(),
    };
    expect(health.dbStatus.latencyMs).toBeUndefined();
    expect(health.dbStatus.poolSize).toBeUndefined();
  });
});
