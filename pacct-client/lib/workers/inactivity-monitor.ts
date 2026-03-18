import type { NetworkState } from '@pacct/protocol-ts';
import { NetworkStatus } from '@pacct/protocol-ts';

export interface InactivityMonitorConfig {
  preActivationTimeoutMs: number;
  postActivationInactivityTimeoutMs: number;
  warnBeforeDissolveMs?: number;
  checkIntervalMs: number;
}

export type InactivityEvent =
  | { type: 'pre_activation_warning'; networkId: string; remainingMs: number }
  | { type: 'pre_activation_expired'; networkId: string }
  | { type: 'post_activation_warning'; networkId: string; remainingMs: number }
  | { type: 'post_activation_expired'; networkId: string };

export class InactivityMonitor {
  private intervalId?: ReturnType<typeof setInterval>;
  private callbacks: ((event: InactivityEvent) => void)[] = [];

  constructor(private config: InactivityMonitorConfig) {}

  start(networkState: NetworkState): void {
    this.stop();
    this.intervalId = setInterval(() => {
      const event = this.check(networkState, Date.now());
      if (event) {
        for (const cb of this.callbacks) {
          cb(event);
        }
      }
    }, this.config.checkIntervalMs);
  }

  stop(): void {
    if (this.intervalId !== undefined) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  check(networkState: NetworkState, now: number): InactivityEvent | null {
    const networkId = networkState.networkId as string;

    if (networkState.status === NetworkStatus.Pending) {
      const elapsed = now - networkState.createdAt;
      const remaining = this.config.preActivationTimeoutMs - elapsed;

      if (remaining <= 0) {
        return { type: 'pre_activation_expired', networkId };
      }

      if (
        this.config.warnBeforeDissolveMs !== undefined &&
        remaining <= this.config.warnBeforeDissolveMs
      ) {
        return { type: 'pre_activation_warning', networkId, remainingMs: remaining };
      }
    }

    if (networkState.status === NetworkStatus.Active) {
      const lastCompleted = [...networkState.runHistory]
        .filter(r => r.completedAt !== undefined)
        .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))[0];

      const referenceTime =
        lastCompleted?.completedAt ?? networkState.activatedAt ?? networkState.createdAt;
      const elapsed = now - referenceTime;
      const remaining = this.config.postActivationInactivityTimeoutMs - elapsed;

      if (remaining <= 0) {
        return { type: 'post_activation_expired', networkId };
      }

      if (
        this.config.warnBeforeDissolveMs !== undefined &&
        remaining <= this.config.warnBeforeDissolveMs
      ) {
        return { type: 'post_activation_warning', networkId, remainingMs: remaining };
      }
    }

    return null;
  }

  onEvent(callback: (event: InactivityEvent) => void): void {
    this.callbacks.push(callback);
  }
}
