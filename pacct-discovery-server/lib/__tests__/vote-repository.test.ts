import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DiscoveryDatabase } from '../db/database';
import { NetworkRepository } from '../db/repositories/network-repository';
import { VoteRepository } from '../db/repositories/vote-repository';

describe('VoteRepository', () => {
  let db: DiscoveryDatabase;
  let repo: VoteRepository;

  beforeEach(() => {
    db = new DiscoveryDatabase(':memory:');
    new NetworkRepository(db).createNetwork({ id: 'net-1', alias: 'Test', creatorNodeId: 'node-creator' });
    repo = new VoteRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it('should cast a vote', () => {
    const vote = repo.castVote({
      networkId: 'net-1',
      applicantNodeId: 'node-2',
      voterNodeId: 'node-1',
      vote: 'approve',
    });
    expect(vote.vote).toBe('approve');
    expect(vote.voter_node_id).toBe('node-1');
    expect(vote.applicant_node_id).toBe('node-2');
    expect(vote.timestamp).toBeGreaterThan(0);
  });

  it('should cast a vote with signature', () => {
    const vote = repo.castVote({
      networkId: 'net-1',
      applicantNodeId: 'node-2',
      voterNodeId: 'node-1',
      vote: 'approve',
      signature: 'sig-123',
    });
    expect(vote.signature).toBe('sig-123');
  });

  it('should get votes for an applicant', () => {
    repo.castVote({ networkId: 'net-1', applicantNodeId: 'node-2', voterNodeId: 'node-1', vote: 'approve' });
    repo.castVote({ networkId: 'net-1', applicantNodeId: 'node-2', voterNodeId: 'node-3', vote: 'reject' });

    const votes = repo.getVotes('net-1', 'node-2');
    expect(votes).toHaveLength(2);
  });

  it('should replace vote on re-vote', () => {
    repo.castVote({ networkId: 'net-1', applicantNodeId: 'node-2', voterNodeId: 'node-1', vote: 'approve' });
    repo.castVote({ networkId: 'net-1', applicantNodeId: 'node-2', voterNodeId: 'node-1', vote: 'reject' });

    const votes = repo.getVotes('net-1', 'node-2');
    expect(votes).toHaveLength(1);
    expect(votes[0].vote).toBe('reject');
  });

  it('should count votes', () => {
    repo.castVote({ networkId: 'net-1', applicantNodeId: 'node-2', voterNodeId: 'node-1', vote: 'approve' });
    repo.castVote({ networkId: 'net-1', applicantNodeId: 'node-2', voterNodeId: 'node-3', vote: 'approve' });
    repo.castVote({ networkId: 'net-1', applicantNodeId: 'node-2', voterNodeId: 'node-4', vote: 'reject' });

    const counts = repo.getVoteCount('net-1', 'node-2');
    expect(counts.approve).toBe(2);
    expect(counts.reject).toBe(1);
  });

  it('should return empty votes for non-existent applicant', () => {
    const votes = repo.getVotes('net-1', 'non-existent');
    expect(votes).toHaveLength(0);
  });
});
