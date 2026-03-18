import type { NodeId, NetworkId, ProtocolMessage } from '@pacct/protocol-ts';
import { ProtocolMessageType } from '@pacct/protocol-ts';
import type { SignalingClient } from '../discovery/signaling-client';
import { PeerConnection } from './peer-connection';
import type { IRTCDataChannel } from './peer-connection';

type PeerHandler = (peerNodeId: NodeId) => void;
type PeerMessageHandler = (peerNodeId: NodeId, data: ArrayBuffer | string) => void;

export class PeerManager {
  private peers = new Map<string, PeerConnection>();
  private connectedHandlers: PeerHandler[] = [];
  private disconnectedHandlers: PeerHandler[] = [];
  private messageHandlers: PeerMessageHandler[] = [];

  constructor(
    private signalingClient: SignalingClient,
    private nodeId: NodeId,
  ) {
    // Listen for incoming signaling messages
    this.signalingClient.onMessage((msg: ProtocolMessage) => {
      if (msg.type === ProtocolMessageType.Signaling && msg.toNodeId === this.nodeId) {
        if (msg.signalingType === 'offer') {
          this.acceptConnection(msg.fromNodeId, msg.payload as string, msg.networkId);
        }
      }
    });
  }

  async connectToPeer(
    peerNodeId: NodeId,
    networkId: NetworkId,
  ): Promise<PeerConnection> {
    // Create RTCPeerConnection and data channel (browser API)
    const rtc = new RTCPeerConnection();
    const dc = rtc.createDataChannel('pacct');

    const offer = await rtc.createOffer();
    await rtc.setLocalDescription(offer);

    // Send offer via signaling
    this.signalingClient.sendOffer(peerNodeId, networkId, JSON.stringify(offer));

    // Wait for answer via signaling
    return new Promise<PeerConnection>((resolve) => {
      const handler = (msg: ProtocolMessage) => {
        if (
          msg.type === ProtocolMessageType.Signaling &&
          msg.fromNodeId === peerNodeId &&
          msg.signalingType === 'answer'
        ) {
          const answer = JSON.parse(msg.payload as string);
          rtc.setRemoteDescription(answer);
        }
        if (
          msg.type === ProtocolMessageType.Signaling &&
          msg.fromNodeId === peerNodeId &&
          msg.signalingType === 'candidate'
        ) {
          rtc.addIceCandidate(JSON.parse(msg.payload as string));
        }
      };
      this.signalingClient.onMessage(handler);

      rtc.onicecandidate = (event) => {
        if (event.candidate) {
          this.signalingClient.sendIceCandidate(
            peerNodeId,
            networkId,
            JSON.stringify(event.candidate),
          );
        }
      };

      dc.onopen = () => {
        const conn = new PeerConnection(peerNodeId, rtc, dc as unknown as IRTCDataChannel);
        this.registerPeer(peerNodeId, conn);
        resolve(conn);
      };
    });
  }

  async acceptConnection(
    peerNodeId: NodeId,
    offer: string,
    networkId: NetworkId,
  ): Promise<PeerConnection> {
    const rtc = new RTCPeerConnection();

    await rtc.setRemoteDescription(JSON.parse(offer));
    const answer = await rtc.createAnswer();
    await rtc.setLocalDescription(answer);

    this.signalingClient.sendAnswer(peerNodeId, networkId, JSON.stringify(answer));

    rtc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signalingClient.sendIceCandidate(
          peerNodeId,
          networkId,
          JSON.stringify(event.candidate),
        );
      }
    };

    return new Promise<PeerConnection>((resolve) => {
      rtc.ondatachannel = (event) => {
        const dc = event.channel;
        dc.onopen = () => {
          const conn = new PeerConnection(peerNodeId, rtc, dc as unknown as IRTCDataChannel);
          this.registerPeer(peerNodeId, conn);
          resolve(conn);
        };
      };

      // Also listen for ICE candidates from signaling
      this.signalingClient.onMessage((msg: ProtocolMessage) => {
        if (
          msg.type === ProtocolMessageType.Signaling &&
          msg.fromNodeId === peerNodeId &&
          msg.signalingType === 'candidate'
        ) {
          rtc.addIceCandidate(JSON.parse(msg.payload as string));
        }
      });
    });
  }

  getConnectedPeers(): Map<string, PeerConnection> {
    return new Map(this.peers);
  }

  disconnectPeer(peerNodeId: NodeId): void {
    const conn = this.peers.get(peerNodeId);
    if (conn) {
      conn.close();
      this.peers.delete(peerNodeId);
      for (const handler of this.disconnectedHandlers) {
        handler(peerNodeId);
      }
    }
  }

  disconnectAll(): void {
    for (const [id, conn] of this.peers) {
      conn.close();
    }
    const peerIds = Array.from(this.peers.keys());
    this.peers.clear();
    for (const id of peerIds) {
      for (const handler of this.disconnectedHandlers) {
        handler(id as NodeId);
      }
    }
  }

  onPeerConnected(handler: PeerHandler): void {
    this.connectedHandlers.push(handler);
  }

  onPeerDisconnected(handler: PeerHandler): void {
    this.disconnectedHandlers.push(handler);
  }

  onPeerMessage(handler: PeerMessageHandler): void {
    this.messageHandlers.push(handler);
  }

  private registerPeer(peerNodeId: NodeId, conn: PeerConnection): void {
    this.peers.set(peerNodeId, conn);

    conn.onMessage((data) => {
      for (const handler of this.messageHandlers) {
        handler(peerNodeId, data);
      }
    });

    conn.onClose(() => {
      this.peers.delete(peerNodeId);
      for (const handler of this.disconnectedHandlers) {
        handler(peerNodeId);
      }
    });

    for (const handler of this.connectedHandlers) {
      handler(peerNodeId);
    }
  }
}
