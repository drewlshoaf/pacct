import { createServer } from 'http';
import next from 'next';
import { DiscoveryDatabase } from './lib/db/database';
import { attachWebSocketToServer } from './lib/ws/websocket-handler';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME ?? 'localhost';
const port = parseInt(process.env.PORT ?? '3000', 10);

async function main() {
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  await app.prepare();

  const dbPath = process.env.DISCOVERY_DB_PATH ?? 'discovery.db';
  const database = new DiscoveryDatabase(dbPath);

  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  attachWebSocketToServer(httpServer, database);

  httpServer.listen(port, () => {
    console.log(`Discovery server running at http://${hostname}:${port}`);
    console.log(`WebSocket signaling available at ws://${hostname}:${port}/ws`);
  });
}

main().catch(console.error);
