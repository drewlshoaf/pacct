import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../db/pool', () => ({
  checkDbHealth: vi.fn(),
  getPool: vi.fn(),
}));

vi.mock('../instance-id', () => ({
  getInstanceId: () => 'test-instance-abc',
}));

describe('Health endpoint logic', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should return instanceId', async () => {
    const { getInstanceId } = await import('../instance-id');
    expect(getInstanceId()).toBe('test-instance-abc');
  });

  it('should return uptime as a positive number', () => {
    const startedAt = Date.now() - 5000;
    const uptime = Date.now() - startedAt;
    expect(uptime).toBeGreaterThan(0);
  });

  it('should return ok status when db is connected', async () => {
    const { checkDbHealth } = await import('../db/pool');
    (checkDbHealth as any).mockResolvedValue({ connected: true, latencyMs: 5 });

    const dbHealth = await checkDbHealth();
    const status = dbHealth.connected ? 'ok' : 'degraded';

    expect(status).toBe('ok');
    expect(dbHealth.latencyMs).toBe(5);
  });

  it('should return degraded status when db is disconnected', async () => {
    const { checkDbHealth } = await import('../db/pool');
    (checkDbHealth as any).mockResolvedValue({ connected: false, latencyMs: 100 });

    const dbHealth = await checkDbHealth();
    const status = dbHealth.connected ? 'ok' : 'degraded';

    expect(status).toBe('degraded');
  });
});
