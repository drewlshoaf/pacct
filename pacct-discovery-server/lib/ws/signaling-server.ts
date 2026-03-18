import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import { DiscoveryDatabase } from '../db/database';
import { PresenceRepository } from '../db/repositories/presence-repository';
import { EventRepository } from '../db/repositories/event-repository';
import { MemberRepository } from '../db/repositories/member-repository';

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
  private clients: Map<string, ConnectedClient> = new Map();
  private presenceRepo: PresenceRepository;
  private eventRepo: EventRepository;
  private memberRepo: MemberRepository;

  constructor(private database: DiscoveryDatabase, options?: { port?: number; server?: unknown }) {
    this.presenceRepo = new PresenceRepository(database);
    this.eventRepo = new EventRepository(database);
    this.memberRepo = new MemberRepository(database);

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
      this.presenceRepo.updatePresence({
        networkId: message.networkId,
        nodeId: client.nodeId,
        online: true,
      });
    }
    client.ws.send(JSON.stringify({ type: 'heartbeat_ack', timestamp: Date.now() }));
  }

  private handleJoinNetwork(client: ConnectedClient, message: SignalingMessagePayload): void {
    if (message.networkId) {
      client.networkIds.add(message.networkId);
      this.presenceRepo.updatePresence({
        networkId: message.networkId,
        nodeId: client.nodeId,
        online: true,
      });
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
      this.presenceRepo.setOffline(message.networkId, client.nodeId);
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
    }
  }

  private handleDisconnect(client: ConnectedClient): void {
    for (const networkId of client.networkIds) {
      this.presenceRepo.setOffline(networkId, client.nodeId);
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
