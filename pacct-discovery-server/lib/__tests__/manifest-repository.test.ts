import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DiscoveryDatabase } from '../db/database';
import { NetworkRepository } from '../db/repositories/network-repository';
import { ManifestRepository } from '../db/repositories/manifest-repository';

describe('ManifestRepository', () => {
  let db: DiscoveryDatabase;
  let repo: ManifestRepository;

  beforeEach(() => {
    db = new DiscoveryDatabase(':memory:');
    new NetworkRepository(db).createNetwork({ id: 'net-1', alias: 'Test', creatorNodeId: 'node-1' });
    repo = new ManifestRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it('should store a spec manifest', () => {
    const manifest = repo.storeSpecManifest({
      networkId: 'net-1',
      specType: 'schema',
      specId: 'spec-1',
      hash: 'abc123',
      version: '1.0.0',
    });
    expect(manifest.spec_type).toBe('schema');
    expect(manifest.hash).toBe('abc123');
    expect(manifest.version).toBe('1.0.0');
  });

  it('should store multiple spec manifests', () => {
    const manifests = repo.storeSpecManifests([
      { networkId: 'net-1', specType: 'schema', specId: 'spec-1', hash: 'h1', version: '1.0.0' },
      { networkId: 'net-1', specType: 'computation', specId: 'spec-2', hash: 'h2', version: '1.0.0' },
      { networkId: 'net-1', specType: 'governance', specId: 'spec-3', hash: 'h3', version: '1.0.0' },
      { networkId: 'net-1', specType: 'economic', specId: 'spec-4', hash: 'h4', version: '1.0.0' },
    ]);
    expect(manifests).toHaveLength(4);
  });

  it('should get spec manifests for a network', () => {
    repo.storeSpecManifest({ networkId: 'net-1', specType: 'schema', specId: 's1', hash: 'h1', version: '1.0' });
    repo.storeSpecManifest({ networkId: 'net-1', specType: 'computation', specId: 's2', hash: 'h2', version: '1.0' });

    const manifests = repo.getSpecManifests('net-1');
    expect(manifests).toHaveLength(2);
  });

  it('should get a specific spec manifest', () => {
    repo.storeSpecManifest({ networkId: 'net-1', specType: 'schema', specId: 's1', hash: 'h1', version: '1.0' });
    const manifest = repo.getSpecManifest('net-1', 'schema');
    expect(manifest).toBeDefined();
    expect(manifest!.hash).toBe('h1');
  });

  it('should replace spec manifest on same type', () => {
    repo.storeSpecManifest({ networkId: 'net-1', specType: 'schema', specId: 's1', hash: 'old', version: '1.0' });
    repo.storeSpecManifest({ networkId: 'net-1', specType: 'schema', specId: 's1', hash: 'new', version: '2.0' });
    const manifest = repo.getSpecManifest('net-1', 'schema');
    expect(manifest!.hash).toBe('new');
    expect(manifest!.version).toBe('2.0');
  });

  it('should store a network manifest', () => {
    const manifest = repo.storeNetworkManifest({
      networkId: 'net-1',
      schemaHash: 'sh1',
      computationHash: 'ch1',
      governanceHash: 'gh1',
      economicHash: 'eh1',
      creatorNodeId: 'node-1',
      signature: 'sig-1',
    });
    expect(manifest.schema_hash).toBe('sh1');
    expect(manifest.computation_hash).toBe('ch1');
    expect(manifest.signature).toBe('sig-1');
  });

  it('should get a network manifest', () => {
    repo.storeNetworkManifest({
      networkId: 'net-1',
      schemaHash: 'sh1',
      computationHash: 'ch1',
      governanceHash: 'gh1',
      economicHash: 'eh1',
      creatorNodeId: 'node-1',
    });
    const manifest = repo.getNetworkManifest('net-1');
    expect(manifest).toBeDefined();
    expect(manifest!.economic_hash).toBe('eh1');
  });

  it('should return undefined for non-existent manifest', () => {
    const manifest = repo.getNetworkManifest('non-existent');
    expect(manifest).toBeUndefined();
  });
});
