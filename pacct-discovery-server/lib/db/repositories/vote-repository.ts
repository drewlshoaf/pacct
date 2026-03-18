import type { DiscoveryDatabase } from '../database';

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

export class VoteRepository {
  constructor(private database: DiscoveryDatabase) {}

  castVote(params: CastVoteParams): VoteRow {
    const now = Date.now();
    const stmt = this.database.db.prepare(`
      INSERT OR REPLACE INTO approval_votes (network_id, applicant_node_id, voter_node_id, vote, timestamp, signature)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      params.networkId,
      params.applicantNodeId,
      params.voterNodeId,
      params.vote,
      now,
      params.signature ?? null,
    );
    return this.getVote(params.networkId, params.applicantNodeId, params.voterNodeId)!;
  }

  getVote(networkId: string, applicantNodeId: string, voterNodeId: string): VoteRow | undefined {
    const stmt = this.database.db.prepare(
      'SELECT * FROM approval_votes WHERE network_id = ? AND applicant_node_id = ? AND voter_node_id = ?',
    );
    return stmt.get(networkId, applicantNodeId, voterNodeId) as VoteRow | undefined;
  }

  getVotes(networkId: string, applicantNodeId: string): VoteRow[] {
    const stmt = this.database.db.prepare(
      'SELECT * FROM approval_votes WHERE network_id = ? AND applicant_node_id = ? ORDER BY timestamp ASC',
    );
    return stmt.all(networkId, applicantNodeId) as VoteRow[];
  }

  getVoteCount(networkId: string, applicantNodeId: string): { approve: number; reject: number } {
    const votes = this.getVotes(networkId, applicantNodeId);
    return {
      approve: votes.filter((v) => v.vote === 'approve').length,
      reject: votes.filter((v) => v.vote === 'reject').length,
    };
  }
}
