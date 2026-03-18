import { describe, it, expect } from 'vitest';
import {
  ProtocolMessageType,
  type ProtocolMessage,
  type JoinRequestMessage,
  type HeartbeatMessage,
  type SignalingMessage,
  type RunAbortMessage,
} from '../index';
import type { NodeId, NetworkId, RunId, Timestamp } from '../index';

// Helper to create branded types in tests
const nodeId = (s: string) => s as NodeId;
const networkId = (s: string) => s as NetworkId;
const runId = (s: string) => s as RunId;
const ts = Date.now() as Timestamp;

describe('ProtocolMessageType', () => {
  it('has all 15 message types', () => {
    const values = Object.values(ProtocolMessageType);
    expect(values).toHaveLength(15);
    expect(new Set(values).size).toBe(15);
  });

  it('has expected string values', () => {
    expect(ProtocolMessageType.JoinRequest).toBe('join_request');
    expect(ProtocolMessageType.JoinApproval).toBe('join_approval');
    expect(ProtocolMessageType.ContractReveal).toBe('contract_reveal');
    expect(ProtocolMessageType.Acceptance).toBe('acceptance');
    expect(ProtocolMessageType.Leave).toBe('leave');
    expect(ProtocolMessageType.ReAck).toBe('reack');
    expect(ProtocolMessageType.RunInitiate).toBe('run_initiate');
    expect(ProtocolMessageType.RunAbort).toBe('run_abort');
    expect(ProtocolMessageType.ExpulsionProposal).toBe('expulsion_proposal');
    expect(ProtocolMessageType.ExpulsionVote).toBe('expulsion_vote');
    expect(ProtocolMessageType.Heartbeat).toBe('heartbeat');
    expect(ProtocolMessageType.PresenceUpdate).toBe('presence_update');
    expect(ProtocolMessageType.DissolveProposal).toBe('dissolve_proposal');
    expect(ProtocolMessageType.DissolveVote).toBe('dissolve_vote');
    expect(ProtocolMessageType.Signaling).toBe('signaling');
  });
});

describe('Protocol message construction', () => {
  it('can construct a JoinRequestMessage', () => {
    const msg: JoinRequestMessage = {
      type: ProtocolMessageType.JoinRequest,
      networkId: networkId('net-1'),
      nodeId: nodeId('node-1'),
      timestamp: ts,
      signature: 'sig-abc',
    };
    expect(msg.type).toBe(ProtocolMessageType.JoinRequest);
    expect(msg.networkId).toBe('net-1');
  });

  it('can construct a HeartbeatMessage', () => {
    const msg: HeartbeatMessage = {
      type: ProtocolMessageType.Heartbeat,
      nodeId: nodeId('node-1'),
      networkId: networkId('net-1'),
      timestamp: ts,
    };
    expect(msg.type).toBe(ProtocolMessageType.Heartbeat);
  });

  it('can construct a SignalingMessage', () => {
    const msg: SignalingMessage = {
      type: ProtocolMessageType.Signaling,
      fromNodeId: nodeId('node-1'),
      toNodeId: nodeId('node-2'),
      networkId: networkId('net-1'),
      signalingType: 'offer',
      payload: { sdp: 'test-sdp' },
    };
    expect(msg.type).toBe(ProtocolMessageType.Signaling);
    expect(msg.signalingType).toBe('offer');
  });

  it('can construct a RunAbortMessage', () => {
    const msg: RunAbortMessage = {
      type: ProtocolMessageType.RunAbort,
      networkId: networkId('net-1'),
      runId: runId('run-1'),
      reason: 'timeout',
      timestamp: ts,
      signature: 'sig-xyz',
    };
    expect(msg.type).toBe(ProtocolMessageType.RunAbort);
    expect(msg.reason).toBe('timeout');
  });
});

describe('Discriminated union', () => {
  it('narrows types correctly based on type field', () => {
    const msg: ProtocolMessage = {
      type: ProtocolMessageType.JoinRequest,
      networkId: networkId('net-1'),
      nodeId: nodeId('node-1'),
      timestamp: ts,
      signature: 'sig',
    };

    if (msg.type === ProtocolMessageType.JoinRequest) {
      // TypeScript should narrow to JoinRequestMessage
      expect(msg.nodeId).toBe('node-1');
      expect(msg.signature).toBe('sig');
    }

    if (msg.type === ProtocolMessageType.Heartbeat) {
      // This branch should not execute
      expect.unreachable('Should not reach heartbeat branch');
    }
  });

  it('handles switch exhaustiveness', () => {
    const msg: ProtocolMessage = {
      type: ProtocolMessageType.Leave,
      networkId: networkId('net-1'),
      nodeId: nodeId('node-1'),
      timestamp: ts,
      signature: 'sig',
    };

    let handled = false;
    switch (msg.type) {
      case ProtocolMessageType.JoinRequest:
      case ProtocolMessageType.JoinApproval:
      case ProtocolMessageType.ContractReveal:
      case ProtocolMessageType.Acceptance:
      case ProtocolMessageType.Leave:
        handled = true;
        break;
      case ProtocolMessageType.ReAck:
      case ProtocolMessageType.RunInitiate:
      case ProtocolMessageType.RunAbort:
      case ProtocolMessageType.ExpulsionProposal:
      case ProtocolMessageType.ExpulsionVote:
      case ProtocolMessageType.Heartbeat:
      case ProtocolMessageType.PresenceUpdate:
      case ProtocolMessageType.DissolveProposal:
      case ProtocolMessageType.DissolveVote:
      case ProtocolMessageType.Signaling:
        break;
    }
    expect(handled).toBe(true);
  });
});
