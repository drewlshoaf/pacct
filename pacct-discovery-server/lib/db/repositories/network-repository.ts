import type { DiscoveryDatabase } from '../database';

export interface NetworkRow {
  id: string;
  alias: string;
  status: string;
  creator_node_id: string;
  created_at: number;
  activated_at: number | null;
  dissolved_at: number | null;
  visibility_mode: string;
  visibility_config: string | null;
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

export class NetworkRepository {
  constructor(private database: DiscoveryDatabase) {}

  createNetwork(params: CreateNetworkParams): NetworkRow {
    const now = Date.now();
    const stmt = this.database.db.prepare(`
      INSERT INTO networks (id, alias, status, creator_node_id, created_at, visibility_mode, visibility_config, min_active_members, pre_activation_timeout_ms, post_activation_inactivity_timeout_ms)
      VALUES (?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      params.id,
      params.alias,
      params.creatorNodeId,
      now,
      params.visibilityMode ?? 'none',
      params.visibilityConfig ? JSON.stringify(params.visibilityConfig) : null,
      params.minActiveMembers ?? 3,
      params.preActivationTimeoutMs ?? null,
      params.postActivationInactivityTimeoutMs ?? null,
    );
    return this.getNetwork(params.id)!;
  }

  getNetwork(id: string): NetworkRow | undefined {
    const stmt = this.database.db.prepare('SELECT * FROM networks WHERE id = ?');
    return stmt.get(id) as NetworkRow | undefined;
  }

  listNetworks(statusFilter?: string): NetworkRow[] {
    if (statusFilter) {
      const stmt = this.database.db.prepare('SELECT * FROM networks WHERE status = ? ORDER BY created_at DESC');
      return stmt.all(statusFilter) as NetworkRow[];
    }
    const stmt = this.database.db.prepare('SELECT * FROM networks ORDER BY created_at DESC');
    return stmt.all() as NetworkRow[];
  }

  updateNetworkStatus(id: string, status: string): NetworkRow | undefined {
    const now = Date.now();
    let extra = '';
    if (status === 'active') {
      extra = ', activated_at = ?';
    } else if (status === 'dissolved') {
      extra = ', dissolved_at = ?';
    }
    if (extra) {
      const stmt = this.database.db.prepare(`UPDATE networks SET status = ?${extra} WHERE id = ?`);
      stmt.run(status, now, id);
    } else {
      const stmt = this.database.db.prepare('UPDATE networks SET status = ? WHERE id = ?');
      stmt.run(status, id);
    }
    return this.getNetwork(id);
  }

  deleteNetwork(id: string): boolean {
    const stmt = this.database.db.prepare('DELETE FROM networks WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
}
