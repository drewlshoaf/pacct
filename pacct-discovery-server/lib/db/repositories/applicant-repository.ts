import { Pool } from 'pg';

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
  approval_due_at: number | null;
  acceptance_due_at: number | null;
}

export interface CreateApplicantParams {
  networkId: string;
  nodeId: string;
  status?: string;
}

function toApplicantRow(row: any): ApplicantRow {
  return {
    ...row,
    applied_at: Number(row.applied_at),
    approved_at: row.approved_at != null ? Number(row.approved_at) : null,
    accepted_at: row.accepted_at != null ? Number(row.accepted_at) : null,
    rejected_at: row.rejected_at != null ? Number(row.rejected_at) : null,
    withdrawn_at: row.withdrawn_at != null ? Number(row.withdrawn_at) : null,
    expired_at: row.expired_at != null ? Number(row.expired_at) : null,
    approval_due_at: row.approval_due_at != null ? Number(row.approval_due_at) : null,
    acceptance_due_at: row.acceptance_due_at != null ? Number(row.acceptance_due_at) : null,
  };
}

export class ApplicantRepository {
  constructor(private pool: Pool) {}

  async createApplicant(params: CreateApplicantParams): Promise<ApplicantRow> {
    const now = Date.now();
    await this.pool.query(
      `INSERT INTO applicants (network_id, node_id, status, applied_at)
       VALUES ($1, $2, $3, $4)`,
      [params.networkId, params.nodeId, params.status ?? 'submitted', now],
    );
    return (await this.getApplicant(params.networkId, params.nodeId))!;
  }

  async getApplicant(networkId: string, nodeId: string): Promise<ApplicantRow | undefined> {
    const result = await this.pool.query(
      'SELECT * FROM applicants WHERE network_id = $1 AND node_id = $2',
      [networkId, nodeId],
    );
    return result.rows[0] ? toApplicantRow(result.rows[0]) : undefined;
  }

  async getApplicants(networkId: string): Promise<ApplicantRow[]> {
    const result = await this.pool.query(
      'SELECT * FROM applicants WHERE network_id = $1 ORDER BY applied_at DESC',
      [networkId],
    );
    return result.rows.map(toApplicantRow);
  }

  async updateApplicantStatus(networkId: string, nodeId: string, status: string): Promise<ApplicantRow | undefined> {
    const now = Date.now();
    const timestampField = this.getTimestampField(status);
    if (timestampField) {
      await this.pool.query(
        `UPDATE applicants SET status = $1, ${timestampField} = $2 WHERE network_id = $3 AND node_id = $4`,
        [status, now, networkId, nodeId],
      );
    } else {
      await this.pool.query(
        'UPDATE applicants SET status = $1 WHERE network_id = $2 AND node_id = $3',
        [status, networkId, nodeId],
      );
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

  async deleteApplicant(networkId: string, nodeId: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM applicants WHERE network_id = $1 AND node_id = $2',
      [networkId, nodeId],
    );
    return (result.rowCount ?? 0) > 0;
  }
}
