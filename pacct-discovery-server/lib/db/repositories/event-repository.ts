import { Pool } from 'pg';

export interface EventRow {
  id: number;
  network_id: string;
  event_type: string;
  node_id: string | null;
  payload: Record<string, unknown> | null;
  timestamp: number;
}

export interface LogEventParams {
  networkId: string;
  eventType: string;
  nodeId?: string;
  payload?: Record<string, unknown>;
}

function toEventRow(row: any): EventRow {
  return {
    ...row,
    id: Number(row.id),
    timestamp: Number(row.timestamp),
    // JSONB comes back as object already from pg driver
    payload: row.payload ?? null,
  };
}

export class EventRepository {
  constructor(private pool: Pool) {}

  async logEvent(params: LogEventParams): Promise<EventRow> {
    const now = Date.now();
    const result = await this.pool.query(
      `INSERT INTO event_log (network_id, event_type, node_id, payload, timestamp)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        params.networkId,
        params.eventType,
        params.nodeId ?? null,
        params.payload ? JSON.stringify(params.payload) : null,
        now,
      ],
    );
    return toEventRow(result.rows[0]);
  }

  async getEvent(id: number): Promise<EventRow | undefined> {
    const result = await this.pool.query('SELECT * FROM event_log WHERE id = $1', [id]);
    return result.rows[0] ? toEventRow(result.rows[0]) : undefined;
  }

  async getEvents(networkId: string, limit: number = 50, offset: number = 0): Promise<EventRow[]> {
    const result = await this.pool.query(
      'SELECT * FROM event_log WHERE network_id = $1 ORDER BY timestamp DESC LIMIT $2 OFFSET $3',
      [networkId, limit, offset],
    );
    return result.rows.map(toEventRow);
  }

  async getNetworkEvents(networkId: string): Promise<EventRow[]> {
    const result = await this.pool.query(
      'SELECT * FROM event_log WHERE network_id = $1 ORDER BY timestamp DESC',
      [networkId],
    );
    return result.rows.map(toEventRow);
  }

  async getEventsByType(networkId: string, eventType: string): Promise<EventRow[]> {
    const result = await this.pool.query(
      'SELECT * FROM event_log WHERE network_id = $1 AND event_type = $2 ORDER BY timestamp DESC',
      [networkId, eventType],
    );
    return result.rows.map(toEventRow);
  }

  async countEvents(networkId: string): Promise<number> {
    const result = await this.pool.query(
      'SELECT COUNT(*) as count FROM event_log WHERE network_id = $1',
      [networkId],
    );
    return Number(result.rows[0].count);
  }

  async getRecentEvents(networkId: string, limit: number): Promise<EventRow[]> {
    return this.getEvents(networkId, limit, 0);
  }

  async getEventCount(networkId: string): Promise<number> {
    return this.countEvents(networkId);
  }
}
