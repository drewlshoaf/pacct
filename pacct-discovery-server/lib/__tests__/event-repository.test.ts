import { describe, it, expect, beforeEach } from 'vitest';
import { createMockPool } from './mock-pool';
import { EventRepository } from '../db/repositories/event-repository';

describe('EventRepository', () => {
  let repo: EventRepository;
  let mockQuery: ReturnType<typeof createMockPool>['mockQuery'];

  beforeEach(() => {
    const mock = createMockPool();
    repo = new EventRepository(mock.pool);
    mockQuery = mock.mockQuery;
  });

  describe('logEvent', () => {
    it('should generate correct INSERT with RETURNING', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, network_id: 'net-1', event_type: 'network_created', node_id: 'node-1', payload: { alias: 'Test' }, timestamp: 1000 }],
        rowCount: 1,
      });

      const result = await repo.logEvent({
        networkId: 'net-1',
        eventType: 'network_created',
        nodeId: 'node-1',
        payload: { alias: 'Test' },
      });

      const insertCall = mockQuery.mock.calls[0];
      expect(insertCall[0]).toContain('INSERT INTO event_log');
      expect(insertCall[0]).toContain('RETURNING *');
      expect(insertCall[1][0]).toBe('net-1');
      expect(insertCall[1][1]).toBe('network_created');
      expect(insertCall[1][2]).toBe('node-1');
      expect(insertCall[1][3]).toBe(JSON.stringify({ alias: 'Test' }));
      expect(result.id).toBe(1);
      expect(result.event_type).toBe('network_created');
    });

    it('should default optional fields to null', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 2, network_id: 'net-1', event_type: 'status_changed', node_id: null, payload: null, timestamp: 1000 }],
        rowCount: 1,
      });

      const result = await repo.logEvent({
        networkId: 'net-1',
        eventType: 'status_changed',
      });

      expect(mockQuery.mock.calls[0][1][2]).toBeNull(); // node_id
      expect(mockQuery.mock.calls[0][1][3]).toBeNull(); // payload
      expect(result.node_id).toBeNull();
      expect(result.payload).toBeNull();
    });
  });

  describe('getEvents', () => {
    it('should generate SELECT with limit and offset', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await repo.getEvents('net-1', 10, 5);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM event_log WHERE network_id = $1 ORDER BY timestamp DESC LIMIT $2 OFFSET $3',
        ['net-1', 10, 5],
      );
    });

    it('should use default limit and offset', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await repo.getEvents('net-1');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM event_log WHERE network_id = $1 ORDER BY timestamp DESC LIMIT $2 OFFSET $3',
        ['net-1', 50, 0],
      );
    });
  });

  describe('countEvents / getEventCount', () => {
    it('should generate correct COUNT query', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '5' }],
        rowCount: 1,
      });

      const result = await repo.countEvents('net-1');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM event_log WHERE network_id = $1',
        ['net-1'],
      );
      expect(result).toBe(5);
    });

    it('getEventCount delegates to countEvents', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '3' }],
        rowCount: 1,
      });

      const result = await repo.getEventCount('net-1');
      expect(result).toBe(3);
    });
  });

  describe('getRecentEvents', () => {
    it('should delegate to getEvents with limit', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await repo.getRecentEvents('net-1', 5);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM event_log WHERE network_id = $1 ORDER BY timestamp DESC LIMIT $2 OFFSET $3',
        ['net-1', 5, 0],
      );
    });
  });

  describe('getNetworkEvents', () => {
    it('should generate SELECT without limit', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await repo.getNetworkEvents('net-1');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM event_log WHERE network_id = $1 ORDER BY timestamp DESC',
        ['net-1'],
      );
    });
  });

  describe('getEventsByType', () => {
    it('should filter by event type', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await repo.getEventsByType('net-1', 'member_joined');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM event_log WHERE network_id = $1 AND event_type = $2 ORDER BY timestamp DESC',
        ['net-1', 'member_joined'],
      );
    });
  });

  describe('getEvent', () => {
    it('should generate correct SELECT by id', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, network_id: 'net-1', event_type: 'test', node_id: null, payload: null, timestamp: 1000 }],
        rowCount: 1,
      });

      const result = await repo.getEvent(1);

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM event_log WHERE id = $1',
        [1],
      );
      expect(result).toBeDefined();
      expect(result!.id).toBe(1);
    });
  });
});
