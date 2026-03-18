import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DiscoveryDatabase } from '../db/database';
import { NetworkRepository } from '../db/repositories/network-repository';
import { ApplicantRepository } from '../db/repositories/applicant-repository';

describe('ApplicantRepository', () => {
  let db: DiscoveryDatabase;
  let networkRepo: NetworkRepository;
  let repo: ApplicantRepository;

  beforeEach(() => {
    db = new DiscoveryDatabase(':memory:');
    networkRepo = new NetworkRepository(db);
    repo = new ApplicantRepository(db);
    networkRepo.createNetwork({ id: 'net-1', alias: 'Test', creatorNodeId: 'node-creator' });
  });

  afterEach(() => {
    db.close();
  });

  it('should create an applicant', () => {
    const applicant = repo.createApplicant({ networkId: 'net-1', nodeId: 'node-2' });
    expect(applicant.network_id).toBe('net-1');
    expect(applicant.node_id).toBe('node-2');
    expect(applicant.status).toBe('submitted');
    expect(applicant.applied_at).toBeGreaterThan(0);
  });

  it('should get an applicant', () => {
    repo.createApplicant({ networkId: 'net-1', nodeId: 'node-2' });
    const applicant = repo.getApplicant('net-1', 'node-2');
    expect(applicant).toBeDefined();
    expect(applicant!.status).toBe('submitted');
  });

  it('should return undefined for non-existent applicant', () => {
    const applicant = repo.getApplicant('net-1', 'non-existent');
    expect(applicant).toBeUndefined();
  });

  it('should list applicants', () => {
    repo.createApplicant({ networkId: 'net-1', nodeId: 'node-2' });
    repo.createApplicant({ networkId: 'net-1', nodeId: 'node-3' });

    const applicants = repo.getApplicants('net-1');
    expect(applicants).toHaveLength(2);
  });

  it('should update applicant status to approved', () => {
    repo.createApplicant({ networkId: 'net-1', nodeId: 'node-2' });
    const updated = repo.updateApplicantStatus('net-1', 'node-2', 'approved_pending_acceptance');
    expect(updated!.status).toBe('approved_pending_acceptance');
    expect(updated!.approved_at).toBeGreaterThan(0);
  });

  it('should update applicant status to rejected', () => {
    repo.createApplicant({ networkId: 'net-1', nodeId: 'node-2' });
    const updated = repo.updateApplicantStatus('net-1', 'node-2', 'rejected');
    expect(updated!.status).toBe('rejected');
    expect(updated!.rejected_at).toBeGreaterThan(0);
  });

  it('should update applicant status to withdrawn', () => {
    repo.createApplicant({ networkId: 'net-1', nodeId: 'node-2' });
    const updated = repo.updateApplicantStatus('net-1', 'node-2', 'withdrawn');
    expect(updated!.status).toBe('withdrawn');
    expect(updated!.withdrawn_at).toBeGreaterThan(0);
  });

  it('should update applicant status to expired', () => {
    repo.createApplicant({ networkId: 'net-1', nodeId: 'node-2' });
    const updated = repo.updateApplicantStatus('net-1', 'node-2', 'expired_pending_approval');
    expect(updated!.status).toBe('expired_pending_approval');
    expect(updated!.expired_at).toBeGreaterThan(0);
  });

  it('should update applicant status to active (accepted)', () => {
    repo.createApplicant({ networkId: 'net-1', nodeId: 'node-2' });
    const updated = repo.updateApplicantStatus('net-1', 'node-2', 'active');
    expect(updated!.status).toBe('active');
    expect(updated!.accepted_at).toBeGreaterThan(0);
  });

  it('should delete an applicant', () => {
    repo.createApplicant({ networkId: 'net-1', nodeId: 'node-2' });
    const deleted = repo.deleteApplicant('net-1', 'node-2');
    expect(deleted).toBe(true);
    expect(repo.getApplicant('net-1', 'node-2')).toBeUndefined();
  });
});
