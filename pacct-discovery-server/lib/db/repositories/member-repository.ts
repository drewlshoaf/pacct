import { Pool } from 'pg';

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

function toMemberRow(row: any): MemberRow {
  return {
    ...row,
    joined_at: Number(row.joined_at),
    left_at: row.left_at != null ? Number(row.left_at) : null,
    acknowledged_at: row.acknowledged_at != null ? Number(row.acknowledged_at) : null,
  };
}

export class MemberRepository {
  constructor(private pool: Pool) {}

  async addMember(params: AddMemberParams): Promise<MemberRow> {
    const now = Date.now();
    await this.pool.query(
      `INSERT INTO members (network_id, node_id, status, joined_at)
       VALUES ($1, $2, $3, $4)`,
      [params.networkId, params.nodeId, params.status ?? 'active', now],
    );
    return (await this.getMember(params.networkId, params.nodeId))!;
  }

  async getMember(networkId: string, nodeId: string): Promise<MemberRow | undefined> {
    const result = await this.pool.query(
      'SELECT * FROM members WHERE network_id = $1 AND node_id = $2',
      [networkId, nodeId],
    );
    return result.rows[0] ? toMemberRow(result.rows[0]) : undefined;
  }

  async getMembers(networkId: string): Promise<MemberRow[]> {
    const result = await this.pool.query(
      'SELECT * FROM members WHERE network_id = $1 ORDER BY joined_at ASC',
      [networkId],
    );
    return result.rows.map(toMemberRow);
  }

  async updateMemberStatus(networkId: string, nodeId: string, status: string): Promise<MemberRow | undefined> {
    const now = Date.now();
    if (status === 'left' || status === 'expelled') {
      await this.pool.query(
        'UPDATE members SET status = $1, left_at = $2 WHERE network_id = $3 AND node_id = $4',
        [status, now, networkId, nodeId],
      );
    } else if (status === 'active') {
      await this.pool.query(
        'UPDATE members SET status = $1, acknowledged_at = $2 WHERE network_id = $3 AND node_id = $4',
        [status, now, networkId, nodeId],
      );
    } else {
      await this.pool.query(
        'UPDATE members SET status = $1 WHERE network_id = $2 AND node_id = $3',
        [status, networkId, nodeId],
      );
    }
    return this.getMember(networkId, nodeId);
  }

  async removeMember(networkId: string, nodeId: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM members WHERE network_id = $1 AND node_id = $2',
      [networkId, nodeId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async getActiveMembers(networkId: string): Promise<MemberRow[]> {
    const result = await this.pool.query(
      "SELECT * FROM members WHERE network_id = $1 AND status = 'active' ORDER BY joined_at ASC",
      [networkId],
    );
    return result.rows.map(toMemberRow);
  }
}
