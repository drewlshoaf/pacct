import type { IncomingMessage, Server } from 'http';
import type { Duplex } from 'stream';
import { SignalingServer } from './signaling-server';

let signalingServer: SignalingServer | null = null;

export function createWebSocketHandler(): SignalingServer {
  if (!signalingServer) {
    signalingServer = new SignalingServer({ server: true });
  }
  return signalingServer;
}

export function attachWebSocketToServer(httpServer: Server): SignalingServer {
  const handler = createWebSocketHandler();

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
