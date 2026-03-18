import { describe, it, expect, beforeEach } from 'vitest';
import { createMockPool } from './mock-pool';
import { PresenceRepository } from '../db/repositories/presence-repository';

describe('PresenceRepository', () => {
  let repo: PresenceRepository;
  let mockQuery: ReturnType<typeof createMockPool>['mockQuery'];

  beforeEach(() => {
    const mock = createMockPool();
    repo = new PresenceRepository(mock.pool);
    mockQuery = mock.mockQuery;
  });

  describe('upsertPresence', () => {
    it('should generate INSERT ON CONFLICT UPDATE', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // INSERT
      mockQuery.mockResolvedValueOnce({
        rows: [{ network_id: 'net-1', node_id: 'node-1', last_heartbeat_at: 1000, lease_expires_at: 31000, instance_id: 'inst-1' }],
        rowCount: 1,
      }); // SELECT

      const result = await repo.upsertPresence('net-1', 'node-1', 1000, 31000, 'inst-1');

      const insertCall = mockQuery.mock.calls[0];
      expect(insertCall[0]).toContain('INSERT INTO presence_leases');
      expect(insertCall[0]).toContain('ON CONFLICT (network_id, node_id)');
      expect(insertCall[0]).toContain('DO UPDATE SET');
      expect(insertCall[1]).toEqual(['net-1', 'node-1', 1000, 31000, 'inst-1']);
      expect(result.lease_expires_at).toBe(31000);
    });

    it('should default instance_id to null', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({
        rows: [{ network_id: 'net-1', node_id: 'node-1', last_heartbeat_at: 1000, lease_expires_at: 31000, instance_id: null }],
        rowCount: 1,
      });

      await repo.upsertPresence('net-1', 'node-1', 1000, 31000);

      expect(mockQuery.mock.calls[0][1][4]).toBeNull();
    });
  });

  describe('getPresence', () => {
    it('should generate correct SELECT', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ network_id: 'net-1', node_id: 'node-1', last_heartbeat_at: 1000, lease_expires_at: 31000, instance_id: null }],
        rowCount: 1,
      });

      const result = await repo.getPresence('net-1', 'node-1');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM presence_leases WHERE network_id = $1 AND node_id = $2',
        ['net-1', 'node-1'],
      );
      expect(result).toBeDefined();
      expect(result!.last_heartbeat_at).toBe(1000);
    });

    it('should return undefined for non-existent presence', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.getPresence('net-1', 'non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('getNetworkPresence', () => {
    it('should generate correct SELECT', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await repo.getNetworkPresence('net-1');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM presence_leases WHERE network_id = $1 ORDER BY last_heartbeat_at DESC',
        ['net-1'],
      );
    });
  });

  describe('getExpiredLeases', () => {
    it('should generate SELECT with lease_expires_at < $1', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await repo.getExpiredLeases(50000);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM presence_leases WHERE lease_expires_at < $1',
        [50000],
      );
    });
  });

  describe('setOffline', () => {
    it('should generate correct UPDATE', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await repo.setOffline('net-1', 'node-1');

      const updateCall = mockQuery.mock.calls[0];
      expect(updateCall[0]).toContain('UPDATE presence_leases SET lease_expires_at = 0');
      expect(updateCall[1][1]).toBe('net-1');
      expect(updateCall[1][2]).toBe('node-1');
    });
  });

  describe('getOnlineNodes', () => {
    it('should generate SELECT with lease_expires_at >= $2', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await repo.getOnlineNodes('net-1', 50000);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM presence_leases WHERE network_id = $1 AND lease_expires_at >= $2 ORDER BY last_heartbeat_at DESC',
        ['net-1', 50000],
      );
    });
  });

  describe('deletePresence', () => {
    it('should generate correct DELETE', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await repo.deletePresence('net-1', 'node-1');

      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM presence_leases WHERE network_id = $1 AND node_id = $2',
        ['net-1', 'node-1'],
      );
    });
  });

  describe('updatePresence', () => {
    it('should create lease when online=true', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // upsert INSERT
      mockQuery.mockResolvedValueOnce({
        rows: [{ network_id: 'net-1', node_id: 'node-1', last_heartbeat_at: 1000, lease_expires_at: 31000, instance_id: null }],
        rowCount: 1,
      }); // getPresence

      const result = await repo.updatePresence({ networkId: 'net-1', nodeId: 'node-1', online: true });

      const insertCall = mockQuery.mock.calls[0];
      expect(insertCall[0]).toContain('INSERT INTO presence_leases');
      // lease_expires_at should be now + 30000
      expect(insertCall[1][3]).toBeGreaterThan(insertCall[1][2]);
      expect(result).toBeDefined();
    });

    it('should set lease_expires_at to 0 when online=false', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({
        rows: [{ network_id: 'net-1', node_id: 'node-1', last_heartbeat_at: 1000, lease_expires_at: 0, instance_id: null }],
        rowCount: 1,
      });

      await repo.updatePresence({ networkId: 'net-1', nodeId: 'node-1', online: false });

      const insertCall = mockQuery.mock.calls[0];
      expect(insertCall[1][3]).toBe(0); // lease_expires_at = 0
    });
  });
});
