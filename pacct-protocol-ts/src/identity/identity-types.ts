import type { NodeId, Timestamp } from '../types';

export interface NodeIdentity {
  nodeId: NodeId;
  publicKey: string;
  createdAt: Timestamp;
}

export interface NodeKeypair {
  nodeId: NodeId;
  publicKey: string;
  privateKey: string;
  createdAt: Timestamp;
}

export interface Signature {
  nodeId: NodeId;
  data: string;
  signature: string;
  timestamp: Timestamp;
}
