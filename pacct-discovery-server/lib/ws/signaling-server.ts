import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import { getLeaseEngine } from '../presence/instance';

interface ConnectedClient {
  ws: WebSocket;
  nodeId: string;
  networkIds: Set<string>;
}

interface SignalingMessagePayload {
  type: string;
  networkId?: string;
  nodeId?: string;
  fromNodeId?: string;
  toNodeId?: string;
  signalingType?: string;
  payload?: unknown;
  online?: boolean;
  vote?: string;
  applicantNodeId?: string;
  [key: string]: unknown;
}

export class SignalingServer {
  private wss: WebSocketServer;
  // In-memory WebSocket map for routing messages on THIS instance only.
  // This is NOT the source of truth for presence — the DB lease is.
  private clients: Map<string, ConnectedClient> = new Map();

  constructor(options?: { port?: number; server?: unknown }) {
    if (options?.server) {
      this.wss = new WebSocketServer({ noServer: true });
    } else {
      this.wss = new WebSocketServer({ port: options?.port ?? 3001 });
    }

    this.wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
      this.handleConnection(ws, request);
    });
  }

  get webSocketServer(): WebSocketServer {
    return this.wss;
  }

  handleUpgrade(request: IncomingMessage, socket: unknown, head: Buffer): void {
    this.wss.handleUpgrade(request, socket as any, head, (ws) => {
      this.wss.emit('connection', ws, request);
    });
  }

  private handleConnection(ws: WebSocket, request: IncomingMessage): void {
    const url = new URL(request.url ?? '/', `http://${request.headers.host}`);
    const nodeId = url.searchParams.get('nodeId');

    if (!nodeId) {
      ws.close(4001, 'Missing nodeId parameter');
      return;
    }

    const client: ConnectedClient = { ws, nodeId, networkIds: new Set() };
    this.clients.set(nodeId, client);

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as SignalingMessagePayload;
        this.handleMessage(client, message);
      } catch {
        ws.send(JSON.stringify({ error: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      this.handleDisconnect(client);
    });

    ws.on('error', () => {
      this.handleDisconnect(client);
    });
  }

  private handleMessage(client: ConnectedClient, message: SignalingMessagePayload): void {
    switch (message.type) {
      case 'heartbeat':
        this.handleHeartbeat(client, message);
        break;
      case 'join_network':
        this.handleJoinNetwork(client, message);
        break;
      case 'leave_network':
        this.handleLeaveNetwork(client, message);
        break;
      case 'signaling':
        this.handleSignaling(client, message);
        break;
      case 'join_request':
        this.broadcastToNetwork(message.networkId!, message, client.nodeId);
        break;
      case 'join_approval':
        this.broadcastToNetwork(message.networkId!, message, client.nodeId);
        break;
      default:
        if (message.networkId) {
          this.broadcastToNetwork(message.networkId, message, client.nodeId);
        }
        break;
    }
  }

  private handleHeartbeat(client: ConnectedClient, message: SignalingMessagePayload): void {
    if (message.networkId) {
      client.networkIds.add(message.networkId);
      // Delegate to DB-backed LeaseEngine
      getLeaseEngine().processHeartbeat(message.networkId, client.nodeId)
        .then(result => {
          client.ws.send(JSON.stringify({
            type: 'heartbeat_ack',
            timestamp: Date.now(),
            leaseExpiresAt: result.leaseExpiresAt,
            instanceId: result.instanceId,
          }));
        })
        .catch(() => {
          // Best-effort: send ack even if DB write fails
          client.ws.send(JSON.stringify({ type: 'heartbeat_ack', timestamp: Date.now() }));
        });
    } else {
      client.ws.send(JSON.stringify({ type: 'heartbeat_ack', timestamp: Date.now() }));
    }
  }

  private handleJoinNetwork(client: ConnectedClient, message: SignalingMessagePayload): void {
    if (message.networkId) {
      client.networkIds.add(message.networkId);
      // Register presence via LeaseEngine
      getLeaseEngine().processHeartbeat(message.networkId, client.nodeId)
        .catch(() => { /* best-effort */ });
      this.broadcastToNetwork(message.networkId, {
        type: 'presence_update',
        networkId: message.networkId,
        nodeId: client.nodeId,
        online: true,
      }, client.nodeId);
    }
  }

  private handleLeaveNetwork(client: ConnectedClient, message: SignalingMessagePayload): void {
    if (message.networkId) {
      client.networkIds.delete(message.networkId);
      // Do NOT mark offline in DB — let the lease expire naturally.
      // The node may be connected to another instance.
      this.broadcastToNetwork(message.networkId, {
        type: 'presence_update',
        networkId: message.networkId,
        nodeId: client.nodeId,
        online: false,
      }, client.nodeId);
    }
  }

  private handleSignaling(client: ConnectedClient, message: SignalingMessagePayload): void {
    if (message.toNodeId) {
      const target = this.clients.get(message.toNodeId);
      if (target && target.ws.readyState === WebSocket.OPEN) {
        target.ws.send(JSON.stringify({
          ...message,
          fromNodeId: client.nodeId,
        }));
      }
      // If target isn't connected to this instance, the message is dropped.
      // In a future enhancement, instances could communicate via a shared bus.
    }
  }

  private handleDisconnect(client: ConnectedClient): void {
    // Do NOT immediately mark offline in the DB — let the lease expire naturally.
    // This is the correct behavior for multi-instance: a node might be connected
    // to a different instance and still heartbeating there.
    //
    // Broadcast disconnect to locally-connected peers for immediate UI feedback.
    for (const networkId of client.networkIds) {
      this.broadcastToNetwork(networkId, {
        type: 'presence_update',
        networkId,
        nodeId: client.nodeId,
        online: false,
      }, client.nodeId);
    }
    this.clients.delete(client.nodeId);
  }

  private broadcastToNetwork(networkId: string, message: unknown, excludeNodeId?: string): void {
    const payload = JSON.stringify(message);
    for (const [nodeId, client] of this.clients) {
      if (nodeId !== excludeNodeId && client.networkIds.has(networkId) && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    }
  }

  close(): void {
    this.wss.close();
  }
}
