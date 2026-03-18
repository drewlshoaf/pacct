'use client';

import { useMemo } from 'react';
import type { NetworkState, RunSummary } from '@pacct/protocol-ts';
import { NetworkStatus, MemberStatus, RunStatus } from '@pacct/protocol-ts';
import { canInitiateRun, getActiveRun, checkCooldown, checkBudgetCap } from '@/lib/engines/run';
import { getActiveMembers, isNetworkComputationCapable } from '@/lib/engines/membership';
import { getMyNodeId } from '@/lib/mock/mock-data';
import type { RunPolicyConfig } from '@/lib/engines/types';

const DEFAULT_RUN_POLICY: RunPolicyConfig = {
  initiationMode: 'creator_initiated' as any,
  allowedInitiators: 'any_member',
  minimumIntervalMs: 24 * 3_600_000,
  maxRunsPerPeriod: 10,
  periodLengthDays: 30,
  requireCostEstimate: false,
  allMembersOnlineRequired: false,
  midRunDisconnectBehavior: 'abort' as any,
};

export interface NetworkStateComputed {
  isCreator: boolean;
  isMember: boolean;
  myMemberStatus: MemberStatus | null;
  isOnline: boolean;
  canLeave: boolean;
  canInitiateRunResult: { allowed: boolean; reason?: string };
  activeRun: RunSummary | undefined;
  activeMemberCount: number;
  totalMemberCount: number;
  completedRunCount: number;
  cooldownRemainingMs: number;
  budgetUsed: number;
  budgetMax: number;
  periodLengthDays: number;
}

export function useNetworkState(network: NetworkState | null): NetworkStateComputed {
  const myNodeId = getMyNodeId();

  return useMemo(() => {
    if (!network) {
      return {
        isCreator: false,
        isMember: false,
        myMemberStatus: null,
        isOnline: false,
        canLeave: false,
        canInitiateRunResult: { allowed: false, reason: 'No network loaded' },
        activeRun: undefined,
        activeMemberCount: 0,
        totalMemberCount: 0,
        completedRunCount: 0,
        cooldownRemainingMs: 0,
        budgetUsed: 0,
        budgetMax: DEFAULT_RUN_POLICY.maxRunsPerPeriod,
        periodLengthDays: DEFAULT_RUN_POLICY.periodLengthDays,
      };
    }

    const now = Date.now();
    const isCreator = network.creatorNodeId === myNodeId;
    const myMember = network.members.find((m) => m.nodeId === myNodeId);
    const isMember = !!myMember && myMember.status !== MemberStatus.Left && myMember.status !== MemberStatus.Expelled;
    const myMemberStatus = myMember?.status ?? null;
    const isOnline = myMember?.status === MemberStatus.Active;
    const canLeave = isMember && network.status !== NetworkStatus.Dissolved;

    const canInitiateRunResult = canInitiateRun(network, myNodeId, DEFAULT_RUN_POLICY, now);
    const activeRun = getActiveRun(network);
    const activeMembers = getActiveMembers(network);
    const activeMemberCount = activeMembers.length;
    const totalMemberCount = network.members.length;
    const completedRunCount = network.runHistory.filter((r) => r.status === RunStatus.Completed).length;

    // Cooldown
    const lastCompleted = [...network.runHistory]
      .filter((r) => r.completedAt !== undefined)
      .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))[0];
    const cooldownEnd = lastCompleted?.completedAt
      ? lastCompleted.completedAt + DEFAULT_RUN_POLICY.minimumIntervalMs
      : 0;
    const cooldownRemainingMs = Math.max(0, cooldownEnd - now);

    // Budget
    const periodMs = DEFAULT_RUN_POLICY.periodLengthDays * 86_400_000;
    const periodStart = now - periodMs;
    const budgetUsed = network.runHistory.filter(
      (r) => r.startedAt >= periodStart && r.status !== RunStatus.Aborted,
    ).length;

    return {
      isCreator,
      isMember,
      myMemberStatus,
      isOnline,
      canLeave,
      canInitiateRunResult,
      activeRun,
      activeMemberCount,
      totalMemberCount,
      completedRunCount,
      cooldownRemainingMs,
      budgetUsed,
      budgetMax: DEFAULT_RUN_POLICY.maxRunsPerPeriod,
      periodLengthDays: DEFAULT_RUN_POLICY.periodLengthDays,
    };
  }, [network, myNodeId]);
}
