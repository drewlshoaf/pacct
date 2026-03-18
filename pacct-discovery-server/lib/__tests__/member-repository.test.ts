import { describe, it, expect, beforeEach } from 'vitest';
import { createMockPool } from './mock-pool';
import { MemberRepository } from '../db/repositories/member-repository';

describe('MemberRepository', () => {
  let repo: MemberRepository;
  let mockQuery: ReturnType<typeof createMockPool>['mockQuery'];

  beforeEach(() => {
    const mock = createMockPool();
    repo = new MemberRepository(mock.pool);
    mockQuery = mock.mockQuery;
  });

  describe('addMember', () => {
    it('should generate correct INSERT', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // INSERT
      mockQuery.mockResolvedValueOnce({
        rows: [{ network_id: 'net-1', node_id: 'node-1', status: 'active', joined_at: 1000, left_at: null, acknowledged_at: null }],
        rowCount: 1,
      }); // SELECT

      const result = await repo.addMember({ networkId: 'net-1', nodeId: 'node-1' });

      const insertCall = mockQuery.mock.calls[0];
      expect(insertCall[0]).toContain('INSERT INTO members');
      expect(insertCall[1][0]).toBe('net-1');
      expect(insertCall[1][1]).toBe('node-1');
      expect(insertCall[1][2]).toBe('active'); // default status
      expect(result.node_id).toBe('node-1');
      expect(result.status).toBe('active');
    });

    it('should use custom status when provided', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({
        rows: [{ network_id: 'net-1', node_id: 'node-1', status: 'pending_reack', joined_at: 1000, left_at: null, acknowledged_at: null }],
        rowCount: 1,
      });

      await repo.addMember({ networkId: 'net-1', nodeId: 'node-1', status: 'pending_reack' });

      expect(mockQuery.mock.calls[0][1][2]).toBe('pending_reack');
    });
  });

  describe('getMembers', () => {
    it('should generate correct SELECT', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await repo.getMembers('net-1');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM members WHERE network_id = $1 ORDER BY joined_at ASC',
        ['net-1'],
      );
    });
  });

  describe('updateMemberStatus', () => {
    it('should set left_at for left status', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({
        rows: [{ network_id: 'net-1', node_id: 'node-1', status: 'left', joined_at: 1000, left_at: 2000, acknowledged_at: null }],
        rowCount: 1,
      });

      await repo.updateMemberStatus('net-1', 'node-1', 'left');

      const updateCall = mockQuery.mock.calls[0];
      expect(updateCall[0]).toContain('UPDATE members SET status = $1, left_at = $2');
      expect(updateCall[1][0]).toBe('left');
      expect(updateCall[1][2]).toBe('net-1');
      expect(updateCall[1][3]).toBe('node-1');
    });

    it('should set left_at for expelled status', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({
        rows: [{ network_id: 'net-1', node_id: 'node-1', status: 'expelled', joined_at: 1000, left_at: 2000, acknowledged_at: null }],
        rowCount: 1,
      });

      await repo.updateMemberStatus('net-1', 'node-1', 'expelled');

      expect(mockQuery.mock.calls[0][1][0]).toBe('expelled');
    });

    it('should set acknowledged_at for active status', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({
        rows: [{ network_id: 'net-1', node_id: 'node-1', status: 'active', joined_at: 1000, left_at: null, acknowledged_at: 2000 }],
        rowCount: 1,
      });

      await repo.updateMemberStatus('net-1', 'node-1', 'active');

      const updateCall = mockQuery.mock.calls[0];
      expect(updateCall[0]).toContain('UPDATE members SET status = $1, acknowledged_at = $2');
    });

    it('should only set status for other statuses', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({
        rows: [{ network_id: 'net-1', node_id: 'node-1', status: 'offline', joined_at: 1000, left_at: null, acknowledged_at: null }],
        rowCount: 1,
      });

      await repo.updateMemberStatus('net-1', 'node-1', 'offline');

      const updateCall = mockQuery.mock.calls[0];
      expect(updateCall[0]).toContain('UPDATE members SET status = $1 WHERE network_id = $2 AND node_id = $3');
    });
  });

  describe('removeMember', () => {
    it('should generate correct DELETE', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const result = await repo.removeMember('net-1', 'node-1');

      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM members WHERE network_id = $1 AND node_id = $2',
        ['net-1', 'node-1'],
      );
      expect(result).toBe(true);
    });

    it('should return false when no rows deleted', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.removeMember('net-1', 'non-existent');
      expect(result).toBe(false);
    });
  });

  describe('getActiveMembers', () => {
    it('should filter by active status', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await repo.getActiveMembers('net-1');

      expect(mockQuery).toHaveBeenCalledWith(
        "SELECT * FROM members WHERE network_id = $1 AND status = 'active' ORDER BY joined_at ASC",
        ['net-1'],
      );
    });
  });
});
