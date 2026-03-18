import type { IncomingMessage, Server } from 'http';
import type { Duplex } from 'stream';
import { DiscoveryDatabase } from '../db/database';
import { SignalingServer } from './signaling-server';

let signalingServer: SignalingServer | null = null;

export function createWebSocketHandler(database: DiscoveryDatabase): SignalingServer {
  if (!signalingServer) {
    signalingServer = new SignalingServer(database, { server: true });
  }
  return signalingServer;
}

export function attachWebSocketToServer(httpServer: Server, database: DiscoveryDatabase): SignalingServer {
  const handler = createWebSocketHandler(database);

  httpServer.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const url = new URL(request.url ?? '/', `http://${request.headers.host}`);
    if (url.pathname === '/ws') {
      handler.handleUpgrade(request, socket, head);
    } else {
      socket.destroy();
    }
  });

  return handler;
}

export function getSignalingServer(): SignalingServer | null {
  return signalingServer;
}
