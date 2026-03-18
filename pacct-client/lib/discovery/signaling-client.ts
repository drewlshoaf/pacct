import type { NodeId, NetworkId, ProtocolMessage } from '@pacct/protocol-ts';
import { ProtocolMessageType } from '@pacct/protocol-ts';

type MessageHandler = (msg: ProtocolMessage) => void;
type VoidHandler = () => void;

const INITIAL_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 30000;
const RECONNECT_BACKOFF = 2;

export class SignalingClient {
  private ws: WebSocket | null = null;
  private messageHandlers: MessageHandler[] = [];
  private disconnectHandlers: VoidHandler[] = [];
  private reconnectHandlers: VoidHandler[] = [];
  private reconnectDelay = INITIAL_RECONNECT_MS;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;

  constructor(
    private wsUrl: string,
    private nodeId: NodeId,
  ) {}

  connect(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.shouldReconnect = true;
      try {
        this.ws = new WebSocket(this.wsUrl);
      } catch (err) {
        reject(err);
        return;
      }

      this.ws.onopen = () => {
        this.reconnectDelay = INITIAL_RECONNECT_MS;
        resolve();
      };

      this.ws.onerror = (event: Event) => {
        reject(new Error('WebSocket connection error'));
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(
            typeof event.data === 'string' ? event.data : '',
          ) as ProtocolMessage;
          for (const handler of this.messageHandlers) {
            handler(msg);
          }
        } catch {
          // Ignore malformed messages
        }
      };

      this.ws.onclose = () => {
        for (const handler of this.disconnectHandlers) {
          handler();
        }
        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      };
    });
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  sendOffer(toNodeId: NodeId, networkId: NetworkId, sdp: string): void {
    this.send({
      type: ProtocolMessageType.Signaling,
      fromNodeId: this.nodeId,
      toNodeId,
      networkId,
      signalingType: 'offer',
      payload: sdp,
    });
  }

  sendAnswer(toNodeId: NodeId, networkId: NetworkId, sdp: string): void {
    this.send({
      type: ProtocolMessageType.Signaling,
      fromNodeId: this.nodeId,
      toNodeId,
      networkId,
      signalingType: 'answer',
      payload: sdp,
    });
  }

  sendIceCandidate(
    toNodeId: NodeId,
    networkId: NetworkId,
    candidate: string,
  ): void {
    this.send({
      type: ProtocolMessageType.Signaling,
      fromNodeId: this.nodeId,
      toNodeId,
      networkId,
      signalingType: 'candidate',
      payload: candidate,
    });
  }

  sendHeartbeat(networkId: NetworkId): void {
    this.send({
      type: ProtocolMessageType.Heartbeat,
      nodeId: this.nodeId,
      networkId,
      timestamp: Date.now(),
    });
  }

  onMessage(handler: MessageHandler): void {
    this.messageHandlers.push(handler);
  }

  onDisconnect(handler: VoidHandler): void {
    this.disconnectHandlers.push(handler);
  }

  onReconnect(handler: VoidHandler): void {
    this.reconnectHandlers.push(handler);
  }

  private send(msg: ProtocolMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }
    this.ws.send(JSON.stringify(msg));
  }

  private scheduleReconnect(): void {
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
        for (const handler of this.reconnectHandlers) {
          handler();
        }
      } catch {
        this.reconnectDelay = Math.min(
          this.reconnectDelay * RECONNECT_BACKOFF,
          MAX_RECONNECT_MS,
        );
        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      }
    }, this.reconnectDelay);
  }
}
