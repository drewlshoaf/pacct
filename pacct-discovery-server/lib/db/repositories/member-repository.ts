import type { DiscoveryDatabase } from '../database';

export interface MemberRow {
  network_id: string;
  node_id: string;
  status: string;
  joined_at: number;
  left_at: number | null;
  acknowledged_at: number | null;
}

export interface AddMemberParams {
  networkId: string;
  nodeId: string;
  status?: string;
}

export class MemberRepository {
  constructor(private database: DiscoveryDatabase) {}

  addMember(params: AddMemberParams): MemberRow {
    const now = Date.now();
    const stmt = this.database.db.prepare(`
      INSERT INTO members (network_id, node_id, status, joined_at)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(params.networkId, params.nodeId, params.status ?? 'active', now);
    return this.getMember(params.networkId, params.nodeId)!;
  }

  getMember(networkId: string, nodeId: string): MemberRow | undefined {
    const stmt = this.database.db.prepare('SELECT * FROM members WHERE network_id = ? AND node_id = ?');
    return stmt.get(networkId, nodeId) as MemberRow | undefined;
  }

  getMembers(networkId: string): MemberRow[] {
    const stmt = this.database.db.prepare('SELECT * FROM members WHERE network_id = ? ORDER BY joined_at ASC');
    return stmt.all(networkId) as MemberRow[];
  }

  updateMemberStatus(networkId: string, nodeId: string, status: string): MemberRow | undefined {
    const now = Date.now();
    if (status === 'left' || status === 'expelled') {
      const stmt = this.database.db.prepare('UPDATE members SET status = ?, left_at = ? WHERE network_id = ? AND node_id = ?');
      stmt.run(status, now, networkId, nodeId);
    } else if (status === 'active') {
      const stmt = this.database.db.prepare('UPDATE members SET status = ?, acknowledged_at = ? WHERE network_id = ? AND node_id = ?');
      stmt.run(status, now, networkId, nodeId);
    } else {
      const stmt = this.database.db.prepare('UPDATE members SET status = ? WHERE network_id = ? AND node_id = ?');
      stmt.run(status, networkId, nodeId);
    }
    return this.getMember(networkId, nodeId);
  }

  removeMember(networkId: string, nodeId: string): boolean {
    const stmt = this.database.db.prepare('DELETE FROM members WHERE network_id = ? AND node_id = ?');
    const result = stmt.run(networkId, nodeId);
    return result.changes > 0;
  }

  getActiveMembers(networkId: string): MemberRow[] {
    const stmt = this.database.db.prepare("SELECT * FROM members WHERE network_id = ? AND status = 'active' ORDER BY joined_at ASC");
    return stmt.all(networkId) as MemberRow[];
  }
}
