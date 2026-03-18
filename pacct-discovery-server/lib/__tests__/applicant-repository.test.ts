import { describe, it, expect, beforeEach } from 'vitest';
import { createMockPool } from './mock-pool';
import { ApplicantRepository } from '../db/repositories/applicant-repository';

describe('ApplicantRepository', () => {
  let repo: ApplicantRepository;
  let mockQuery: ReturnType<typeof createMockPool>['mockQuery'];

  beforeEach(() => {
    const mock = createMockPool();
    repo = new ApplicantRepository(mock.pool);
    mockQuery = mock.mockQuery;
  });

  describe('createApplicant', () => {
    it('should generate correct INSERT', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // INSERT
      mockQuery.mockResolvedValueOnce({
        rows: [{
          network_id: 'net-1', node_id: 'node-2', status: 'submitted', applied_at: 1000,
          approved_at: null, accepted_at: null, rejected_at: null, withdrawn_at: null,
          expired_at: null, approval_due_at: null, acceptance_due_at: null,
        }],
        rowCount: 1,
      }); // SELECT

      const result = await repo.createApplicant({ networkId: 'net-1', nodeId: 'node-2' });

      const insertCall = mockQuery.mock.calls[0];
      expect(insertCall[0]).toContain('INSERT INTO applicants');
      expect(insertCall[1][0]).toBe('net-1');
      expect(insertCall[1][1]).toBe('node-2');
      expect(insertCall[1][2]).toBe('submitted'); // default
      expect(result.status).toBe('submitted');
    });
  });

  describe('getApplicant', () => {
    it('should generate correct SELECT', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await repo.getApplicant('net-1', 'node-2');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM applicants WHERE network_id = $1 AND node_id = $2',
        ['net-1', 'node-2'],
      );
    });

    it('should return undefined for non-existent applicant', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.getApplicant('net-1', 'non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('updateApplicantStatus', () => {
    it('should set approved_at for approved_pending_acceptance', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({
        rows: [{
          network_id: 'net-1', node_id: 'node-2', status: 'approved_pending_acceptance',
          applied_at: 1000, approved_at: 2000, accepted_at: null, rejected_at: null,
          withdrawn_at: null, expired_at: null, approval_due_at: null, acceptance_due_at: null,
        }],
        rowCount: 1,
      });

      await repo.updateApplicantStatus('net-1', 'node-2', 'approved_pending_acceptance');

      const updateCall = mockQuery.mock.calls[0];
      expect(updateCall[0]).toContain('UPDATE applicants SET status = $1, approved_at = $2');
      expect(updateCall[1][0]).toBe('approved_pending_acceptance');
    });

    it('should set rejected_at for rejected status', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({
        rows: [{
          network_id: 'net-1', node_id: 'node-2', status: 'rejected',
          applied_at: 1000, approved_at: null, accepted_at: null, rejected_at: 2000,
          withdrawn_at: null, expired_at: null, approval_due_at: null, acceptance_due_at: null,
        }],
        rowCount: 1,
      });

      await repo.updateApplicantStatus('net-1', 'node-2', 'rejected');

      expect(mockQuery.mock.calls[0][0]).toContain('rejected_at');
    });

    it('should set withdrawn_at for withdrawn status', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({
        rows: [{
          network_id: 'net-1', node_id: 'node-2', status: 'withdrawn',
          applied_at: 1000, approved_at: null, accepted_at: null, rejected_at: null,
          withdrawn_at: 2000, expired_at: null, approval_due_at: null, acceptance_due_at: null,
        }],
        rowCount: 1,
      });

      await repo.updateApplicantStatus('net-1', 'node-2', 'withdrawn');

      expect(mockQuery.mock.calls[0][0]).toContain('withdrawn_at');
    });

    it('should set accepted_at for active status', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({
        rows: [{
          network_id: 'net-1', node_id: 'node-2', status: 'active',
          applied_at: 1000, approved_at: null, accepted_at: 2000, rejected_at: null,
          withdrawn_at: null, expired_at: null, approval_due_at: null, acceptance_due_at: null,
        }],
        rowCount: 1,
      });

      await repo.updateApplicantStatus('net-1', 'node-2', 'active');

      expect(mockQuery.mock.calls[0][0]).toContain('accepted_at');
    });

    it('should set expired_at for expired statuses', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({
        rows: [{
          network_id: 'net-1', node_id: 'node-2', status: 'expired_pending_approval',
          applied_at: 1000, approved_at: null, accepted_at: null, rejected_at: null,
          withdrawn_at: null, expired_at: 2000, approval_due_at: null, acceptance_due_at: null,
        }],
        rowCount: 1,
      });

      await repo.updateApplicantStatus('net-1', 'node-2', 'expired_pending_approval');

      expect(mockQuery.mock.calls[0][0]).toContain('expired_at');
    });

    it('should only set status for statuses without timestamp field', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({
        rows: [{
          network_id: 'net-1', node_id: 'node-2', status: 'submitted',
          applied_at: 1000, approved_at: null, accepted_at: null, rejected_at: null,
          withdrawn_at: null, expired_at: null, approval_due_at: null, acceptance_due_at: null,
        }],
        rowCount: 1,
      });

      await repo.updateApplicantStatus('net-1', 'node-2', 'submitted');

      const updateCall = mockQuery.mock.calls[0];
      expect(updateCall[0]).toBe('UPDATE applicants SET status = $1 WHERE network_id = $2 AND node_id = $3');
    });
  });

  describe('getApplicants', () => {
    it('should list all applicants for a network', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await repo.getApplicants('net-1');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM applicants WHERE network_id = $1 ORDER BY applied_at DESC',
        ['net-1'],
      );
    });
  });

  describe('deleteApplicant', () => {
    it('should generate correct DELETE', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const result = await repo.deleteApplicant('net-1', 'node-2');

      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM applicants WHERE network_id = $1 AND node_id = $2',
        ['net-1', 'node-2'],
      );
      expect(result).toBe(true);
    });
  });
});
