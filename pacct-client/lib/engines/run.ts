import type {
  NetworkState,
  NodeId,
  RunId,
  Timestamp,
  RunSummary,
} from '@pacct/protocol-ts';
import { RunStatus, NetworkStatus, MemberStatus } from '@pacct/protocol-ts';
import type { RunPolicyConfig } from './types';

export function canInitiateRun(
  state: NetworkState,
  initiatorNodeId: NodeId,
  runPolicy: RunPolicyConfig,
  now: Timestamp,
): { allowed: boolean; reason?: string } {
  // Network must be active
  if (state.status !== NetworkStatus.Active) {
    return { allowed: false, reason: 'Network is not active' };
  }

  // Check initiator authorization
  if (runPolicy.allowedInitiators === 'creator_only') {
    if (initiatorNodeId !== state.creatorNodeId) {
      return { allowed: false, reason: 'Only the network creator can initiate runs' };
    }
  }

  // Initiator must be an active member
  const initiator = state.members.find((m) => m.nodeId === initiatorNodeId);
  if (!initiator || initiator.status !== MemberStatus.Active) {
    return { allowed: false, reason: 'Initiator is not an active member' };
  }

  // Check if all members are online (if required)
  if (runPolicy.allMembersOnlineRequired) {
    const hasOffline = state.members.some(
      (m) => m.status === MemberStatus.Offline,
    );
    if (hasOffline) {
      return { allowed: false, reason: 'Not all required members are online' };
    }
  }

  // No active run
  if (getActiveRun(state)) {
    return { allowed: false, reason: 'A run is already in progress' };
  }

  // Cooldown check
  const lastCompleted = getLastCompletedRun(state.runHistory);
  if (!checkCooldown(lastCompleted?.completedAt, now, runPolicy.minimumIntervalMs)) {
    return { allowed: false, reason: 'Minimum interval between runs has not elapsed' };
  }

  // Budget cap check
  if (!checkBudgetCap(state.runHistory, now, runPolicy.maxRunsPerPeriod, runPolicy.periodLengthDays)) {
    return { allowed: false, reason: 'Maximum runs per period exceeded' };
  }

  return { allowed: true };
}

export function initiateRun(
  state: NetworkState,
  runId: RunId,
  initiatorNodeId: NodeId,
  timestamp: Timestamp,
): NetworkState {
  const participantNodeIds = state.members
    .filter((m) => m.status === MemberStatus.Active || m.status === MemberStatus.Offline)
    .map((m) => m.nodeId);

  const run: RunSummary = {
    runId,
    networkId: state.networkId,
    status: RunStatus.Pending,
    initiatorNodeId,
    startedAt: timestamp,
    participantNodeIds,
  };

  return {
    ...state,
    runHistory: [...state.runHistory, run],
  };
}

export function abortRun(
  state: NetworkState,
  runId: RunId,
  reason: string,
  timestamp: Timestamp,
): NetworkState {
  return {
    ...state,
    runHistory: state.runHistory.map((r) =>
      r.runId === runId
        ? { ...r, status: RunStatus.Aborted, abortedAt: timestamp }
        : r,
    ),
  };
}

export function completeRun(
  state: NetworkState,
  runId: RunId,
  timestamp: Timestamp,
): NetworkState {
  return {
    ...state,
    runHistory: state.runHistory.map((r) =>
      r.runId === runId
        ? { ...r, status: RunStatus.Completed, completedAt: timestamp }
        : r,
    ),
  };
}

export function failRun(
  state: NetworkState,
  runId: RunId,
  reason: string,
  timestamp: Timestamp,
): NetworkState {
  return {
    ...state,
    runHistory: state.runHistory.map((r) =>
      r.runId === runId
        ? { ...r, status: RunStatus.Failed, abortedAt: timestamp }
        : r,
    ),
  };
}

export function checkCooldown(
  lastRunCompletedAt: Timestamp | undefined,
  now: Timestamp,
  minimumIntervalMs: number,
): boolean {
  if (lastRunCompletedAt === undefined) return true;
  return now - lastRunCompletedAt >= minimumIntervalMs;
}

export function checkBudgetCap(
  runHistory: RunSummary[],
  now: Timestamp,
  maxRunsPerPeriod: number,
  periodLengthDays: number,
): boolean {
  const periodMs = periodLengthDays * 24 * 60 * 60 * 1000;
  const periodStart = now - periodMs;

  const runsInPeriod = runHistory.filter(
    (r) => r.startedAt >= periodStart && r.status !== RunStatus.Aborted,
  ).length;

  return runsInPeriod < maxRunsPerPeriod;
}

export function getActiveRun(state: NetworkState): RunSummary | undefined {
  return state.runHistory.find(
    (r) =>
      r.status !== RunStatus.Completed &&
      r.status !== RunStatus.Aborted &&
      r.status !== RunStatus.Failed,
  );
}

function getLastCompletedRun(runHistory: RunSummary[]): RunSummary | undefined {
  return [...runHistory]
    .filter((r) => r.completedAt !== undefined)
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))[0];
}
