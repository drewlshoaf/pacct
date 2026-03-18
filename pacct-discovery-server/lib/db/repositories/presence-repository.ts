import { Pool } from 'pg';

export interface PresenceLeaseRow {
  network_id: string;
  node_id: string;
  last_heartbeat_at: number;
  lease_expires_at: number;
  instance_id: string | null;
}

function toPresenceLeaseRow(row: any): PresenceLeaseRow {
  return {
    ...row,
    last_heartbeat_at: Number(row.last_heartbeat_at),
    lease_expires_at: Number(row.lease_expires_at),
  };
}

/** Default lease duration: 30 seconds */
const DEFAULT_LEASE_MS = 30_000;

export class PresenceRepository {
  constructor(private pool: Pool) {}

  async upsertPresence(
    networkId: string,
    nodeId: string,
    heartbeatAt: number,
    leaseExpiresAt: number,
    instanceId?: string,
  ): Promise<PresenceLeaseRow> {
    await this.pool.query(
      `INSERT INTO presence_leases (network_id, node_id, last_heartbeat_at, lease_expires_at, instance_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (network_id, node_id)
       DO UPDATE SET last_heartbeat_at = EXCLUDED.last_heartbeat_at, lease_expires_at = EXCLUDED.lease_expires_at, instance_id = EXCLUDED.instance_id`,
      [networkId, nodeId, heartbeatAt, leaseExpiresAt, instanceId ?? null],
    );
    return (await this.getPresence(networkId, nodeId))!;
  }

  /**
   * Convenience wrapper matching the old updatePresence API shape.
   * When online=true a new lease is created/renewed; when online=false the lease is expired immediately.
   */
  async updatePresence(params: { networkId: string; nodeId: string; online: boolean; instanceId?: string }): Promise<PresenceLeaseRow> {
    const now = Date.now();
    if (params.online) {
      return this.upsertPresence(params.networkId, params.nodeId, now, now + DEFAULT_LEASE_MS, params.instanceId);
    } else {
      // Set lease_expires_at in the past to mark offline
      return this.upsertPresence(params.networkId, params.nodeId, now, 0, params.instanceId);
    }
  }

  async getPresence(networkId: string, nodeId: string): Promise<PresenceLeaseRow | undefined> {
    const result = await this.pool.query(
      'SELECT * FROM presence_leases WHERE network_id = $1 AND node_id = $2',
      [networkId, nodeId],
    );
    return result.rows[0] ? toPresenceLeaseRow(result.rows[0]) : undefined;
  }

  async getNetworkPresence(networkId: string): Promise<PresenceLeaseRow[]> {
    const result = await this.pool.query(
      'SELECT * FROM presence_leases WHERE network_id = $1 ORDER BY last_heartbeat_at DESC',
      [networkId],
    );
    return result.rows.map(toPresenceLeaseRow);
  }

  async getExpiredLeases(now: number): Promise<PresenceLeaseRow[]> {
    const result = await this.pool.query(
      'SELECT * FROM presence_leases WHERE lease_expires_at < $1',
      [now],
    );
    return result.rows.map(toPresenceLeaseRow);
  }

  async deletePresence(networkId: string, nodeId: string): Promise<void> {
    await this.pool.query(
      'DELETE FROM presence_leases WHERE network_id = $1 AND node_id = $2',
      [networkId, nodeId],
    );
  }

  async getOnlineNodes(networkId: string, now: number): Promise<PresenceLeaseRow[]> {
    const result = await this.pool.query(
      'SELECT * FROM presence_leases WHERE network_id = $1 AND lease_expires_at >= $2 ORDER BY last_heartbeat_at DESC',
      [networkId, now],
    );
    return result.rows.map(toPresenceLeaseRow);
  }

  /**
   * Convenience alias for backward compat with SignalingServer.
   * Expires the lease immediately.
   */
  async setOffline(networkId: string, nodeId: string): Promise<void> {
    const now = Date.now();
    await this.pool.query(
      `UPDATE presence_leases SET lease_expires_at = 0, last_heartbeat_at = $1 WHERE network_id = $2 AND node_id = $3`,
      [now, networkId, nodeId],
    );
  }
}
