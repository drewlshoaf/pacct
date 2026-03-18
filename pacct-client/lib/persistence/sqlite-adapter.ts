import type { StorageAdapter } from './storage-adapter';

// Type-only reference — resolved at runtime via dynamic import or require
interface BetterSqliteDb {
  prepare(sql: string): {
    run(...params: unknown[]): void;
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
  };
  exec(sql: string): void;
  close(): void;
}

export class SQLiteAdapter implements StorageAdapter {
  private db: BetterSqliteDb;

  constructor(dbPath: string = ':memory:') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Database = require('better-sqlite3');
    this.db = new Database(dbPath) as BetterSqliteDb;
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS keyvalue (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS collections (
        collection TEXT NOT NULL,
        id TEXT NOT NULL,
        data TEXT NOT NULL,
        PRIMARY KEY (collection, id)
      )
    `);
  }

  async get(key: string): Promise<string | null> {
    const row = this.db.prepare('SELECT value FROM keyvalue WHERE key = ?').get(key) as
      | { value: string }
      | undefined;
    return row?.value ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.db
      .prepare('INSERT OR REPLACE INTO keyvalue (key, value) VALUES (?, ?)')
      .run(key, value);
  }

  async delete(key: string): Promise<void> {
    this.db.prepare('DELETE FROM keyvalue WHERE key = ?').run(key);
  }

  async getAll<T>(collection: string): Promise<T[]> {
    const rows = this.db
      .prepare('SELECT data FROM collections WHERE collection = ?')
      .all(collection) as { data: string }[];
    return rows.map((r) => JSON.parse(r.data) as T);
  }

  async getById<T>(collection: string, id: string): Promise<T | null> {
    const row = this.db
      .prepare('SELECT data FROM collections WHERE collection = ? AND id = ?')
      .get(collection, id) as { data: string } | undefined;
    return row ? (JSON.parse(row.data) as T) : null;
  }

  async put<T extends { id: string }>(collection: string, item: T): Promise<void> {
    this.db
      .prepare(
        'INSERT OR REPLACE INTO collections (collection, id, data) VALUES (?, ?, ?)',
      )
      .run(collection, item.id, JSON.stringify(item));
  }

  async deleteById(collection: string, id: string): Promise<void> {
    this.db
      .prepare('DELETE FROM collections WHERE collection = ? AND id = ?')
      .run(collection, id);
  }

  async query<T>(collection: string, filter: Record<string, unknown>): Promise<T[]> {
    const all = await this.getAll<T>(collection);
    return all.filter((item) => {
      const record = item as Record<string, unknown>;
      return Object.entries(filter).every(([key, value]) => record[key] === value);
    });
  }

  close(): void {
    this.db.close();
  }
}
