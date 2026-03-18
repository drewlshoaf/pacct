import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the pg module
vi.mock('pg', () => {
  const mockPool = {
    query: vi.fn(),
    end: vi.fn(),
  };
  return {
    Pool: vi.fn(() => mockPool),
    __mockPool: mockPool,
  };
});

describe('Pool utilities', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('checkDbHealth returns connected=true on successful query', async () => {
    // Re-import after module reset to get fresh state
    const pg = await import('pg');
    const mockPool = (pg as any).__mockPool;
    mockPool.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

    const { checkDbHealth } = await import('../db/pool');
    const health = await checkDbHealth();

    expect(health.connected).toBe(true);
    expect(health.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('checkDbHealth returns connected=false on error', async () => {
    const pg = await import('pg');
    const mockPool = (pg as any).__mockPool;
    mockPool.query.mockRejectedValueOnce(new Error('Connection refused'));

    const { checkDbHealth } = await import('../db/pool');
    const health = await checkDbHealth();

    expect(health.connected).toBe(false);
  });
});
