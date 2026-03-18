import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LeaseEngine } from '../presence/lease-engine';

// Mock the instance-id module
vi.mock('../instance-id', () => ({
  getInstanceId: () => 'test-instance-id',
}));

function createMockPool() {
  const mockQuery = vi.fn();
  const pool = { query: mockQuery, connect: vi.fn(), end: vi.fn() } as any;
  return { pool, mockQuery };
}

describe('LeaseEngine', () => {
  let engine: LeaseEngine;
  let mockQuery: ReturnType<typeof createMockPool>['mockQuery'];

  const config = {
    leaseTimeoutMs: 90_000,
    sweepIntervalMs: 15_000,
    staleThresholdMs: 60_000,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    const mock = createMockPool();
    engine = new LeaseEngine(mock.pool, config);
    mockQuery = mock.mockQuery;
  });

  afterEach(() => {
    engine.stopSweep();
    vi.useRealTimers();
  });

  describe('processHeartbeat', () => {
    it('should upsert presence and return lease expiry', async () => {
      // getPresence returns undefined (new node)
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      // upsertPresence INSERT
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
      // upsertPresence getPresence
      mockQuery.mockResolvedValueOnce({
        rows: [{ network_id: 'net-1', node_id: 'node-1', last_heartbeat_at: Date.now(), lease_expires_at: Date.now() + 90000, instance_id: 'test-instance-id' }],
        rowCount: 1,
      });
      // logEvent (new node goes online)
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, network_id: 'net-1', event_type: 'presence:node_online', node_id: 'node-1', payload: {}, timestamp: Date.now() }],
        rowCount: 1,
      });

      const result = await engine.processHeartbeat('net-1', 'node-1');

      expect(result.instanceId).toBe('test-instance-id');
      expect(result.leaseExpiresAt).toBeGreaterThan(Date.now());
    });

    it('should log online event for new nodes', async () => {
      // getPresence - no existing lease
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      // upsertPresence INSERT
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
      // upsertPresence getPresence
      mockQuery.mockResolvedValueOnce({
        rows: [{ network_id: 'net-1', node_id: 'node-1', last_heartbeat_at: Date.now(), lease_expires_at: Date.now() + 90000, instance_id: 'test-instance-id' }],
        rowCount: 1,
      });
      // logEvent
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, network_id: 'net-1', event_type: 'presence:node_online', node_id: 'node-1', payload: {}, timestamp: Date.now() }],
        rowCount: 1,
      });

      await engine.processHeartbeat('net-1', 'node-1');

      // The 4th call should be the logEvent INSERT
      const logCall = mockQuery.mock.calls[3];
      expect(logCall[0]).toContain('INSERT INTO event_log');
      expect(logCall[1][1]).toBe('presence:node_online');
    });

    it('should not log event for already-online nodes', async () => {
      const now = Date.now();
      // getPresence - existing active lease
      mockQuery.mockResolvedValueOnce({
        rows: [{ network_id: 'net-1', node_id: 'node-1', last_heartbeat_at: now - 5000, lease_expires_at: now + 85000, instance_id: 'test-instance-id' }],
        rowCount: 1,
      });
      // upsertPresence INSERT
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
      // upsertPresence getPresence
      mockQuery.mockResolvedValueOnce({
        rows: [{ network_id: 'net-1', node_id: 'node-1', last_heartbeat_at: now, lease_expires_at: now + 90000, instance_id: 'test-instance-id' }],
        rowCount: 1,
      });

      await engine.processHeartbeat('net-1', 'node-1');

      // Should be 3 calls (getPresence, upsert INSERT, upsert getPresence) - no logEvent
      expect(mockQuery).toHaveBeenCalledTimes(3);
    });
  });

  describe('sweepExpired', () => {
    it('should find and mark expired leases offline', async () => {
      const now = Date.now();
      // getExpiredLeases
      mockQuery.mockResolvedValueOnce({
        rows: [
          { network_id: 'net-1', node_id: 'node-1', last_heartbeat_at: now - 100000, lease_expires_at: now - 10000, instance_id: 'inst-1' },
        ],
        rowCount: 1,
      });
      // setOffline UPDATE
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
      // logEvent INSERT (offline event)
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 2, network_id: 'net-1', event_type: 'presence:node_offline', node_id: 'node-1', payload: {}, timestamp: now }],
        rowCount: 1,
      });

      const offlineNodes = await engine.sweepExpired();

      expect(offlineNodes).toEqual(['node-1']);
      // setOffline should set lease_expires_at to 0
      const setOfflineCall = mockQuery.mock.calls[1];
      expect(setOfflineCall[0]).toContain('UPDATE presence_leases SET lease_expires_at = 0');
    });

    it('should log offline events during sweep', async () => {
      const now = Date.now();
      mockQuery.mockResolvedValueOnce({
        rows: [
          { network_id: 'net-1', node_id: 'node-1', last_heartbeat_at: now - 100000, lease_expires_at: now - 10000, instance_id: null },
        ],
        rowCount: 1,
      });
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // setOffline
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 3, network_id: 'net-1', event_type: 'presence:node_offline', node_id: 'node-1', payload: {}, timestamp: now }],
        rowCount: 1,
      }); // logEvent

      await engine.sweepExpired();

      const logCall = mockQuery.mock.calls[2];
      expect(logCall[0]).toContain('INSERT INTO event_log');
      expect(logCall[1][1]).toBe('presence:node_offline');
    });

    it('should skip already-swept leases (lease_expires_at === 0)', async () => {
      const now = Date.now();
      mockQuery.mockResolvedValueOnce({
        rows: [
          { network_id: 'net-1', node_id: 'node-1', last_heartbeat_at: now - 100000, lease_expires_at: 0, instance_id: null },
        ],
        rowCount: 1,
      });

      const offlineNodes = await engine.sweepExpired();

      expect(offlineNodes).toEqual([]);
      // Only 1 call (getExpiredLeases), no setOffline or logEvent
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('getNodeAvailability', () => {
    it('should return online for active lease', async () => {
      const now = Date.now();
      mockQuery.mockResolvedValueOnce({
        rows: [{ network_id: 'net-1', node_id: 'node-1', last_heartbeat_at: now - 5000, lease_expires_at: now + 85000, instance_id: null }],
        rowCount: 1,
      });

      const result = await engine.getNodeAvailability('net-1', 'node-1');
      expect(result).toBe('online');
    });

    it('should return offline for expired lease', async () => {
      const now = Date.now();
      mockQuery.mockResolvedValueOnce({
        rows: [{ network_id: 'net-1', node_id: 'node-1', last_heartbeat_at: now - 100000, lease_expires_at: now - 10000, instance_id: null }],
        rowCount: 1,
      });

      const result = await engine.getNodeAvailability('net-1', 'node-1');
      expect(result).toBe('offline');
    });

    it('should return stale for near-expiry lease', async () => {
      const now = Date.now();
      // last_heartbeat_at is older than staleThresholdMs (60s)
      mockQuery.mockResolvedValueOnce({
        rows: [{ network_id: 'net-1', node_id: 'node-1', last_heartbeat_at: now - 70000, lease_expires_at: now + 20000, instance_id: null }],
        rowCount: 1,
      });

      const result = await engine.getNodeAvailability('net-1', 'node-1');
      expect(result).toBe('stale');
    });

    it('should return unknown for non-existent node', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await engine.getNodeAvailability('net-1', 'non-existent');
      expect(result).toBe('unknown');
    });
  });

  describe('startSweep/stopSweep lifecycle', () => {
    it('should start and stop sweep interval', () => {
      // getExpiredLeases mock for the sweep
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      engine.startSweep();

      // Advance time to trigger one sweep
      vi.advanceTimersByTime(15_000);

      // Should have called getExpiredLeases
      expect(mockQuery).toHaveBeenCalled();

      engine.stopSweep();

      const callCount = mockQuery.mock.calls.length;

      // Advance time further - no more calls after stop
      vi.advanceTimersByTime(30_000);

      expect(mockQuery.mock.calls.length).toBe(callCount);
    });
  });

  describe('getNetworkPresenceWithAvailability', () => {
    it('should return correct availability for each node', async () => {
      const now = Date.now();
      mockQuery.mockResolvedValueOnce({
        rows: [
          { network_id: 'net-1', node_id: 'node-1', last_heartbeat_at: now - 5000, lease_expires_at: now + 85000, instance_id: 'inst-1' },
          { network_id: 'net-1', node_id: 'node-2', last_heartbeat_at: now - 70000, lease_expires_at: now + 20000, instance_id: 'inst-1' },
          { network_id: 'net-1', node_id: 'node-3', last_heartbeat_at: now - 100000, lease_expires_at: now - 10000, instance_id: null },
        ],
        rowCount: 3,
      });

      const result = await engine.getNetworkPresenceWithAvailability('net-1');

      expect(result).toHaveLength(3);
      expect(result[0].nodeId).toBe('node-1');
      expect(result[0].availability).toBe('online');
      expect(result[1].nodeId).toBe('node-2');
      expect(result[1].availability).toBe('stale');
      expect(result[2].nodeId).toBe('node-3');
      expect(result[2].availability).toBe('offline');
    });
  });
});
