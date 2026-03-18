import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DiscoveryDatabase } from '../db/database';
import { PresenceRepository } from '../db/repositories/presence-repository';

describe('PresenceRepository', () => {
  let db: DiscoveryDatabase;
  let repo: PresenceRepository;

  beforeEach(() => {
    db = new DiscoveryDatabase(':memory:');
    repo = new PresenceRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it('should update presence (online)', () => {
    const presence = repo.updatePresence({ networkId: 'net-1', nodeId: 'node-1', online: true });
    expect(presence.online).toBe(1);
    expect(presence.last_seen).toBeGreaterThan(0);
  });

  it('should update presence (offline)', () => {
    const presence = repo.updatePresence({ networkId: 'net-1', nodeId: 'node-1', online: false });
    expect(presence.online).toBe(0);
  });

  it('should get presence for a node', () => {
    repo.updatePresence({ networkId: 'net-1', nodeId: 'node-1', online: true });
    const presence = repo.getPresence('net-1', 'node-1');
    expect(presence).toBeDefined();
    expect(presence!.online).toBe(1);
  });

  it('should return undefined for non-existent presence', () => {
    const presence = repo.getPresence('net-1', 'non-existent');
    expect(presence).toBeUndefined();
  });

  it('should get network presence', () => {
    repo.updatePresence({ networkId: 'net-1', nodeId: 'node-1', online: true });
    repo.updatePresence({ networkId: 'net-1', nodeId: 'node-2', online: false });

    const presence = repo.getNetworkPresence('net-1');
    expect(presence).toHaveLength(2);
  });

  it('should set a node offline', () => {
    repo.updatePresence({ networkId: 'net-1', nodeId: 'node-1', online: true });
    repo.setOffline('net-1', 'node-1');
    const presence = repo.getPresence('net-1', 'node-1');
    expect(presence!.online).toBe(0);
  });

  it('should replace presence on update', () => {
    repo.updatePresence({ networkId: 'net-1', nodeId: 'node-1', online: true });
    repo.updatePresence({ networkId: 'net-1', nodeId: 'node-1', online: false });
    const all = repo.getNetworkPresence('net-1');
    expect(all).toHaveLength(1);
    expect(all[0].online).toBe(0);
  });
});
