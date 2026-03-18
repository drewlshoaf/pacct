import type { StorageAdapter } from './storage-adapter';

// Type-only references to idb — this module is browser-only.
// At runtime it dynamically imports 'idb'.
interface IDBPDatabase {
  get(storeName: string, key: string): Promise<unknown>;
  put(storeName: string, value: unknown, key?: string): Promise<unknown>;
  delete(storeName: string, key: string): Promise<void>;
  getAll(storeName: string): Promise<unknown[]>;
  transaction(storeNames: string | string[], mode?: string): unknown;
}

const DB_NAME = 'pacct-node';
const DB_VERSION = 1;
const KV_STORE = 'keyvalue';
const COLLECTION_STORES = ['networks', 'drafts', 'specs', 'applications', 'runs'];

export class IndexedDBAdapter implements StorageAdapter {
  private db: IDBPDatabase | null = null;

  private async getDb(): Promise<IDBPDatabase> {
    if (this.db) return this.db;
    // Dynamic import so this file can be parsed in Node without failing
    const { openDB } = await import('idb');
    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db: { createObjectStore: (name: string, opts?: { keyPath?: string }) => void }) {
        if (!((db as unknown as { objectStoreNames: { contains: (n: string) => boolean } }).objectStoreNames.contains(KV_STORE))) {
          db.createObjectStore(KV_STORE);
        }
        for (const store of COLLECTION_STORES) {
          if (!((db as unknown as { objectStoreNames: { contains: (n: string) => boolean } }).objectStoreNames.contains(store))) {
            db.createObjectStore(store, { keyPath: 'id' });
          }
        }
      },
    }) as unknown as IDBPDatabase;
    return this.db;
  }

  async get(key: string): Promise<string | null> {
    const db = await this.getDb();
    const val = await db.get(KV_STORE, key);
    return (val as string) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    const db = await this.getDb();
    await db.put(KV_STORE, value, key);
  }

  async delete(key: string): Promise<void> {
    const db = await this.getDb();
    await db.delete(KV_STORE, key);
  }

  async getAll<T>(collection: string): Promise<T[]> {
    const db = await this.getDb();
    return (await db.getAll(collection)) as T[];
  }

  async getById<T>(collection: string, id: string): Promise<T | null> {
    const db = await this.getDb();
    const val = await db.get(collection, id);
    return (val as T) ?? null;
  }

  async put<T extends { id: string }>(collection: string, item: T): Promise<void> {
    const db = await this.getDb();
    await db.put(collection, item);
  }

  async deleteById(collection: string, id: string): Promise<void> {
    const db = await this.getDb();
    await db.delete(collection, id);
  }

  async query<T>(collection: string, filter: Record<string, unknown>): Promise<T[]> {
    const all = await this.getAll<T>(collection);
    return all.filter((item) => {
      const record = item as Record<string, unknown>;
      return Object.entries(filter).every(([key, value]) => record[key] === value);
    });
  }
}
