import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DiscoveryDatabase } from '../db/database';
import { NetworkRepository } from '../db/repositories/network-repository';
import { EventRepository } from '../db/repositories/event-repository';

describe('EventRepository', () => {
  let db: DiscoveryDatabase;
  let repo: EventRepository;

  beforeEach(() => {
    db = new DiscoveryDatabase(':memory:');
    new NetworkRepository(db).createNetwork({ id: 'net-1', alias: 'Test', creatorNodeId: 'node-1' });
    repo = new EventRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it('should log an event', () => {
    const event = repo.logEvent({
      networkId: 'net-1',
      eventType: 'network_created',
      nodeId: 'node-1',
      payload: { alias: 'Test' },
    });
    expect(event.id).toBeGreaterThan(0);
    expect(event.event_type).toBe('network_created');
    expect(event.node_id).toBe('node-1');
    expect(JSON.parse(event.payload!)).toEqual({ alias: 'Test' });
    expect(event.timestamp).toBeGreaterThan(0);
  });

  it('should log an event without optional fields', () => {
    const event = repo.logEvent({
      networkId: 'net-1',
      eventType: 'status_changed',
    });
    expect(event.node_id).toBeNull();
    expect(event.payload).toBeNull();
  });

  it('should get an event by id', () => {
    const created = repo.logEvent({ networkId: 'net-1', eventType: 'test' });
    const event = repo.getEvent(created.id);
    expect(event).toBeDefined();
    expect(event!.event_type).toBe('test');
  });

  it('should get events with pagination', () => {
    for (let i = 0; i < 10; i++) {
      repo.logEvent({ networkId: 'net-1', eventType: `event_${i}` });
    }

    const page1 = repo.getEvents('net-1', 3, 0);
    expect(page1).toHaveLength(3);

    const page2 = repo.getEvents('net-1', 3, 3);
    expect(page2).toHaveLength(3);

    const all = repo.getEvents('net-1', 50, 0);
    expect(all).toHaveLength(10);
  });

  it('should get all network events', () => {
    repo.logEvent({ networkId: 'net-1', eventType: 'event_1' });
    repo.logEvent({ networkId: 'net-1', eventType: 'event_2' });

    const events = repo.getNetworkEvents('net-1');
    expect(events).toHaveLength(2);
  });

  it('should get events by type', () => {
    repo.logEvent({ networkId: 'net-1', eventType: 'member_joined' });
    repo.logEvent({ networkId: 'net-1', eventType: 'member_left' });
    repo.logEvent({ networkId: 'net-1', eventType: 'member_joined' });

    const joined = repo.getEventsByType('net-1', 'member_joined');
    expect(joined).toHaveLength(2);
  });

  it('should count events', () => {
    repo.logEvent({ networkId: 'net-1', eventType: 'event_1' });
    repo.logEvent({ networkId: 'net-1', eventType: 'event_2' });
    repo.logEvent({ networkId: 'net-1', eventType: 'event_3' });

    const count = repo.countEvents('net-1');
    expect(count).toBe(3);
  });

  it('should return 0 count for network with no events', () => {
    const count = repo.countEvents('net-1');
    expect(count).toBe(0);
  });
});
