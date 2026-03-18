import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InactivityMonitor } from '../inactivity-monitor';
import type { InactivityEvent } from '../inactivity-monitor';
import { NetworkStatus, RunStatus } from '@pacct/protocol-ts';
import type { NetworkState } from '@pacct/protocol-ts';
import {
  createTestNetworkState,
  createTestRunSummary,
  testRunId,
} from '../../engines/__tests__/helpers';

describe('InactivityMonitor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires pre_activation_expired when network stays pending too long', () => {
    const monitor = new InactivityMonitor({
      preActivationTimeoutMs: 10000,
      postActivationInactivityTimeoutMs: 50000,
      checkIntervalMs: 1000,
    });

    const state = createTestNetworkState({
      status: NetworkStatus.Pending,
      createdAt: 1000,
    });

    const event = monitor.check(state, 12000);
    expect(event).not.toBeNull();
    expect(event!.type).toBe('pre_activation_expired');
  });

  it('fires post_activation_expired when no runs complete in time', () => {
    const monitor = new InactivityMonitor({
      preActivationTimeoutMs: 10000,
      postActivationInactivityTimeoutMs: 50000,
      checkIntervalMs: 1000,
    });

    const state = createTestNetworkState({
      status: NetworkStatus.Active,
      activatedAt: 1000,
      runHistory: [],
    });

    const event = monitor.check(state, 52000);
    expect(event).not.toBeNull();
    expect(event!.type).toBe('post_activation_expired');
  });

  it('fires pre_activation_warning before timeout', () => {
    const monitor = new InactivityMonitor({
      preActivationTimeoutMs: 10000,
      postActivationInactivityTimeoutMs: 50000,
      warnBeforeDissolveMs: 3000,
      checkIntervalMs: 1000,
    });

    const state = createTestNetworkState({
      status: NetworkStatus.Pending,
      createdAt: 1000,
    });

    // 8500ms elapsed = 1500ms remaining, which is within warnBeforeDissolveMs
    const event = monitor.check(state, 9500);
    expect(event).not.toBeNull();
    expect(event!.type).toBe('pre_activation_warning');
    expect((event as any).remainingMs).toBe(1500);
  });

  it('fires post_activation_warning before timeout', () => {
    const monitor = new InactivityMonitor({
      preActivationTimeoutMs: 10000,
      postActivationInactivityTimeoutMs: 50000,
      warnBeforeDissolveMs: 5000,
      checkIntervalMs: 1000,
    });

    const state = createTestNetworkState({
      status: NetworkStatus.Active,
      activatedAt: 1000,
      runHistory: [],
    });

    // 47000ms elapsed = 3000ms remaining
    const event = monitor.check(state, 48000);
    expect(event).not.toBeNull();
    expect(event!.type).toBe('post_activation_warning');
    expect((event as any).remainingMs).toBe(3000);
  });

  it('returns null when within time limits', () => {
    const monitor = new InactivityMonitor({
      preActivationTimeoutMs: 10000,
      postActivationInactivityTimeoutMs: 50000,
      checkIntervalMs: 1000,
    });

    const state = createTestNetworkState({
      status: NetworkStatus.Pending,
      createdAt: 1000,
    });

    const event = monitor.check(state, 5000);
    expect(event).toBeNull();
  });

  it('returns null for active network with recent run', () => {
    const monitor = new InactivityMonitor({
      preActivationTimeoutMs: 10000,
      postActivationInactivityTimeoutMs: 50000,
      checkIntervalMs: 1000,
    });

    const state = createTestNetworkState({
      status: NetworkStatus.Active,
      activatedAt: 1000,
      runHistory: [
        createTestRunSummary({
          runId: testRunId('run-1'),
          status: RunStatus.Completed,
          completedAt: 40000,
        }),
      ],
    });

    // 45000ms since creation, but only 5000ms since last run completed
    const event = monitor.check(state, 45000);
    expect(event).toBeNull();
  });

  it('stop prevents further checks', () => {
    const events: InactivityEvent[] = [];
    const monitor = new InactivityMonitor({
      preActivationTimeoutMs: 100,
      postActivationInactivityTimeoutMs: 200,
      checkIntervalMs: 50,
    });

    monitor.onEvent((e) => events.push(e));

    const state = createTestNetworkState({
      status: NetworkStatus.Pending,
      createdAt: 0,
    });

    vi.setSystemTime(200);
    monitor.start(state);

    // Advance enough for one check
    vi.advanceTimersByTime(50);
    const eventCountAfterFirst = events.length;
    expect(eventCountAfterFirst).toBeGreaterThan(0);

    monitor.stop();

    // Advance more - should not fire more events
    vi.advanceTimersByTime(200);
    expect(events.length).toBe(eventCountAfterFirst);
  });

  it('start fires events on interval via callbacks', () => {
    const events: InactivityEvent[] = [];
    const monitor = new InactivityMonitor({
      preActivationTimeoutMs: 100,
      postActivationInactivityTimeoutMs: 200,
      checkIntervalMs: 50,
    });

    monitor.onEvent((e) => events.push(e));

    const state = createTestNetworkState({
      status: NetworkStatus.Pending,
      createdAt: 0,
    });

    vi.setSystemTime(200);
    monitor.start(state);
    vi.advanceTimersByTime(100); // Two intervals
    monitor.stop();

    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].type).toBe('pre_activation_expired');
  });
});
