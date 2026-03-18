import type { DiscoveryDatabase } from '../database';

export interface ApplicantRow {
  network_id: string;
  node_id: string;
  status: string;
  applied_at: number;
  approved_at: number | null;
  accepted_at: number | null;
  rejected_at: number | null;
  withdrawn_at: number | null;
  expired_at: number | null;
}

export interface CreateApplicantParams {
  networkId: string;
  nodeId: string;
  status?: string;
}

export class ApplicantRepository {
  constructor(private database: DiscoveryDatabase) {}

  createApplicant(params: CreateApplicantParams): ApplicantRow {
    const now = Date.now();
    const stmt = this.database.db.prepare(`
      INSERT INTO applicants (network_id, node_id, status, applied_at)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(params.networkId, params.nodeId, params.status ?? 'submitted', now);
    return this.getApplicant(params.networkId, params.nodeId)!;
  }

  getApplicant(networkId: string, nodeId: string): ApplicantRow | undefined {
    const stmt = this.database.db.prepare('SELECT * FROM applicants WHERE network_id = ? AND node_id = ?');
    return stmt.get(networkId, nodeId) as ApplicantRow | undefined;
  }

  getApplicants(networkId: string): ApplicantRow[] {
    const stmt = this.database.db.prepare('SELECT * FROM applicants WHERE network_id = ? ORDER BY applied_at DESC');
    return stmt.all(networkId) as ApplicantRow[];
  }

  updateApplicantStatus(networkId: string, nodeId: string, status: string): ApplicantRow | undefined {
    const now = Date.now();
    const timestampField = this.getTimestampField(status);
    if (timestampField) {
      const stmt = this.database.db.prepare(`UPDATE applicants SET status = ?, ${timestampField} = ? WHERE network_id = ? AND node_id = ?`);
      stmt.run(status, now, networkId, nodeId);
    } else {
      const stmt = this.database.db.prepare('UPDATE applicants SET status = ? WHERE network_id = ? AND node_id = ?');
      stmt.run(status, networkId, nodeId);
    }
    return this.getApplicant(networkId, nodeId);
  }

  private getTimestampField(status: string): string | null {
    switch (status) {
      case 'approved_pending_acceptance': return 'approved_at';
      case 'active': return 'accepted_at';
      case 'rejected': return 'rejected_at';
      case 'withdrawn': return 'withdrawn_at';
      case 'expired_pending_approval':
      case 'expired_pending_acceptance': return 'expired_at';
      default: return null;
    }
  }

  deleteApplicant(networkId: string, nodeId: string): boolean {
    const stmt = this.database.db.prepare('DELETE FROM applicants WHERE network_id = ? AND node_id = ?');
    const result = stmt.run(networkId, nodeId);
    return result.changes > 0;
  }
}
