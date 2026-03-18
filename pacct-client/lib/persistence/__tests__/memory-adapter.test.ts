import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryAdapter } from '../memory-adapter';

describe('MemoryAdapter', () => {
  let adapter: MemoryAdapter;

  beforeEach(() => {
    adapter = new MemoryAdapter();
  });

  // Key-value
  describe('key-value operations', () => {
    it('get returns null for missing key', async () => {
      expect(await adapter.get('missing')).toBeNull();
    });

    it('set and get round-trip', async () => {
      await adapter.set('key1', 'value1');
      expect(await adapter.get('key1')).toBe('value1');
    });

    it('set overwrites existing value', async () => {
      await adapter.set('key1', 'v1');
      await adapter.set('key1', 'v2');
      expect(await adapter.get('key1')).toBe('v2');
    });

    it('delete removes key', async () => {
      await adapter.set('key1', 'value1');
      await adapter.delete('key1');
      expect(await adapter.get('key1')).toBeNull();
    });

    it('delete on missing key is no-op', async () => {
      await expect(adapter.delete('nope')).resolves.toBeUndefined();
    });
  });

  // Collection
  describe('collection operations', () => {
    interface TestItem {
      id: string;
      name: string;
      status: string;
    }

    it('getAll returns empty array for empty collection', async () => {
      expect(await adapter.getAll('stuff')).toEqual([]);
    });

    it('put and getById round-trip', async () => {
      const item: TestItem = { id: '1', name: 'Alice', status: 'active' };
      await adapter.put('users', item);
      expect(await adapter.getById<TestItem>('users', '1')).toEqual(item);
    });

    it('getById returns null for missing item', async () => {
      expect(await adapter.getById('users', 'nope')).toBeNull();
    });

    it('put overwrites existing item', async () => {
      await adapter.put('users', { id: '1', name: 'Alice', status: 'active' });
      await adapter.put('users', { id: '1', name: 'Alice', status: 'inactive' });
      const item = await adapter.getById<TestItem>('users', '1');
      expect(item?.status).toBe('inactive');
    });

    it('getAll returns all items in collection', async () => {
      await adapter.put('users', { id: '1', name: 'Alice', status: 'active' });
      await adapter.put('users', { id: '2', name: 'Bob', status: 'active' });
      const all = await adapter.getAll<TestItem>('users');
      expect(all).toHaveLength(2);
    });

    it('deleteById removes item', async () => {
      await adapter.put('users', { id: '1', name: 'Alice', status: 'active' });
      await adapter.deleteById('users', '1');
      expect(await adapter.getById('users', '1')).toBeNull();
    });

    it('deleteById on missing item is no-op', async () => {
      await expect(adapter.deleteById('users', 'nope')).resolves.toBeUndefined();
    });

    it('query filters by matching fields', async () => {
      await adapter.put('users', { id: '1', name: 'Alice', status: 'active' });
      await adapter.put('users', { id: '2', name: 'Bob', status: 'inactive' });
      await adapter.put('users', { id: '3', name: 'Carol', status: 'active' });

      const active = await adapter.query<TestItem>('users', { status: 'active' });
      expect(active).toHaveLength(2);
      expect(active.map((i) => i.name).sort()).toEqual(['Alice', 'Carol']);
    });

    it('query with no matches returns empty array', async () => {
      await adapter.put('users', { id: '1', name: 'Alice', status: 'active' });
      const result = await adapter.query<TestItem>('users', { status: 'deleted' });
      expect(result).toEqual([]);
    });

    it('collections are isolated', async () => {
      await adapter.put('users', { id: '1', name: 'Alice', status: 'active' });
      await adapter.put('networks', { id: '1', name: 'Net1', status: 'draft' });
      expect(await adapter.getAll('users')).toHaveLength(1);
      expect(await adapter.getAll('networks')).toHaveLength(1);
    });
  });
});
