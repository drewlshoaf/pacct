import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HeartbeatManager } from '../heartbeat-manager';

describe('HeartbeatManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('records heartbeats correctly', () => {
    const hb = new HeartbeatManager({ intervalMs: 30000, staleThresholdMs: 90000 });

    hb.recordHeartbeat('node-1', 1000);
    hb.recordHeartbeat('node-2', 2000);

    expect(hb.isPeerStale('node-1', 50000)).toBe(false);
    expect(hb.isPeerStale('node-2', 50000)).toBe(false);
  });

  it('detects stale peers after threshold', () => {
    const hb = new HeartbeatManager({ intervalMs: 30000, staleThresholdMs: 90000 });

    hb.recordHeartbeat('node-1', 1000);
    hb.recordHeartbeat('node-2', 50000);

    const stalePeers = hb.getStalePeers(100000);
    expect(stalePeers).toContain('node-1');
    expect(stalePeers).not.toContain('node-2');
  });

  it('returns true for unknown peer in isPeerStale', () => {
    const hb = new HeartbeatManager({ intervalMs: 30000, staleThresholdMs: 90000 });
    expect(hb.isPeerStale('unknown-node', Date.now())).toBe(true);
  });

  it('detects recovery when heartbeat resumes', () => {
    const hb = new HeartbeatManager({ intervalMs: 30000, staleThresholdMs: 90000 });
    const recovered: string[] = [];
    hb.onPeerRecoveredFromStale((nodeId) => recovered.push(nodeId));

    // Record initial heartbeat
    hb.recordHeartbeat('node-1', 1000);

    // Send heartbeat to trigger stale check
    const sendFn = vi.fn();
    hb.start(sendFn);

    // Advance past stale threshold
    vi.advanceTimersByTime(90001);

    // At this point node-1 should be detected as stale by the internal check

    // Node recovers by sending a heartbeat
    hb.recordHeartbeat('node-1', 91002);

    expect(recovered).toContain('node-1');
    hb.stop();
  });

  it('fires stale callback when peer becomes stale', () => {
    const hb = new HeartbeatManager({ intervalMs: 1000, staleThresholdMs: 5000 });
    const stale: string[] = [];
    hb.onPeerBecameStale((nodeId) => stale.push(nodeId));

    hb.recordHeartbeat('node-1', 0);

    const sendFn = vi.fn();
    hb.start(sendFn);

    // Advance past stale threshold
    vi.advanceTimersByTime(6000);

    expect(stale).toContain('node-1');
    hb.stop();
  });

  it('calls sendHeartbeat on each interval tick', () => {
    const hb = new HeartbeatManager({ intervalMs: 1000, staleThresholdMs: 5000 });
    const sendFn = vi.fn();
    hb.start(sendFn);

    vi.advanceTimersByTime(3000);

    expect(sendFn).toHaveBeenCalledTimes(3);
    hb.stop();
  });

  it('stop prevents further ticks', () => {
    const hb = new HeartbeatManager({ intervalMs: 1000, staleThresholdMs: 5000 });
    const sendFn = vi.fn();
    hb.start(sendFn);

    vi.advanceTimersByTime(2000);
    const callCount = sendFn.mock.calls.length;

    hb.stop();
    vi.advanceTimersByTime(5000);

    expect(sendFn).toHaveBeenCalledTimes(callCount);
  });

  it('does not fire stale callback twice for same peer without recovery', () => {
    const hb = new HeartbeatManager({ intervalMs: 1000, staleThresholdMs: 3000 });
    const stale: string[] = [];
    hb.onPeerBecameStale((nodeId) => stale.push(nodeId));

    hb.recordHeartbeat('node-1', 0);
    const sendFn = vi.fn();
    hb.start(sendFn);

    vi.advanceTimersByTime(10000);

    // Should only fire once for node-1
    const node1Count = stale.filter(n => n === 'node-1').length;
    expect(node1Count).toBe(1);
    hb.stop();
  });
});
