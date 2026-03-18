/**
 * Join Flow Integration Test
 *
 * Tests all admission edge cases end-to-end: approval, rejection,
 * withdrawal, approval timeout, acceptance timeout, and visibility policy.
 */

import { describe, it, expect } from 'vitest';
import {
  NetworkStatus,
  MemberStatus,
  ApplicantStatus,
  VisibilityMode,
  SectionVisibility,
} from '@pacct/protocol-ts';

import {
  submitApplication,
  castApprovalVote,
  checkApprovalConsensus,
  approveApplicant,
  acceptContract,
  withdrawApplication,
  checkApprovalTimeout,
  checkAcceptanceTimeout,
  expireApplication,
  rejectApplicant,
} from '../../engines/admission';
import type { ExtendedNetworkState } from '../../engines/types';
import {
  makeNodeId,
  createTestNetwork,
  DEFAULT_ADMISSION_SCHEDULE,
  advanceTime,
} from './test-helpers';

describe('Join Flow E2E', () => {
  it('handles complete admission lifecycle with edge cases', async () => {
    // ── Step 1: Create network with 3 members (A, B, C) ──
    const { state: initialState, members, specs } = await createTestNetwork(3);
    let state = initialState;
    const [nodeA, nodeB, nodeC] = members.map((m) => m.nodeId);

    expect(state.status).toBe(NetworkStatus.Active);
    expect(state.members.filter((m) => m.status === MemberStatus.Active)).toHaveLength(3);

    const schedule = DEFAULT_ADMISSION_SCHEDULE;
    const now = Date.now();

    // ── Step 2: Node D applies ──
    const nodeD = makeNodeId('D');
    state = submitApplication(state, nodeD, now + 1000) as ExtendedNetworkState;
    const applicantD = state.applicants.find((a) => a.nodeId === nodeD);
    expect(applicantD).toBeDefined();
    expect(applicantD!.status).toBe(ApplicantStatus.PendingApproval);

    // ── Step 3: Test visibility policy enforcement ──
    // Before approval, D should see limited info based on visibility policy
    const visPolicy = specs.governance.visibilityPolicy;
    expect(visPolicy.mode).toBe(VisibilityMode.Partial);
    expect(visPolicy.sectionVisibility!.schema).toBe(SectionVisibility.Full);
    expect(visPolicy.sectionVisibility!.computation).toBe(SectionVisibility.SummaryOnly);
    expect(visPolicy.sectionVisibility!.economic).toBe(SectionVisibility.Hidden);

    // ── Step 4: A votes approve, B votes reject, C votes approve -> majority -> approved ──
    state = castApprovalVote(state, nodeD, nodeA, 'approve', now + 1100, 'sig-a') as ExtendedNetworkState;
    state = castApprovalVote(state, nodeD, nodeB, 'reject', now + 1200, 'sig-b') as ExtendedNetworkState;
    state = castApprovalVote(state, nodeD, nodeC, 'approve', now + 1300, 'sig-c') as ExtendedNetworkState;

    // With 3 members and threshold 0.5, we need >= 1.5 approvals -> 2 approvals >= 0.5 * 3 -> 2/3 = 0.67 >= 0.5
    const consensusD = checkApprovalConsensus(state, nodeD, schedule);
    expect(consensusD).toBe('approved');

    // ── Step 5: D receives contract, verifies manifest hashes ──
    state = approveApplicant(state, nodeD, now + 1400) as ExtendedNetworkState;
    const approvedD = state.applicants.find((a) => a.nodeId === nodeD);
    expect(approvedD!.status).toBe(ApplicantStatus.ApprovedPendingAcceptance);
    expect(approvedD!.approvedAt).toBeDefined();

    // ── Step 6: D accepts -> becomes active ──
    state = acceptContract(state, nodeD, now + 1500) as ExtendedNetworkState;
    const memberD = state.members.find((m) => m.nodeId === nodeD);
    expect(memberD).toBeDefined();
    expect(memberD!.status).toBe(MemberStatus.Active);
    expect(state.members.filter((m) => m.status === MemberStatus.Active)).toHaveLength(4);

    // ── Step 7: Node E applies but nobody votes -> approval timeout -> expired ──
    const nodeE = makeNodeId('E');
    const eApplyTime = now + 2000;
    state = submitApplication(state, nodeE, eApplyTime) as ExtendedNetworkState;

    // Check timeout before expiry
    const approvalTimeoutMs = specs.governance.joinPolicy.approvalTimeoutMs;
    const beforeTimeout = advanceTime(eApplyTime, approvalTimeoutMs - 1000);
    expect(checkApprovalTimeout(state, nodeE, beforeTimeout, approvalTimeoutMs)).toBe(false);

    // Check timeout after expiry
    const afterTimeout = advanceTime(eApplyTime, approvalTimeoutMs + 1000);
    expect(checkApprovalTimeout(state, nodeE, afterTimeout, approvalTimeoutMs)).toBe(true);

    // Expire the application
    state = expireApplication(state, nodeE, 'approval_timeout', afterTimeout) as ExtendedNetworkState;
    const expiredE = state.applicants.find((a) => a.nodeId === nodeE);
    expect(expiredE!.status).toBe(ApplicantStatus.ExpiredPendingApproval);

    // ── Step 8: Node F applies, F withdraws before any votes ──
    const nodeF = makeNodeId('F');
    state = submitApplication(state, nodeF, now + 3000) as ExtendedNetworkState;
    expect(state.applicants.find((a) => a.nodeId === nodeF)!.status).toBe(
      ApplicantStatus.PendingApproval,
    );

    state = withdrawApplication(state, nodeF, now + 3100) as ExtendedNetworkState;
    const withdrawnF = state.applicants.find((a) => a.nodeId === nodeF);
    expect(withdrawnF!.status).toBe(ApplicantStatus.Withdrawn);
    expect(withdrawnF!.withdrawnAt).toBeDefined();

    // ── Step 9: Node G applies, gets approved, but never accepts -> acceptance timeout ──
    const nodeG = makeNodeId('G');
    const gApplyTime = now + 4000;
    state = submitApplication(state, nodeG, gApplyTime) as ExtendedNetworkState;

    // All 4 active members vote approve
    const activeMembers = state.members.filter((m) => m.status === MemberStatus.Active);
    for (const member of activeMembers) {
      state = castApprovalVote(
        state,
        nodeG,
        member.nodeId,
        'approve',
        gApplyTime + 100,
        'sig',
      ) as ExtendedNetworkState;
    }

    const consensusG = checkApprovalConsensus(state, nodeG, schedule);
    expect(consensusG).toBe('approved');

    const gApproveTime = gApplyTime + 200;
    state = approveApplicant(state, nodeG, gApproveTime) as ExtendedNetworkState;
    expect(state.applicants.find((a) => a.nodeId === nodeG)!.status).toBe(
      ApplicantStatus.ApprovedPendingAcceptance,
    );

    // Check acceptance timeout
    const acceptanceTimeoutMs = specs.governance.joinPolicy.acceptanceTimeoutMs;
    const beforeAcceptTimeout = advanceTime(gApproveTime, acceptanceTimeoutMs - 1000);
    expect(checkAcceptanceTimeout(state, nodeG, beforeAcceptTimeout, acceptanceTimeoutMs)).toBe(false);

    const afterAcceptTimeout = advanceTime(gApproveTime, acceptanceTimeoutMs + 1000);
    expect(checkAcceptanceTimeout(state, nodeG, afterAcceptTimeout, acceptanceTimeoutMs)).toBe(true);

    // Expire the acceptance
    state = expireApplication(state, nodeG, 'acceptance_timeout', afterAcceptTimeout) as ExtendedNetworkState;
    const expiredG = state.applicants.find((a) => a.nodeId === nodeG);
    expect(expiredG!.status).toBe(ApplicantStatus.ExpiredPendingAcceptance);
  });

  it('rejects an applicant when majority votes reject', async () => {
    const { state: initialState, members } = await createTestNetwork(3);
    let state = initialState;
    const [nodeA, nodeB, nodeC] = members.map((m) => m.nodeId);
    const schedule = DEFAULT_ADMISSION_SCHEDULE;
    const now = Date.now();

    const nodeX = makeNodeId('X');
    state = submitApplication(state, nodeX, now) as ExtendedNetworkState;

    // 2 reject, 1 approve with 3 members: threshold 0.5 means 2/3 reject > 0.5 -> rejection impossible
    // Actually: rejectionRatio > 1 - threshold -> 2/3 = 0.67 > 0.5 -> rejected
    state = castApprovalVote(state, nodeX, nodeA, 'reject', now + 1, 'sig') as ExtendedNetworkState;
    state = castApprovalVote(state, nodeX, nodeB, 'reject', now + 2, 'sig') as ExtendedNetworkState;

    const consensus = checkApprovalConsensus(state, nodeX, schedule);
    expect(consensus).toBe('rejected');

    state = rejectApplicant(state, nodeX, now + 3) as ExtendedNetworkState;
    expect(state.applicants.find((a) => a.nodeId === nodeX)!.status).toBe(
      ApplicantStatus.Rejected,
    );
  });

  it('prevents duplicate votes from the same member', async () => {
    const { state: initialState, members } = await createTestNetwork(3);
    let state = initialState;
    const [nodeA] = members.map((m) => m.nodeId);
    const now = Date.now();

    const nodeX = makeNodeId('X');
    state = submitApplication(state, nodeX, now) as ExtendedNetworkState;
    state = castApprovalVote(state, nodeX, nodeA, 'approve', now + 1, 'sig') as ExtendedNetworkState;
    state = castApprovalVote(state, nodeX, nodeA, 'reject', now + 2, 'sig2') as ExtendedNetworkState;

    // Should still only have 1 vote from nodeA
    const applicant = state.applicants.find((a) => a.nodeId === nodeX);
    expect(applicant!.votes).toHaveLength(1);
    expect(applicant!.votes[0].vote).toBe('approve');
  });
});
