import { describe, it, expect } from 'vitest';
import {
  createNetworkSchema,
  updateNetworkStatusSchema,
  addMemberSchema,
  updateMemberStatusSchema,
  submitApplicationSchema,
  updateApplicantStatusSchema,
  castVoteSchema,
  updatePresenceSchema,
  paginationSchema,
} from '../validation/api-validators';

describe('API Validators', () => {
  describe('createNetworkSchema', () => {
    it('should accept valid minimal input', () => {
      const result = createNetworkSchema.safeParse({
        id: 'net-1',
        alias: 'Test Network',
        creatorNodeId: 'node-1',
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid full input', () => {
      const result = createNetworkSchema.safeParse({
        id: 'net-1',
        alias: 'Test Network',
        creatorNodeId: 'node-1',
        visibilityMode: 'partial',
        visibilityConfig: { schema: 'full' },
        minActiveMembers: 5,
        preActivationTimeoutMs: 60000,
        postActivationInactivityTimeoutMs: 300000,
        manifests: {
          specManifests: [
            { specType: 'schema', specId: 's1', hash: 'h1', version: '1.0' },
          ],
          networkManifest: {
            schemaHash: 'sh1',
            computationHash: 'ch1',
            governanceHash: 'gh1',
            economicHash: 'eh1',
          },
        },
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing id', () => {
      const result = createNetworkSchema.safeParse({ alias: 'Test', creatorNodeId: 'n1' });
      expect(result.success).toBe(false);
    });

    it('should reject empty alias', () => {
      const result = createNetworkSchema.safeParse({ id: 'net-1', alias: '', creatorNodeId: 'n1' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid visibility mode', () => {
      const result = createNetworkSchema.safeParse({
        id: 'net-1', alias: 'Test', creatorNodeId: 'n1', visibilityMode: 'invalid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative minActiveMembers', () => {
      const result = createNetworkSchema.safeParse({
        id: 'net-1', alias: 'Test', creatorNodeId: 'n1', minActiveMembers: -1,
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid spec type in manifests', () => {
      const result = createNetworkSchema.safeParse({
        id: 'net-1', alias: 'Test', creatorNodeId: 'n1',
        manifests: { specManifests: [{ specType: 'invalid', specId: 's1', hash: 'h1', version: '1.0' }] },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateNetworkStatusSchema', () => {
    it('should accept valid statuses', () => {
      for (const status of ['draft', 'pending', 'active', 'degraded', 'dissolved', 'archived']) {
        const result = updateNetworkStatusSchema.safeParse({ status });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid status', () => {
      const result = updateNetworkStatusSchema.safeParse({ status: 'invalid' });
      expect(result.success).toBe(false);
    });
  });

  describe('addMemberSchema', () => {
    it('should accept valid input', () => {
      const result = addMemberSchema.safeParse({ nodeId: 'node-1' });
      expect(result.success).toBe(true);
    });

    it('should accept input with status', () => {
      const result = addMemberSchema.safeParse({ nodeId: 'node-1', status: 'active' });
      expect(result.success).toBe(true);
    });

    it('should reject empty nodeId', () => {
      const result = addMemberSchema.safeParse({ nodeId: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('updateMemberStatusSchema', () => {
    it('should accept valid statuses', () => {
      for (const status of ['active', 'left', 'expelled', 'offline', 'pending_reack']) {
        const result = updateMemberStatusSchema.safeParse({ status });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid status', () => {
      const result = updateMemberStatusSchema.safeParse({ status: 'invalid' });
      expect(result.success).toBe(false);
    });
  });

  describe('submitApplicationSchema', () => {
    it('should accept valid input', () => {
      const result = submitApplicationSchema.safeParse({ nodeId: 'node-2' });
      expect(result.success).toBe(true);
    });

    it('should reject empty nodeId', () => {
      const result = submitApplicationSchema.safeParse({ nodeId: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('updateApplicantStatusSchema', () => {
    it('should accept all valid statuses', () => {
      const statuses = [
        'draft', 'submitted', 'pending_approval', 'approved_pending_acceptance',
        'active', 'rejected', 'withdrawn', 'expired_pending_approval', 'expired_pending_acceptance',
      ];
      for (const status of statuses) {
        const result = updateApplicantStatusSchema.safeParse({ status });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid status', () => {
      const result = updateApplicantStatusSchema.safeParse({ status: 'bogus' });
      expect(result.success).toBe(false);
    });
  });

  describe('castVoteSchema', () => {
    it('should accept valid approve vote', () => {
      const result = castVoteSchema.safeParse({ voterNodeId: 'node-1', vote: 'approve' });
      expect(result.success).toBe(true);
    });

    it('should accept valid reject vote', () => {
      const result = castVoteSchema.safeParse({ voterNodeId: 'node-1', vote: 'reject' });
      expect(result.success).toBe(true);
    });

    it('should accept vote with signature', () => {
      const result = castVoteSchema.safeParse({ voterNodeId: 'node-1', vote: 'approve', signature: 'sig' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid vote value', () => {
      const result = castVoteSchema.safeParse({ voterNodeId: 'node-1', vote: 'abstain' });
      expect(result.success).toBe(false);
    });

    it('should reject missing voterNodeId', () => {
      const result = castVoteSchema.safeParse({ vote: 'approve' });
      expect(result.success).toBe(false);
    });
  });

  describe('updatePresenceSchema', () => {
    it('should accept valid input', () => {
      const result = updatePresenceSchema.safeParse({ nodeId: 'node-1', online: true });
      expect(result.success).toBe(true);
    });

    it('should reject missing online', () => {
      const result = updatePresenceSchema.safeParse({ nodeId: 'node-1' });
      expect(result.success).toBe(false);
    });
  });

  describe('paginationSchema', () => {
    it('should accept valid pagination', () => {
      const result = paginationSchema.safeParse({ limit: 10, offset: 5 });
      expect(result.success).toBe(true);
    });

    it('should accept empty pagination', () => {
      const result = paginationSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should coerce string values', () => {
      const result = paginationSchema.safeParse({ limit: '10', offset: '5' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(10);
        expect(result.data.offset).toBe(5);
      }
    });

    it('should reject limit over 100', () => {
      const result = paginationSchema.safeParse({ limit: 101 });
      expect(result.success).toBe(false);
    });

    it('should reject negative offset', () => {
      const result = paginationSchema.safeParse({ offset: -1 });
      expect(result.success).toBe(false);
    });
  });
});
