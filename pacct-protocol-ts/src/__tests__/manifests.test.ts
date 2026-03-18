import { describe, it, expect } from 'vitest';
import type { SpecManifest, NetworkManifest, SpecType } from '../index';
import type { NodeId, NetworkId, SpecId, Hash, Timestamp } from '../index';

const nodeId = (s: string) => s as NodeId;
const networkId = (s: string) => s as NetworkId;
const specId = (s: string) => s as SpecId;
const hash = (s: string) => s as Hash;
const ts = Date.now() as Timestamp;

describe('SpecManifest', () => {
  it('can be constructed with all spec types', () => {
    const specTypes: SpecType[] = ['schema', 'computation', 'governance', 'economic'];

    for (const specType of specTypes) {
      const manifest: SpecManifest = {
        specId: specId(`spec-${specType}`),
        specType,
        hash: hash('sha256-abc123'),
        version: '1.0.0',
        createdAt: ts,
      };
      expect(manifest.specType).toBe(specType);
      expect(manifest.version).toBe('1.0.0');
    }
  });
});

describe('NetworkManifest', () => {
  it('can be constructed with all required fields', () => {
    const manifest: NetworkManifest = {
      networkId: networkId('net-1'),
      schemaManifestHash: hash('hash-schema'),
      computationManifestHash: hash('hash-computation'),
      governanceManifestHash: hash('hash-governance'),
      economicManifestHash: hash('hash-economic'),
      createdAt: ts,
      creatorNodeId: nodeId('node-1'),
      signature: 'sig-manifest',
    };

    expect(manifest.networkId).toBe('net-1');
    expect(manifest.creatorNodeId).toBe('node-1');
    expect(manifest.schemaManifestHash).toBe('hash-schema');
    expect(manifest.computationManifestHash).toBe('hash-computation');
    expect(manifest.governanceManifestHash).toBe('hash-governance');
    expect(manifest.economicManifestHash).toBe('hash-economic');
  });
});
