import { Pool } from 'pg';

export interface NetworkRow {
  id: string;
  alias: string;
  status: string;
  creator_node_id: string;
  created_at: number;
  activated_at: number | null;
  dissolved_at: number | null;
  updated_at: number | null;
  visibility_mode: string;
  visibility_config: Record<string, string> | null;
  min_active_members: number;
  pre_activation_timeout_ms: number | null;
  post_activation_inactivity_timeout_ms: number | null;
}

export interface CreateNetworkParams {
  id: string;
  alias: string;
  creatorNodeId: string;
  visibilityMode?: string;
  visibilityConfig?: Record<string, string>;
  minActiveMembers?: number;
  preActivationTimeoutMs?: number;
  postActivationInactivityTimeoutMs?: number;
}

function toNetworkRow(row: any): NetworkRow {
  return {
    ...row,
    created_at: Number(row.created_at),
    activated_at: row.activated_at != null ? Number(row.activated_at) : null,
    dissolved_at: row.dissolved_at != null ? Number(row.dissolved_at) : null,
    updated_at: row.updated_at != null ? Number(row.updated_at) : null,
    min_active_members: Number(row.min_active_members),
    pre_activation_timeout_ms: row.pre_activation_timeout_ms != null ? Number(row.pre_activation_timeout_ms) : null,
    post_activation_inactivity_timeout_ms: row.post_activation_inactivity_timeout_ms != null ? Number(row.post_activation_inactivity_timeout_ms) : null,
  };
}

export class NetworkRepository {
  constructor(private pool: Pool) {}

  async createNetwork(params: CreateNetworkParams): Promise<NetworkRow> {
    const now = Date.now();
    await this.pool.query(
      `INSERT INTO networks (id, alias, status, creator_node_id, created_at, updated_at, visibility_mode, visibility_config, min_active_members, pre_activation_timeout_ms, post_activation_inactivity_timeout_ms)
       VALUES ($1, $2, 'draft', $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        params.id,
        params.alias,
        params.creatorNodeId,
        now,
        now,
        params.visibilityMode ?? 'none',
        params.visibilityConfig ? JSON.stringify(params.visibilityConfig) : null,
        params.minActiveMembers ?? 3,
        params.preActivationTimeoutMs ?? null,
        params.postActivationInactivityTimeoutMs ?? null,
      ],
    );
    return (await this.getNetwork(params.id))!;
  }

  async getNetwork(id: string): Promise<NetworkRow | undefined> {
    const result = await this.pool.query('SELECT * FROM networks WHERE id = $1', [id]);
    return result.rows[0] ? toNetworkRow(result.rows[0]) : undefined;
  }

  async listNetworks(statusFilter?: string): Promise<NetworkRow[]> {
    if (statusFilter) {
      const result = await this.pool.query(
        'SELECT * FROM networks WHERE status = $1 ORDER BY created_at DESC',
        [statusFilter],
      );
      return result.rows.map(toNetworkRow);
    }
    const result = await this.pool.query('SELECT * FROM networks ORDER BY created_at DESC');
    return result.rows.map(toNetworkRow);
  }

  async updateNetworkStatus(id: string, status: string): Promise<NetworkRow | undefined> {
    const now = Date.now();
    if (status === 'active') {
      await this.pool.query(
        'UPDATE networks SET status = $1, activated_at = $2, updated_at = $3 WHERE id = $4',
        [status, now, now, id],
      );
    } else if (status === 'dissolved') {
      await this.pool.query(
        'UPDATE networks SET status = $1, dissolved_at = $2, updated_at = $3 WHERE id = $4',
        [status, now, now, id],
      );
    } else {
      await this.pool.query(
        'UPDATE networks SET status = $1, updated_at = $2 WHERE id = $3',
        [status, now, id],
      );
    }
    return this.getNetwork(id);
  }

  async deleteNetwork(id: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM networks WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
