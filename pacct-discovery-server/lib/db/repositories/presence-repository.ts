import type { DiscoveryDatabase } from '../database';

export interface PresenceRow {
  network_id: string;
  node_id: string;
  online: number;
  last_seen: number;
}

export interface UpdatePresenceParams {
  networkId: string;
  nodeId: string;
  online: boolean;
}

export class PresenceRepository {
  constructor(private database: DiscoveryDatabase) {}

  updatePresence(params: UpdatePresenceParams): PresenceRow {
    const now = Date.now();
    const stmt = this.database.db.prepare(`
      INSERT OR REPLACE INTO presence (network_id, node_id, online, last_seen)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(params.networkId, params.nodeId, params.online ? 1 : 0, now);
    return this.getPresence(params.networkId, params.nodeId)!;
  }

  getPresence(networkId: string, nodeId: string): PresenceRow | undefined {
    const stmt = this.database.db.prepare('SELECT * FROM presence WHERE network_id = ? AND node_id = ?');
    return stmt.get(networkId, nodeId) as PresenceRow | undefined;
  }

  getNetworkPresence(networkId: string): PresenceRow[] {
    const stmt = this.database.db.prepare('SELECT * FROM presence WHERE network_id = ? ORDER BY last_seen DESC');
    return stmt.all(networkId) as PresenceRow[];
  }

  setOffline(networkId: string, nodeId: string): void {
    const now = Date.now();
    const stmt = this.database.db.prepare('UPDATE presence SET online = 0, last_seen = ? WHERE network_id = ? AND node_id = ?');
    stmt.run(now, networkId, nodeId);
  }
}
