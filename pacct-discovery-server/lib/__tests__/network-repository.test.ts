import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DiscoveryDatabase } from '../db/database';
import { NetworkRepository } from '../db/repositories/network-repository';

describe('NetworkRepository', () => {
  let db: DiscoveryDatabase;
  let repo: NetworkRepository;

  beforeEach(() => {
    db = new DiscoveryDatabase(':memory:');
    repo = new NetworkRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it('should create a network', () => {
    const network = repo.createNetwork({
      id: 'net-1',
      alias: 'Test Network',
      creatorNodeId: 'node-1',
    });

    expect(network.id).toBe('net-1');
    expect(network.alias).toBe('Test Network');
    expect(network.status).toBe('draft');
    expect(network.creator_node_id).toBe('node-1');
    expect(network.visibility_mode).toBe('none');
    expect(network.min_active_members).toBe(3);
    expect(network.created_at).toBeGreaterThan(0);
  });

  it('should create a network with custom params', () => {
    const network = repo.createNetwork({
      id: 'net-2',
      alias: 'Custom Network',
      creatorNodeId: 'node-1',
      visibilityMode: 'partial',
      visibilityConfig: { schema: 'full', computation: 'summary_only' },
      minActiveMembers: 5,
      preActivationTimeoutMs: 60000,
      postActivationInactivityTimeoutMs: 300000,
    });

    expect(network.visibility_mode).toBe('partial');
    expect(JSON.parse(network.visibility_config!)).toEqual({ schema: 'full', computation: 'summary_only' });
    expect(network.min_active_members).toBe(5);
    expect(network.pre_activation_timeout_ms).toBe(60000);
    expect(network.post_activation_inactivity_timeout_ms).toBe(300000);
  });

  it('should get a network by id', () => {
    repo.createNetwork({ id: 'net-1', alias: 'Test', creatorNodeId: 'node-1' });
    const network = repo.getNetwork('net-1');
    expect(network).toBeDefined();
    expect(network!.alias).toBe('Test');
  });

  it('should return undefined for non-existent network', () => {
    const network = repo.getNetwork('non-existent');
    expect(network).toBeUndefined();
  });

  it('should list all networks', () => {
    repo.createNetwork({ id: 'net-1', alias: 'Network 1', creatorNodeId: 'node-1' });
    repo.createNetwork({ id: 'net-2', alias: 'Network 2', creatorNodeId: 'node-2' });

    const networks = repo.listNetworks();
    expect(networks).toHaveLength(2);
  });

  it('should list networks filtered by status', () => {
    repo.createNetwork({ id: 'net-1', alias: 'Network 1', creatorNodeId: 'node-1' });
    repo.createNetwork({ id: 'net-2', alias: 'Network 2', creatorNodeId: 'node-2' });
    repo.updateNetworkStatus('net-2', 'active');

    const drafts = repo.listNetworks('draft');
    expect(drafts).toHaveLength(1);
    expect(drafts[0].id).toBe('net-1');

    const actives = repo.listNetworks('active');
    expect(actives).toHaveLength(1);
    expect(actives[0].id).toBe('net-2');
  });

  it('should update network status', () => {
    repo.createNetwork({ id: 'net-1', alias: 'Test', creatorNodeId: 'node-1' });
    const updated = repo.updateNetworkStatus('net-1', 'active');
    expect(updated!.status).toBe('active');
    expect(updated!.activated_at).toBeGreaterThan(0);
  });

  it('should set dissolved_at when dissolving', () => {
    repo.createNetwork({ id: 'net-1', alias: 'Test', creatorNodeId: 'node-1' });
    const updated = repo.updateNetworkStatus('net-1', 'dissolved');
    expect(updated!.status).toBe('dissolved');
    expect(updated!.dissolved_at).toBeGreaterThan(0);
  });

  it('should delete a network', () => {
    repo.createNetwork({ id: 'net-1', alias: 'Test', creatorNodeId: 'node-1' });
    const deleted = repo.deleteNetwork('net-1');
    expect(deleted).toBe(true);
    expect(repo.getNetwork('net-1')).toBeUndefined();
  });

  it('should return false when deleting non-existent network', () => {
    const deleted = repo.deleteNetwork('non-existent');
    expect(deleted).toBe(false);
  });
});
