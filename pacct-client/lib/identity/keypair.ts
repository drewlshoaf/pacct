import type { NodeId, Hash, NodeKeypair } from '@pacct/protocol-ts';

function getCrypto(): Crypto {
  if (typeof globalThis.crypto !== 'undefined') {
    return globalThis.crypto;
  }
  // Node.js fallback — use dynamic string to prevent webpack from resolving
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const moduleName = 'node:' + 'crypto';
  const { webcrypto } = require(moduleName);
  return webcrypto as unknown as Crypto;
}

const crypto = getCrypto();

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuf(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bufToBase64(buf: ArrayBuffer): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(buf).toString('base64');
  }
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function base64ToBuf(b64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(b64, 'base64'));
  }
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function generateKeypair(): Promise<NodeKeypair> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'Ed25519' },
    true,
    ['sign', 'verify'],
  );

  const publicKeyRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const privateKeyPkcs8 = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

  const publicKeyStr = bufToBase64(publicKeyRaw);
  const privateKeyStr = bufToBase64(privateKeyPkcs8);

  const nodeId = await deriveNodeId(publicKeyStr);

  return {
    nodeId,
    publicKey: publicKeyStr,
    privateKey: privateKeyStr,
    createdAt: Date.now(),
  };
}

export async function deriveNodeId(publicKey: string): Promise<NodeId> {
  const keyBytes = base64ToBuf(publicKey);
  const hashBuf = await crypto.subtle.digest('SHA-256', keyBytes as BufferSource);
  const hex = bufToHex(hashBuf);
  return hex.substring(0, 32) as NodeId;
}

export async function signData(privateKey: string, data: string): Promise<string> {
  const keyBuf = base64ToBuf(privateKey);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuf as BufferSource,
    { name: 'Ed25519' },
    false,
    ['sign'],
  );
  const encoder = new TextEncoder();
  const sigBuf = await crypto.subtle.sign('Ed25519', cryptoKey, encoder.encode(data));
  return bufToBase64(sigBuf);
}

export async function verifySignature(
  publicKey: string,
  data: string,
  signature: string,
): Promise<boolean> {
  const keyBuf = base64ToBuf(publicKey);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuf as BufferSource,
    { name: 'Ed25519' },
    false,
    ['verify'],
  );
  const encoder = new TextEncoder();
  const sigBuf = base64ToBuf(signature);
  return crypto.subtle.verify('Ed25519', cryptoKey, sigBuf as BufferSource, encoder.encode(data));
}

export async function hashSpec(spec: object): Promise<Hash> {
  const canonical = JSON.stringify(spec, Object.keys(spec).sort());
  const encoder = new TextEncoder();
  const hashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(canonical));
  return bufToHex(hashBuf) as Hash;
}
