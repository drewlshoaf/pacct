import { describe, it, expect } from 'vitest';
import { generateKeypair, signData, verifySignature, hashSpec } from '../../identity/keypair';

describe('Integrity Violations - Hash and Signature', () => {
  it('detects wrong hash when spec data changes after hash computed', async () => {
    const spec = { specId: 'test', version: '1.0.0', name: 'Original' };
    const originalHash = await hashSpec(spec);

    const modifiedSpec = { specId: 'test', version: '1.0.0', name: 'Tampered' };
    const modifiedHash = await hashSpec(modifiedSpec);

    expect(originalHash).not.toBe(modifiedHash);
  });

  it('detects tampered spec data fails hash check', async () => {
    const spec = { specId: 'test', version: '1.0.0', fields: ['a', 'b'] };
    const expectedHash = await hashSpec(spec);

    const tamperedSpec = { specId: 'test', version: '1.0.0', fields: ['a', 'c'] };
    const tamperedHash = await hashSpec(tamperedSpec);

    expect(tamperedHash).not.toBe(expectedHash);
  });

  it('network manifest with mismatched spec hashes is detectable', async () => {
    const schemaSpec = { specId: 'schema-1', version: '1.0.0', name: 'Schema' };
    const schemaHash = await hashSpec(schemaSpec);

    // Simulate a manifest that was created with a different version of the spec
    const modifiedSchemaSpec = { specId: 'schema-1', version: '1.0.1', name: 'Schema' };
    const recomputedHash = await hashSpec(modifiedSchemaSpec);

    expect(schemaHash).not.toBe(recomputedHash);
  });

  it('verifies wrong public key fails signature check', async () => {
    const keypair1 = await generateKeypair();
    const keypair2 = await generateKeypair();

    const data = 'important protocol message';
    const signature = await signData(keypair1.privateKey, data);

    // Verify with wrong public key should fail
    const isValid = await verifySignature(keypair2.publicKey, data, signature);
    expect(isValid).toBe(false);
  });

  it('verifies empty signature fails verification', async () => {
    const keypair = await generateKeypair();
    const data = 'test data';

    const isValid = await verifySignature(keypair.publicKey, data, '');
    expect(isValid).toBe(false);
  });

  it('verifies signature on different data fails', async () => {
    const keypair = await generateKeypair();

    const data1 = 'original message';
    const data2 = 'different message';
    const signature = await signData(keypair.privateKey, data1);

    const isValid = await verifySignature(keypair.publicKey, data2, signature);
    expect(isValid).toBe(false);
  });

  it('valid signature passes verification', async () => {
    const keypair = await generateKeypair();
    const data = 'test data for signing';
    const signature = await signData(keypair.privateKey, data);

    const isValid = await verifySignature(keypair.publicKey, data, signature);
    expect(isValid).toBe(true);
  });
});
