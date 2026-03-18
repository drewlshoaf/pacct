import { describe, it, expect, beforeEach } from 'vitest';
import { createMockPool } from './mock-pool';
import { NetworkRepository } from '../db/repositories/network-repository';

describe('NetworkRepository', () => {
  let repo: NetworkRepository;
  let mockQuery: ReturnType<typeof createMockPool>['mockQuery'];

  beforeEach(() => {
    const mock = createMockPool();
    repo = new NetworkRepository(mock.pool);
    mockQuery = mock.mockQuery;
  });

  describe('createNetwork', () => {
    it('should generate correct INSERT SQL', async () => {
      const networkRow = {
        id: 'net-1',
        alias: 'Test Network',
        status: 'draft',
        creator_node_id: 'node-1',
        created_at: 1000,
        activated_at: null,
        dissolved_at: null,
        updated_at: 1000,
        visibility_mode: 'none',
        visibility_config: null,
        min_active_members: 3,
        pre_activation_timeout_ms: null,
        post_activation_inactivity_timeout_ms: null,
      };

      // INSERT call
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
      // SELECT call (from getNetwork)
      mockQuery.mockResolvedValueOnce({ rows: [networkRow], rowCount: 1 });

      const result = await repo.createNetwork({
        id: 'net-1',
        alias: 'Test Network',
        creatorNodeId: 'node-1',
      });

      expect(mockQuery).toHaveBeenCalledTimes(2);

      const insertCall = mockQuery.mock.calls[0];
      expect(insertCall[0]).toContain('INSERT INTO networks');
      expect(insertCall[1][0]).toBe('net-1');
      expect(insertCall[1][1]).toBe('Test Network');
      expect(insertCall[1][2]).toBe('node-1');
      // defaults
      expect(insertCall[1][5]).toBe('none'); // visibility_mode
      expect(insertCall[1][7]).toBe(3); // min_active_members

      expect(result.id).toBe('net-1');
      expect(result.alias).toBe('Test Network');
      expect(result.status).toBe('draft');
    });

    it('should pass custom params correctly', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'net-2', alias: 'Custom', status: 'draft', creator_node_id: 'node-1',
          created_at: 1000, activated_at: null, dissolved_at: null, updated_at: 1000,
          visibility_mode: 'partial', visibility_config: { schema: 'full' },
          min_active_members: 5, pre_activation_timeout_ms: 60000,
          post_activation_inactivity_timeout_ms: 300000,
        }],
        rowCount: 1,
      });

      await repo.createNetwork({
        id: 'net-2',
        alias: 'Custom',
        creatorNodeId: 'node-1',
        visibilityMode: 'partial',
        visibilityConfig: { schema: 'full' },
        minActiveMembers: 5,
        preActivationTimeoutMs: 60000,
        postActivationInactivityTimeoutMs: 300000,
      });

      const insertCall = mockQuery.mock.calls[0];
      expect(insertCall[1][5]).toBe('partial');
      expect(insertCall[1][6]).toBe(JSON.stringify({ schema: 'full' }));
      expect(insertCall[1][7]).toBe(5);
      expect(insertCall[1][8]).toBe(60000);
      expect(insertCall[1][9]).toBe(300000);
    });
  });

  describe('getNetwork', () => {
    it('should generate correct SELECT with $1 param', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'net-1', alias: 'Test', status: 'draft', creator_node_id: 'node-1',
          created_at: 1000, activated_at: null, dissolved_at: null, updated_at: 1000,
          visibility_mode: 'none', visibility_config: null, min_active_members: 3,
          pre_activation_timeout_ms: null, post_activation_inactivity_timeout_ms: null,
        }],
        rowCount: 1,
      });

      const result = await repo.getNetwork('net-1');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM networks WHERE id = $1',
        ['net-1'],
      );
      expect(result).toBeDefined();
      expect(result!.id).toBe('net-1');
    });

    it('should return undefined for non-existent network', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.getNetwork('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('listNetworks', () => {
    it('should generate SELECT without filter', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await repo.listNetworks();

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM networks ORDER BY created_at DESC',
      );
    });

    it('should generate SELECT with status filter', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await repo.listNetworks('active');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM networks WHERE status = $1 ORDER BY created_at DESC',
        ['active'],
      );
    });
  });

  describe('updateNetworkStatus', () => {
    it('should generate UPDATE with activated_at for active status', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'net-1', alias: 'T', status: 'active', creator_node_id: 'n', created_at: 1, activated_at: 2, dissolved_at: null, updated_at: 2, visibility_mode: 'none', visibility_config: null, min_active_members: 3, pre_activation_timeout_ms: null, post_activation_inactivity_timeout_ms: null }],
        rowCount: 1,
      });

      await repo.updateNetworkStatus('net-1', 'active');

      const updateCall = mockQuery.mock.calls[0];
      expect(updateCall[0]).toContain('UPDATE networks SET status = $1, activated_at = $2');
      expect(updateCall[1][0]).toBe('active');
      expect(updateCall[1][3]).toBe('net-1');
    });

    it('should generate UPDATE with dissolved_at for dissolved status', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'net-1', alias: 'T', status: 'dissolved', creator_node_id: 'n', created_at: 1, activated_at: null, dissolved_at: 2, updated_at: 2, visibility_mode: 'none', visibility_config: null, min_active_members: 3, pre_activation_timeout_ms: null, post_activation_inactivity_timeout_ms: null }],
        rowCount: 1,
      });

      await repo.updateNetworkStatus('net-1', 'dissolved');

      const updateCall = mockQuery.mock.calls[0];
      expect(updateCall[0]).toContain('UPDATE networks SET status = $1, dissolved_at = $2');
      expect(updateCall[1][0]).toBe('dissolved');
    });

    it('should generate simple UPDATE for other statuses', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'net-1', alias: 'T', status: 'pending', creator_node_id: 'n', created_at: 1, activated_at: null, dissolved_at: null, updated_at: 2, visibility_mode: 'none', visibility_config: null, min_active_members: 3, pre_activation_timeout_ms: null, post_activation_inactivity_timeout_ms: null }],
        rowCount: 1,
      });

      await repo.updateNetworkStatus('net-1', 'pending');

      const updateCall = mockQuery.mock.calls[0];
      expect(updateCall[0]).toContain('UPDATE networks SET status = $1, updated_at = $2 WHERE id = $3');
      expect(updateCall[1][0]).toBe('pending');
      expect(updateCall[1][2]).toBe('net-1');
    });
  });

  describe('deleteNetwork', () => {
    it('should generate correct DELETE', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const result = await repo.deleteNetwork('net-1');

      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM networks WHERE id = $1',
        ['net-1'],
      );
      expect(result).toBe(true);
    });

    it('should return false when no rows deleted', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.deleteNetwork('non-existent');
      expect(result).toBe(false);
    });
  });
});
