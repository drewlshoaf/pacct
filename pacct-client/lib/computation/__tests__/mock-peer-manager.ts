/**
 * Mock PeerManager for testing the orchestration layer.
 */

import type { PeerConnection } from '../../transport/peer-connection';
import type { OrchestratablePeerManager } from '../network-run-orchestrator';

export class MockPeerConnection {
  public sentMessages: string[] = [];
  public closed = false;

  constructor(public readonly peerId: string) {}

  send(data: string | ArrayBuffer): void {
    if (this.closed) throw new Error(`Connection to ${this.peerId} is closed`);
    this.sentMessages.push(typeof data === 'string' ? data : '');
  }

  close(): void {
    this.closed = true;
  }

  get isOpen(): boolean {
    return !this.closed;
  }

  onMessage(_handler: (data: string | ArrayBuffer) => void): void {
    // No-op in mock; messages injected via MockPeerManager.simulateMessage
  }

  onClose(_handler: () => void): void {
    // No-op in mock
  }
}

export class MockPeerManager implements OrchestratablePeerManager {
  private connectedPeers = new Map<string, MockPeerConnection>();
  private messageHandlers: ((peerNodeId: string, data: ArrayBuffer | string) => void)[] = [];
  private disconnectHandlers: ((peerNodeId: string) => void)[] = [];

  addPeer(peerId: string): MockPeerConnection {
    const conn = new MockPeerConnection(peerId);
    this.connectedPeers.set(peerId, conn);
    return conn;
  }

  removePeer(peerId: string): void {
    this.connectedPeers.delete(peerId);
  }

  simulateMessage(fromPeerId: string, message: object): void {
    const data = JSON.stringify(message);
    for (const handler of this.messageHandlers) {
      handler(fromPeerId, data);
    }
  }

  simulateDisconnect(peerId: string): void {
    this.connectedPeers.delete(peerId);
    for (const handler of this.disconnectHandlers) {
      handler(peerId);
    }
  }

  getSentMessages(peerId: string): object[] {
    const conn = this.connectedPeers.get(peerId);
    if (!conn) return [];
    return conn.sentMessages.map((s) => JSON.parse(s));
  }

  getAllSentMessages(): { peerId: string; message: object }[] {
    const result: { peerId: string; message: object }[] = [];
    for (const [peerId, conn] of this.connectedPeers) {
      for (const raw of conn.sentMessages) {
        result.push({ peerId, message: JSON.parse(raw) });
      }
    }
    return result;
  }

  // OrchestratablePeerManager interface
  getConnectedPeers(): Map<string, PeerConnection> {
    return this.connectedPeers as unknown as Map<string, PeerConnection>;
  }

  onPeerMessage(handler: (peerNodeId: string, data: ArrayBuffer | string) => void): void {
    this.messageHandlers.push(handler);
  }

  onPeerDisconnected(handler: (peerNodeId: string) => void): void {
    this.disconnectHandlers.push(handler);
  }
}
