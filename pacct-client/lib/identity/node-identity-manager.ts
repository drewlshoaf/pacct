import type { NodeIdentity, NodeKeypair } from '@pacct/protocol-ts';
import type { StorageAdapter } from '../persistence/storage-adapter';
import { generateKeypair, signData, verifySignature } from './keypair';

const IDENTITY_KEY = 'node-identity';
const KEYPAIR_KEY = 'node-keypair';

export class NodeIdentityManager {
  private identity: NodeIdentity | null = null;
  private keypair: NodeKeypair | null = null;

  constructor(private storage: StorageAdapter) {}

  async initialize(): Promise<NodeIdentity> {
    const stored = await this.storage.get(KEYPAIR_KEY);
    if (stored) {
      this.keypair = JSON.parse(stored) as NodeKeypair;
      this.identity = {
        nodeId: this.keypair.nodeId,
        publicKey: this.keypair.publicKey,
        createdAt: this.keypair.createdAt,
      };
    } else {
      this.keypair = await generateKeypair();
      this.identity = {
        nodeId: this.keypair.nodeId,
        publicKey: this.keypair.publicKey,
        createdAt: this.keypair.createdAt,
      };
      await this.storage.set(KEYPAIR_KEY, JSON.stringify(this.keypair));
      await this.storage.set(IDENTITY_KEY, JSON.stringify(this.identity));
    }
    return this.identity;
  }

  getIdentity(): NodeIdentity {
    if (!this.identity) {
      throw new Error('NodeIdentityManager not initialized. Call initialize() first.');
    }
    return this.identity;
  }

  async sign(data: string): Promise<string> {
    if (!this.keypair) {
      throw new Error('NodeIdentityManager not initialized. Call initialize() first.');
    }
    return signData(this.keypair.privateKey, data);
  }

  async verify(publicKey: string, data: string, sig: string): Promise<boolean> {
    return verifySignature(publicKey, data, sig);
  }
}
