export interface StorageAdapter {
  // Key-value for simple items (identity, preferences)
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;

  // Collection-based for structured data
  getAll<T>(collection: string): Promise<T[]>;
  getById<T>(collection: string, id: string): Promise<T | null>;
  put<T extends { id: string }>(collection: string, item: T): Promise<void>;
  deleteById(collection: string, id: string): Promise<void>;
  query<T>(collection: string, filter: Record<string, unknown>): Promise<T[]>;
}
