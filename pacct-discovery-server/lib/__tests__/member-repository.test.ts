import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DiscoveryDatabase } from '../db/database';
import { NetworkRepository } from '../db/repositories/network-repository';
import { MemberRepository } from '../db/repositories/member-repository';

describe('MemberRepository', () => {
  let db: DiscoveryDatabase;
  let networkRepo: NetworkRepository;
  let repo: MemberRepository;

  beforeEach(() => {
    db = new DiscoveryDatabase(':memory:');
    networkRepo = new NetworkRepository(db);
    repo = new MemberRepository(db);
    networkRepo.createNetwork({ id: 'net-1', alias: 'Test', creatorNodeId: 'node-creator' });
  });

  afterEach(() => {
    db.close();
  });

  it('should add a member', () => {
    const member = repo.addMember({ networkId: 'net-1', nodeId: 'node-1' });
    expect(member.network_id).toBe('net-1');
    expect(member.node_id).toBe('node-1');
    expect(member.status).toBe('active');
    expect(member.joined_at).toBeGreaterThan(0);
  });

  it('should get a member', () => {
    repo.addMember({ networkId: 'net-1', nodeId: 'node-1' });
    const member = repo.getMember('net-1', 'node-1');
    expect(member).toBeDefined();
    expect(member!.node_id).toBe('node-1');
  });

  it('should return undefined for non-existent member', () => {
    const member = repo.getMember('net-1', 'non-existent');
    expect(member).toBeUndefined();
  });

  it('should list members', () => {
    repo.addMember({ networkId: 'net-1', nodeId: 'node-1' });
    repo.addMember({ networkId: 'net-1', nodeId: 'node-2' });

    const members = repo.getMembers('net-1');
    expect(members).toHaveLength(2);
  });

  it('should update member status to left', () => {
    repo.addMember({ networkId: 'net-1', nodeId: 'node-1' });
    const updated = repo.updateMemberStatus('net-1', 'node-1', 'left');
    expect(updated!.status).toBe('left');
    expect(updated!.left_at).toBeGreaterThan(0);
  });

  it('should update member status to active and set acknowledged_at', () => {
    repo.addMember({ networkId: 'net-1', nodeId: 'node-1', status: 'pending_reack' });
    const updated = repo.updateMemberStatus('net-1', 'node-1', 'active');
    expect(updated!.status).toBe('active');
    expect(updated!.acknowledged_at).toBeGreaterThan(0);
  });

  it('should remove a member', () => {
    repo.addMember({ networkId: 'net-1', nodeId: 'node-1' });
    const removed = repo.removeMember('net-1', 'node-1');
    expect(removed).toBe(true);
    expect(repo.getMember('net-1', 'node-1')).toBeUndefined();
  });

  it('should get active members only', () => {
    repo.addMember({ networkId: 'net-1', nodeId: 'node-1' });
    repo.addMember({ networkId: 'net-1', nodeId: 'node-2' });
    repo.updateMemberStatus('net-1', 'node-2', 'left');

    const active = repo.getActiveMembers('net-1');
    expect(active).toHaveLength(1);
    expect(active[0].node_id).toBe('node-1');
  });
});
