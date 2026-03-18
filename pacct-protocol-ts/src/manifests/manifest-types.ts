import type { SpecId, NetworkId, NodeId, Hash, Timestamp } from '../types';

export type SpecType = 'schema' | 'computation' | 'governance' | 'economic';

export interface SpecManifest {
  specId: SpecId;
  specType: SpecType;
  hash: Hash;
  version: string;
  createdAt: Timestamp;
}

export interface NetworkManifest {
  networkId: NetworkId;
  schemaManifestHash: Hash;
  computationManifestHash: Hash;
  governanceManifestHash: Hash;
  economicManifestHash: Hash;
  createdAt: Timestamp;
  creatorNodeId: NodeId;
  signature: string;
}
