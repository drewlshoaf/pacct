import { describe, it, expect, beforeEach } from 'vitest';
import { createMockPool } from './mock-pool';
import { VoteRepository } from '../db/repositories/vote-repository';

describe('VoteRepository', () => {
  let repo: VoteRepository;
  let mockQuery: ReturnType<typeof createMockPool>['mockQuery'];

  beforeEach(() => {
    const mock = createMockPool();
    repo = new VoteRepository(mock.pool);
    mockQuery = mock.mockQuery;
  });

  describe('castVote', () => {
    it('should generate INSERT ON CONFLICT', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // INSERT
      mockQuery.mockResolvedValueOnce({
        rows: [{
          network_id: 'net-1', applicant_node_id: 'node-2', voter_node_id: 'node-1',
          vote: 'approve', timestamp: 1000, signature: null,
        }],
        rowCount: 1,
      }); // SELECT (getVote)

      const result = await repo.castVote({
        networkId: 'net-1',
        applicantNodeId: 'node-2',
        voterNodeId: 'node-1',
        vote: 'approve',
      });

      const insertCall = mockQuery.mock.calls[0];
      expect(insertCall[0]).toContain('INSERT INTO approval_votes');
      expect(insertCall[0]).toContain('ON CONFLICT');
      expect(insertCall[0]).toContain('DO UPDATE SET');
      expect(insertCall[1][0]).toBe('net-1');
      expect(insertCall[1][1]).toBe('node-2');
      expect(insertCall[1][2]).toBe('node-1');
      expect(insertCall[1][3]).toBe('approve');
      expect(insertCall[1][5]).toBeNull(); // signature default
      expect(result.vote).toBe('approve');
    });

    it('should pass signature when provided', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({
        rows: [{
          network_id: 'net-1', applicant_node_id: 'node-2', voter_node_id: 'node-1',
          vote: 'approve', timestamp: 1000, signature: 'sig-123',
        }],
        rowCount: 1,
      });

      await repo.castVote({
        networkId: 'net-1',
        applicantNodeId: 'node-2',
        voterNodeId: 'node-1',
        vote: 'approve',
        signature: 'sig-123',
      });

      expect(mockQuery.mock.calls[0][1][5]).toBe('sig-123');
    });
  });

  describe('getVotes', () => {
    it('should generate correct SELECT', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await repo.getVotes('net-1', 'node-2');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM approval_votes WHERE network_id = $1 AND applicant_node_id = $2 ORDER BY timestamp ASC',
        ['net-1', 'node-2'],
      );
    });
  });

  describe('getVoteCount', () => {
    it('should generate correct COUNT query', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ approve: '2', reject: '1' }],
        rowCount: 1,
      });

      const result = await repo.getVoteCount('net-1', 'node-2');

      const countCall = mockQuery.mock.calls[0];
      expect(countCall[0]).toContain('COUNT(*)');
      expect(countCall[0]).toContain("WHERE vote = 'approve'");
      expect(countCall[0]).toContain("WHERE vote = 'reject'");
      expect(countCall[1]).toEqual(['net-1', 'node-2']);
      expect(result.approve).toBe(2);
      expect(result.reject).toBe(1);
    });

    it('should return 0 counts when no votes', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ approve: '0', reject: '0' }],
        rowCount: 1,
      });

      const result = await repo.getVoteCount('net-1', 'node-2');
      expect(result.approve).toBe(0);
      expect(result.reject).toBe(0);
    });
  });
});
