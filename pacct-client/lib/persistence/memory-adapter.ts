import type { StorageAdapter } from './storage-adapter';

export class MemoryAdapter implements StorageAdapter {
  private kv = new Map<string, string>();
  private collections = new Map<string, Map<string, unknown>>();

  private getCollection(name: string): Map<string, unknown> {
    let col = this.collections.get(name);
    if (!col) {
      col = new Map<string, unknown>();
      this.collections.set(name, col);
    }
    return col;
  }

  async get(key: string): Promise<string | null> {
    return this.kv.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.kv.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.kv.delete(key);
  }

  async getAll<T>(collection: string): Promise<T[]> {
    const col = this.getCollection(collection);
    return Array.from(col.values()) as T[];
  }

  async getById<T>(collection: string, id: string): Promise<T | null> {
    const col = this.getCollection(collection);
    return (col.get(id) as T) ?? null;
  }

  async put<T extends { id: string }>(collection: string, item: T): Promise<void> {
    const col = this.getCollection(collection);
    col.set(item.id, item);
  }

  async deleteById(collection: string, id: string): Promise<void> {
    const col = this.getCollection(collection);
    col.delete(id);
  }

  async query<T>(collection: string, filter: Record<string, unknown>): Promise<T[]> {
    const all = await this.getAll<T>(collection);
    return all.filter((item) => {
      const record = item as Record<string, unknown>;
      return Object.entries(filter).every(([key, value]) => record[key] === value);
    });
  }
}
