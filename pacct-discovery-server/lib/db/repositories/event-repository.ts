import type { DiscoveryDatabase } from '../database';

export interface EventRow {
  id: number;
  network_id: string;
  event_type: string;
  node_id: string | null;
  payload: string | null;
  timestamp: number;
}

export interface LogEventParams {
  networkId: string;
  eventType: string;
  nodeId?: string;
  payload?: Record<string, unknown>;
}

export class EventRepository {
  constructor(private database: DiscoveryDatabase) {}

  logEvent(params: LogEventParams): EventRow {
    const now = Date.now();
    const stmt = this.database.db.prepare(`
      INSERT INTO event_log (network_id, event_type, node_id, payload, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      params.networkId,
      params.eventType,
      params.nodeId ?? null,
      params.payload ? JSON.stringify(params.payload) : null,
      now,
    );
    return this.getEvent(Number(result.lastInsertRowid))!;
  }

  getEvent(id: number): EventRow | undefined {
    const stmt = this.database.db.prepare('SELECT * FROM event_log WHERE id = ?');
    return stmt.get(id) as EventRow | undefined;
  }

  getEvents(networkId: string, limit: number = 50, offset: number = 0): EventRow[] {
    const stmt = this.database.db.prepare(
      'SELECT * FROM event_log WHERE network_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?',
    );
    return stmt.all(networkId, limit, offset) as EventRow[];
  }

  getNetworkEvents(networkId: string): EventRow[] {
    const stmt = this.database.db.prepare('SELECT * FROM event_log WHERE network_id = ? ORDER BY timestamp DESC');
    return stmt.all(networkId) as EventRow[];
  }

  getEventsByType(networkId: string, eventType: string): EventRow[] {
    const stmt = this.database.db.prepare(
      'SELECT * FROM event_log WHERE network_id = ? AND event_type = ? ORDER BY timestamp DESC',
    );
    return stmt.all(networkId, eventType) as EventRow[];
  }

  countEvents(networkId: string): number {
    const stmt = this.database.db.prepare('SELECT COUNT(*) as count FROM event_log WHERE network_id = ?');
    const result = stmt.get(networkId) as { count: number };
    return result.count;
  }
}
