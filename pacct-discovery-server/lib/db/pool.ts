import { Pool, PoolConfig } from 'pg';
import fs from 'fs';
import path from 'path';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const config: PoolConfig = {
      connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/pacct_discovery',
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };
    pool = new Pool(config);
  }
  return pool;
}

export async function initializeDatabase(): Promise<void> {
  const p = getPool();
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  await p.query(schema);
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function checkDbHealth(): Promise<{ connected: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    const p = getPool();
    await p.query('SELECT 1');
    return { connected: true, latencyMs: Date.now() - start };
  } catch {
    return { connected: false, latencyMs: Date.now() - start };
  }
}
