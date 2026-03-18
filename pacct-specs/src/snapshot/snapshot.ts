import { createHash } from 'node:crypto';
import { SpecLifecycle } from '@pacct/protocol-ts';
import type {
  NetworkId,
  NodeId,
  Hash,
  SpecManifest,
  NetworkManifest,
  SpecType,
} from '@pacct/protocol-ts';
import type { SchemaSpec } from '../schema/types';
import type { ComputationSpec } from '../computation/types';
import type { GovernanceSpec } from '../governance/types';
import type { EconomicSpec } from '../economic/types';
import type { NetworkSnapshot } from './types';

function canonicalJson(obj: unknown): string {
  return JSON.stringify(obj, Object.keys(obj as Record<string, unknown>).sort());
}

function deepCanonicalJson(obj: unknown): string {
  if (obj === null || obj === undefined) return JSON.stringify(obj);
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(item => deepCanonicalJson(item)).join(',') + ']';
  }
  const sorted = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = sorted.map(key => {
    const val = (obj as Record<string, unknown>)[key];
    return JSON.stringify(key) + ':' + deepCanonicalJson(val);
  });
  return '{' + pairs.join(',') + '}';
}

async function sha256(data: string): Promise<Hash> {
  const hash = createHash('sha256').update(data, 'utf-8').digest('hex');
  return hash as Hash;
}

function createSpecManifest(
  spec: { specId: string; version: string; createdAt: number },
  specType: SpecType,
  hash: Hash,
): SpecManifest {
  return {
    specId: spec.specId as import('@pacct/protocol-ts').SpecId,
    specType,
    hash,
    version: spec.version,
    createdAt: spec.createdAt,
  };
}

export async function createNetworkSnapshot(
  schemaSpec: SchemaSpec,
  computationSpec: ComputationSpec,
  governanceSpec: GovernanceSpec,
  economicSpec: EconomicSpec,
  networkId: NetworkId,
  creatorNodeId: NodeId,
): Promise<NetworkSnapshot> {
  const now = Date.now();

  // Set lifecycle to network_snapshot
  const snapshotSchema: SchemaSpec = { ...schemaSpec, lifecycle: SpecLifecycle.NetworkSnapshot };
  const snapshotComputation: ComputationSpec = { ...computationSpec, lifecycle: SpecLifecycle.NetworkSnapshot };
  const snapshotGovernance: GovernanceSpec = { ...governanceSpec, lifecycle: SpecLifecycle.NetworkSnapshot };
  const snapshotEconomic: EconomicSpec = { ...economicSpec, lifecycle: SpecLifecycle.NetworkSnapshot };

  // Compute hashes
  const [schemaHash, computationHash, governanceHash, economicHash] = await Promise.all([
    sha256(deepCanonicalJson(snapshotSchema)),
    sha256(deepCanonicalJson(snapshotComputation)),
    sha256(deepCanonicalJson(snapshotGovernance)),
    sha256(deepCanonicalJson(snapshotEconomic)),
  ]);

  // Create spec manifests
  const schemaManifest = createSpecManifest(snapshotSchema, 'schema', schemaHash);
  const computationManifest = createSpecManifest(snapshotComputation, 'computation', computationHash);
  const governanceManifest = createSpecManifest(snapshotGovernance, 'governance', governanceHash);
  const economicManifest = createSpecManifest(snapshotEconomic, 'economic', economicHash);

  // Create network manifest
  const networkManifest: NetworkManifest = {
    networkId,
    schemaManifestHash: schemaHash,
    computationManifestHash: computationHash,
    governanceManifestHash: governanceHash,
    economicManifestHash: economicHash,
    createdAt: now,
    creatorNodeId,
    signature: '', // Signature would be set by the signing layer
  };

  return {
    networkId,
    schemaSpec: snapshotSchema,
    computationSpec: snapshotComputation,
    governanceSpec: snapshotGovernance,
    economicSpec: snapshotEconomic,
    specManifests: {
      schema: schemaManifest,
      computation: computationManifest,
      governance: governanceManifest,
      economic: economicManifest,
    },
    networkManifest,
    createdAt: now,
  };
}
