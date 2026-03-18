import { describe, it, expect } from 'vitest';
import { ProtocolMessageType } from '@pacct/protocol-ts';
import type { NodeId, NetworkId, ProtocolMessage } from '@pacct/protocol-ts';

/**
 * Since the protocol uses TypeScript interfaces (not runtime validators),
 * we test that our own validation logic properly handles malformed messages.
 * We test duck-typing checks that real handlers would perform.
 */

function isValidProtocolMessage(msg: unknown): { valid: boolean; error?: string } {
  if (msg === null || msg === undefined) {
    return { valid: false, error: 'Message is null or undefined' };
  }
  if (typeof msg === 'string') {
    try {
      JSON.parse(msg);
    } catch {
      return { valid: false, error: 'Message is not valid JSON' };
    }
    return { valid: false, error: 'Message must be an object, not a string' };
  }
  if (typeof msg !== 'object') {
    return { valid: false, error: 'Message must be an object' };
  }

  const obj = msg as Record<string, unknown>;

  if (!('type' in obj) || typeof obj.type !== 'string') {
    return { valid: false, error: 'Message missing type field' };
  }

  const validTypes = Object.values(ProtocolMessageType);
  if (!validTypes.includes(obj.type as ProtocolMessageType)) {
    return { valid: false, error: `Unknown message type: ${obj.type}` };
  }

  if (obj.type === ProtocolMessageType.JoinRequest) {
    if (!obj.nodeId || (typeof obj.nodeId === 'string' && obj.nodeId.length === 0)) {
      return { valid: false, error: 'JoinRequest has empty nodeId' };
    }
    if (!obj.networkId || (typeof obj.networkId === 'string' && obj.networkId.length === 0)) {
      return { valid: false, error: 'JoinRequest has missing networkId' };
    }
  }

  if (obj.type === ProtocolMessageType.JoinApproval) {
    if (obj.vote !== 'approve' && obj.vote !== 'reject') {
      return { valid: false, error: `Invalid vote value: ${obj.vote}` };
    }
  }

  if ('timestamp' in obj && typeof obj.timestamp === 'number') {
    if (obj.timestamp < 0) {
      return { valid: false, error: 'Negative timestamp' };
    }
    const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;
    if (obj.timestamp > fiveMinutesFromNow) {
      return { valid: false, error: 'Timestamp is in the future (clock skew)' };
    }
  }

  return { valid: true };
}

describe('Malformed Protocol Messages', () => {
  it('rejects message with missing type field', () => {
    const result = isValidProtocolMessage({
      networkId: 'net-1',
      nodeId: 'node-1',
      timestamp: Date.now(),
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Message missing type field');
  });

  it('rejects message with unknown type', () => {
    const result = isValidProtocolMessage({
      type: 'foobar_unknown',
      networkId: 'net-1',
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Unknown message type');
  });

  it('rejects JoinRequest with empty nodeId', () => {
    const result = isValidProtocolMessage({
      type: ProtocolMessageType.JoinRequest,
      networkId: 'net-1',
      nodeId: '',
      timestamp: Date.now(),
      signature: 'sig',
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('empty nodeId');
  });

  it('rejects JoinRequest with missing networkId', () => {
    const result = isValidProtocolMessage({
      type: ProtocolMessageType.JoinRequest,
      nodeId: 'node-1',
      timestamp: Date.now(),
      signature: 'sig',
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('missing networkId');
  });

  it('rejects ApprovalVote with invalid vote value', () => {
    const result = isValidProtocolMessage({
      type: ProtocolMessageType.JoinApproval,
      networkId: 'net-1',
      applicantNodeId: 'node-2',
      voterNodeId: 'node-1',
      vote: 'maybe',
      timestamp: Date.now(),
      signature: 'sig',
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid vote value');
  });

  it('rejects message with future timestamp (clock skew)', () => {
    const result = isValidProtocolMessage({
      type: ProtocolMessageType.Heartbeat,
      nodeId: 'node-1',
      networkId: 'net-1',
      timestamp: Date.now() + 10 * 60 * 1000, // 10 minutes in future
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('future');
  });

  it('rejects message with negative timestamp', () => {
    const result = isValidProtocolMessage({
      type: ProtocolMessageType.Heartbeat,
      nodeId: 'node-1',
      networkId: 'net-1',
      timestamp: -1000,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Negative timestamp');
  });

  it('rejects empty message body', () => {
    const result = isValidProtocolMessage({});
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Message missing type field');
  });

  it('rejects non-JSON message string', () => {
    const result = isValidProtocolMessage('this is not json {{{');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Message is not valid JSON');
  });

  it('rejects null message', () => {
    const result = isValidProtocolMessage(null);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Message is null or undefined');
  });

  it('rejects undefined message', () => {
    const result = isValidProtocolMessage(undefined);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Message is null or undefined');
  });
});
