import { describe, it, expect, beforeEach } from 'vitest';
import { NodeIdentityManager } from '../node-identity-manager';
import { MemoryAdapter } from '../../persistence/memory-adapter';
import { verifySignature } from '../keypair';

describe('NodeIdentityManager', () => {
  let storage: MemoryAdapter;

  beforeEach(() => {
    storage = new MemoryAdapter();
  });

  it('initialize creates new identity when none exists', async () => {
    const mgr = new NodeIdentityManager(storage);
    const identity = await mgr.initialize();

    expect(identity.nodeId).toBeDefined();
    expect(identity.nodeId.length).toBe(32);
    expect(identity.publicKey).toBeDefined();
    expect(identity.createdAt).toBeGreaterThan(0);
  });

  it('initialize loads existing identity on second call', async () => {
    const mgr1 = new NodeIdentityManager(storage);
    const identity1 = await mgr1.initialize();

    const mgr2 = new NodeIdentityManager(storage);
    const identity2 = await mgr2.initialize();

    expect(identity2.nodeId).toBe(identity1.nodeId);
    expect(identity2.publicKey).toBe(identity1.publicKey);
  });

  it('getIdentity throws if not initialized', () => {
    const mgr = new NodeIdentityManager(storage);
    expect(() => mgr.getIdentity()).toThrow('not initialized');
  });

  it('getIdentity returns identity after initialization', async () => {
    const mgr = new NodeIdentityManager(storage);
    const init = await mgr.initialize();
    expect(mgr.getIdentity()).toEqual(init);
  });

  it('sign produces valid signatures', async () => {
    const mgr = new NodeIdentityManager(storage);
    await mgr.initialize();
    const identity = mgr.getIdentity();

    const data = 'test message';
    const sig = await mgr.sign(data);

    const valid = await verifySignature(identity.publicKey, data, sig);
    expect(valid).toBe(true);
  });

  it('verify delegates correctly', async () => {
    const mgr = new NodeIdentityManager(storage);
    await mgr.initialize();
    const identity = mgr.getIdentity();

    const data = 'verify test';
    const sig = await mgr.sign(data);

    expect(await mgr.verify(identity.publicKey, data, sig)).toBe(true);
    expect(await mgr.verify(identity.publicKey, 'wrong', sig)).toBe(false);
  });
});
