import { createServer } from 'http';
import next from 'next';
import { initializeDatabase } from './lib/db/pool';
import { attachWebSocketToServer } from './lib/ws/websocket-handler';
import { getInstanceId } from './lib/instance-id';
import { startLeaseEngine } from './lib/presence/instance';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME ?? 'localhost';
const port = parseInt(process.env.PORT ?? '3000', 10);

async function main() {
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  await app.prepare();

  // Initialize PostgreSQL schema
  await initializeDatabase();

  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  attachWebSocketToServer(httpServer);

  // Start the heartbeat/lease sweep engine
  startLeaseEngine();
  console.log('Lease engine sweep started');

  httpServer.listen(port, () => {
    console.log(`Discovery server running at http://${hostname}:${port} (instance: ${getInstanceId()})`);
    console.log(`WebSocket signaling available at ws://${hostname}:${port}/ws`);
  });
}

main().catch(console.error);
