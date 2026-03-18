import { Pool } from 'pg';

export interface VoteRow {
  network_id: string;
  applicant_node_id: string;
  voter_node_id: string;
  vote: string;
  timestamp: number;
  signature: string | null;
}

export interface CastVoteParams {
  networkId: string;
  applicantNodeId: string;
  voterNodeId: string;
  vote: string;
  signature?: string;
}

function toVoteRow(row: any): VoteRow {
  return {
    ...row,
    timestamp: Number(row.timestamp),
  };
}

export class VoteRepository {
  constructor(private pool: Pool) {}

  async castVote(params: CastVoteParams): Promise<VoteRow> {
    const now = Date.now();
    await this.pool.query(
      `INSERT INTO approval_votes (network_id, applicant_node_id, voter_node_id, vote, timestamp, signature)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (network_id, applicant_node_id, voter_node_id)
       DO UPDATE SET vote = EXCLUDED.vote, timestamp = EXCLUDED.timestamp, signature = EXCLUDED.signature`,
      [
        params.networkId,
        params.applicantNodeId,
        params.voterNodeId,
        params.vote,
        now,
        params.signature ?? null,
      ],
    );
    return (await this.getVote(params.networkId, params.applicantNodeId, params.voterNodeId))!;
  }

  async getVote(networkId: string, applicantNodeId: string, voterNodeId: string): Promise<VoteRow | undefined> {
    const result = await this.pool.query(
      'SELECT * FROM approval_votes WHERE network_id = $1 AND applicant_node_id = $2 AND voter_node_id = $3',
      [networkId, applicantNodeId, voterNodeId],
    );
    return result.rows[0] ? toVoteRow(result.rows[0]) : undefined;
  }

  async getVotes(networkId: string, applicantNodeId: string): Promise<VoteRow[]> {
    const result = await this.pool.query(
      'SELECT * FROM approval_votes WHERE network_id = $1 AND applicant_node_id = $2 ORDER BY timestamp ASC',
      [networkId, applicantNodeId],
    );
    return result.rows.map(toVoteRow);
  }

  async getVoteCount(networkId: string, applicantNodeId: string): Promise<{ approve: number; reject: number }> {
    const result = await this.pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE vote = 'approve') AS approve,
         COUNT(*) FILTER (WHERE vote = 'reject') AS reject
       FROM approval_votes
       WHERE network_id = $1 AND applicant_node_id = $2`,
      [networkId, applicantNodeId],
    );
    const row = result.rows[0];
    return {
      approve: Number(row?.approve ?? 0),
      reject: Number(row?.reject ?? 0),
    };
  }
}
