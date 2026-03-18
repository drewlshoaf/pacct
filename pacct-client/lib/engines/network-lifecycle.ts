import type { NetworkState, Timestamp } from '@pacct/protocol-ts';
import { NetworkStatus, MemberStatus } from '@pacct/protocol-ts';
import type { TransitionError } from './types';

// Valid transition map
const VALID_TRANSITIONS: Record<string, NetworkStatus[]> = {
  [NetworkStatus.Draft]: [NetworkStatus.Pending],
  [NetworkStatus.Pending]: [NetworkStatus.Active, NetworkStatus.Dissolved],
  [NetworkStatus.Active]: [NetworkStatus.Degraded, NetworkStatus.Dissolved],
  [NetworkStatus.Degraded]: [
    NetworkStatus.Active,
    NetworkStatus.Dissolved,
  ],
  [NetworkStatus.Dissolved]: [NetworkStatus.Archived],
  [NetworkStatus.Archived]: [],
};

export function canTransition(
  from: NetworkStatus,
  to: NetworkStatus,
): boolean {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

export function transition(
  state: NetworkState,
  to: NetworkStatus,
  reason: string,
): NetworkState | TransitionError {
  if (!canTransition(state.status, to)) {
    return {
      error: true,
      message: `Invalid transition from ${state.status} to ${to}: ${reason}`,
      from: state.status,
      to,
    };
  }

  const updates: Partial<NetworkState> = { status: to };

  if (to === NetworkStatus.Active && !state.activatedAt) {
    updates.activatedAt = Date.now();
  }
  if (to === NetworkStatus.Dissolved) {
    updates.dissolvedAt = Date.now();
  }
  // When transitioning to degraded, mark active members as pending_reack
  if (to === NetworkStatus.Degraded) {
    updates.members = state.members.map((m) =>
      m.status === MemberStatus.Active
        ? { ...m, status: MemberStatus.PendingReAck }
        : m,
    );
  }

  return { ...state, ...updates };
}

export function checkPreActivationTimeout(
  state: NetworkState,
  now: Timestamp,
  timeoutMs: number,
): boolean {
  if (state.status !== NetworkStatus.Pending) return false;
  return now - state.createdAt >= timeoutMs;
}

export function checkPostActivationInactivity(
  state: NetworkState,
  now: Timestamp,
  timeoutMs: number,
): boolean {
  if (state.status !== NetworkStatus.Active) return false;
  // Check time since last completed run, or since activation if no runs
  const lastCompleted = [...state.runHistory]
    .filter((r) => r.completedAt !== undefined)
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))[0];

  const referenceTime = lastCompleted?.completedAt ?? state.activatedAt ?? state.createdAt;
  return now - referenceTime >= timeoutMs;
}

export function shouldDissolve(
  state: NetworkState,
  minActiveMembers: number,
): boolean {
  const activeCount = state.members.filter(
    (m) =>
      m.status === MemberStatus.Active ||
      m.status === MemberStatus.PendingReAck ||
      m.status === MemberStatus.Offline,
  ).length;
  return activeCount < minActiveMembers;
}
