import { describe, it, expect } from 'vitest';
import {
  generateKeypair,
  deriveNodeId,
  signData,
  verifySignature,
  hashSpec,
} from '../keypair';

describe('generateKeypair', () => {
  it('produces a valid keypair with nodeId, publicKey, and privateKey', async () => {
    const kp = await generateKeypair();
    expect(kp.nodeId).toBeDefined();
    expect(typeof kp.nodeId).toBe('string');
    expect(kp.nodeId.length).toBe(32);
    expect(kp.publicKey).toBeDefined();
    expect(kp.privateKey).toBeDefined();
    expect(kp.createdAt).toBeGreaterThan(0);
  });

  it('generates unique keypairs each time', async () => {
    const kp1 = await generateKeypair();
    const kp2 = await generateKeypair();
    expect(kp1.nodeId).not.toBe(kp2.nodeId);
    expect(kp1.publicKey).not.toBe(kp2.publicKey);
  });
});

describe('deriveNodeId', () => {
  it('is deterministic for the same public key', async () => {
    const kp = await generateKeypair();
    const id1 = await deriveNodeId(kp.publicKey);
    const id2 = await deriveNodeId(kp.publicKey);
    expect(id1).toBe(id2);
  });

  it('returns a 32-character hex string', async () => {
    const kp = await generateKeypair();
    const id = await deriveNodeId(kp.publicKey);
    expect(id).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe('signData / verifySignature', () => {
  it('round-trip: sign then verify succeeds', async () => {
    const kp = await generateKeypair();
    const data = 'hello world';
    const sig = await signData(kp.privateKey, data);
    const valid = await verifySignature(kp.publicKey, data, sig);
    expect(valid).toBe(true);
  });

  it('verify rejects tampered data', async () => {
    const kp = await generateKeypair();
    const sig = await signData(kp.privateKey, 'original');
    const valid = await verifySignature(kp.publicKey, 'tampered', sig);
    expect(valid).toBe(false);
  });

  it('verify rejects wrong public key', async () => {
    const kp1 = await generateKeypair();
    const kp2 = await generateKeypair();
    const data = 'test data';
    const sig = await signData(kp1.privateKey, data);
    const valid = await verifySignature(kp2.publicKey, data, sig);
    expect(valid).toBe(false);
  });
});

describe('hashSpec', () => {
  it('is deterministic for the same object', async () => {
    const spec = { name: 'test', version: 1 };
    const h1 = await hashSpec(spec);
    const h2 = await hashSpec(spec);
    expect(h1).toBe(h2);
  });

  it('returns a 64-character hex string (SHA-256)', async () => {
    const h = await hashSpec({ foo: 'bar' });
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces different hashes for different specs', async () => {
    const h1 = await hashSpec({ a: 1 });
    const h2 = await hashSpec({ a: 2 });
    expect(h1).not.toBe(h2);
  });
});
