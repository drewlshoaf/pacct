import { describe, it, expect } from 'vitest';
import { PROTOCOL_VERSION, SPEC_VERSION, MANIFEST_VERSION } from '../index';
import type { NodeId, NetworkId, RunId, SpecId, Hash, Timestamp, Vote } from '../index';

describe('Branded types', () => {
  it('NodeId accepts string values via cast', () => {
    const id = 'node-abc-123' as NodeId;
    // At runtime it is still a string
    expect(typeof id).toBe('string');
    expect(id).toBe('node-abc-123');
  });

  it('NetworkId accepts string values via cast', () => {
    const id = 'net-xyz' as NetworkId;
    expect(typeof id).toBe('string');
    expect(id).toBe('net-xyz');
  });

  it('RunId accepts string values via cast', () => {
    const id = 'run-001' as RunId;
    expect(typeof id).toBe('string');
  });

  it('SpecId accepts string values via cast', () => {
    const id = 'spec-schema-v1' as SpecId;
    expect(typeof id).toBe('string');
  });

  it('Hash accepts string values via cast', () => {
    const h = 'sha256-abcdef1234567890' as Hash;
    expect(typeof h).toBe('string');
  });

  it('Timestamp is a number', () => {
    const t: Timestamp = Date.now();
    expect(typeof t).toBe('number');
  });

  it('Vote is a string literal union', () => {
    const approve: Vote = 'approve';
    const reject: Vote = 'reject';
    expect(approve).toBe('approve');
    expect(reject).toBe('reject');
  });
});

describe('Version constants', () => {
  it('exports PROTOCOL_VERSION', () => {
    expect(PROTOCOL_VERSION).toBe('1.0.0');
  });

  it('exports SPEC_VERSION', () => {
    expect(SPEC_VERSION).toBe('1.0.0');
  });

  it('exports MANIFEST_VERSION', () => {
    expect(MANIFEST_VERSION).toBe('1.0.0');
  });
});
