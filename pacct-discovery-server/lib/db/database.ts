// Legacy module — replaced by pool.ts for PostgreSQL support.
// Re-exports pool utilities so existing imports continue to resolve.
export { getPool, initializeDatabase, closePool, checkDbHealth } from './pool';
