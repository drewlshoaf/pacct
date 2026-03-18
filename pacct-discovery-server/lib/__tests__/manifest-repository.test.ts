import { describe, it, expect, beforeEach } from 'vitest';
import { createMockPool } from './mock-pool';
import { ManifestRepository } from '../db/repositories/manifest-repository';

describe('ManifestRepository', () => {
  let repo: ManifestRepository;
  let mockQuery: ReturnType<typeof createMockPool>['mockQuery'];
  let mockClient: ReturnType<typeof createMockPool>['mockClient'];

  beforeEach(() => {
    const mock = createMockPool();
    repo = new ManifestRepository(mock.pool);
    mockQuery = mock.mockQuery;
    mockClient = mock.mockClient;
  });

  describe('storeSpecManifest', () => {
    it('should generate INSERT ON CONFLICT for single manifest', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // INSERT
      mockQuery.mockResolvedValueOnce({
        rows: [{ network_id: 'net-1', spec_type: 'schema', spec_id: 'spec-1', hash: 'abc123', version: '1.0.0', created_at: 1000 }],
        rowCount: 1,
      }); // SELECT

      const result = await repo.storeSpecManifest({
        networkId: 'net-1',
        specType: 'schema',
        specId: 'spec-1',
        hash: 'abc123',
        version: '1.0.0',
      });

      const insertCall = mockQuery.mock.calls[0];
      expect(insertCall[0]).toContain('INSERT INTO spec_manifests');
      expect(insertCall[0]).toContain('ON CONFLICT (network_id, spec_type)');
      expect(insertCall[1][0]).toBe('net-1');
      expect(insertCall[1][1]).toBe('schema');
      expect(insertCall[1][2]).toBe('spec-1');
      expect(insertCall[1][3]).toBe('abc123');
      expect(insertCall[1][4]).toBe('1.0.0');
      expect(result.hash).toBe('abc123');
    });
  });

  describe('storeSpecManifests', () => {
    it('should use transaction for multiple manifests', async () => {
      // Mock client queries: BEGIN, INSERT, SELECT, INSERT, SELECT, COMMIT
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT 1
        .mockResolvedValueOnce({ rows: [{ network_id: 'net-1', spec_type: 'schema', spec_id: 's1', hash: 'h1', version: '1.0', created_at: 1000 }], rowCount: 1 }) // SELECT 1
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // INSERT 2
        .mockResolvedValueOnce({ rows: [{ network_id: 'net-1', spec_type: 'computation', spec_id: 's2', hash: 'h2', version: '1.0', created_at: 1000 }], rowCount: 1 }) // SELECT 2
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await repo.storeSpecManifests([
        { networkId: 'net-1', specType: 'schema', specId: 's1', hash: 'h1', version: '1.0' },
        { networkId: 'net-1', specType: 'computation', specId: 's2', hash: 'h2', version: '1.0' },
      ]);

      expect(result).toHaveLength(2);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(new Error('DB error')); // INSERT fails

      await expect(repo.storeSpecManifests([
        { networkId: 'net-1', specType: 'schema', specId: 's1', hash: 'h1', version: '1.0' },
      ])).rejects.toThrow('DB error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getSpecManifests', () => {
    it('should generate correct SELECT', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await repo.getSpecManifests('net-1');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM spec_manifests WHERE network_id = $1 ORDER BY spec_type ASC',
        ['net-1'],
      );
    });
  });

  describe('storeNetworkManifest', () => {
    it('should generate INSERT ON CONFLICT', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // INSERT
      mockQuery.mockResolvedValueOnce({
        rows: [{
          network_id: 'net-1', schema_hash: 'sh1', computation_hash: 'ch1',
          governance_hash: 'gh1', economic_hash: 'eh1', creator_node_id: 'node-1',
          signature: 'sig-1', created_at: 1000,
        }],
        rowCount: 1,
      }); // SELECT

      const result = await repo.storeNetworkManifest({
        networkId: 'net-1',
        schemaHash: 'sh1',
        computationHash: 'ch1',
        governanceHash: 'gh1',
        economicHash: 'eh1',
        creatorNodeId: 'node-1',
        signature: 'sig-1',
      });

      const insertCall = mockQuery.mock.calls[0];
      expect(insertCall[0]).toContain('INSERT INTO network_manifests');
      expect(insertCall[0]).toContain('ON CONFLICT (network_id)');
      expect(insertCall[1][0]).toBe('net-1');
      expect(insertCall[1][1]).toBe('sh1');
      expect(insertCall[1][6]).toBe('sig-1');
      expect(result.schema_hash).toBe('sh1');
    });

    it('should default signature to null', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
      mockQuery.mockResolvedValueOnce({
        rows: [{
          network_id: 'net-1', schema_hash: 'sh1', computation_hash: 'ch1',
          governance_hash: 'gh1', economic_hash: 'eh1', creator_node_id: 'node-1',
          signature: null, created_at: 1000,
        }],
        rowCount: 1,
      });

      await repo.storeNetworkManifest({
        networkId: 'net-1',
        schemaHash: 'sh1',
        computationHash: 'ch1',
        governanceHash: 'gh1',
        economicHash: 'eh1',
        creatorNodeId: 'node-1',
      });

      expect(mockQuery.mock.calls[0][1][6]).toBeNull();
    });
  });

  describe('getNetworkManifest', () => {
    it('should generate correct SELECT', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await repo.getNetworkManifest('net-1');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM network_manifests WHERE network_id = $1',
        ['net-1'],
      );
      expect(result).toBeUndefined();
    });
  });
});
