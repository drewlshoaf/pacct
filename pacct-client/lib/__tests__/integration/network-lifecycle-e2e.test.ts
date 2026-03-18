/**
 * Full Network Lifecycle Integration Test
 *
 * Tests the complete flow: identity generation, spec creation, validation,
 * snapshot, admission, activation, computation, member departure, degradation,
 * and dissolution.
 */

import { describe, it, expect } from 'vitest';
import type { NodeId, RunId } from '@pacct/protocol-ts';
import {
  NetworkStatus,
  MemberStatus,
  ApplicantStatus,
  SpecLifecycle,
} from '@pacct/protocol-ts';
import { validateSpecCompatibility, createNetworkSnapshot } from '@pacct/specs';

import { transition, shouldDissolve } from '../../engines/network-lifecycle';
import {
  submitApplication,
  castApprovalVote,
  checkApprovalConsensus,
  approveApplicant,
  acceptContract,
} from '../../engines/admission';
import {
  removeMember,
  reAcknowledge,
  allMembersReAcknowledged,
  isNetworkComputationCapable,
  getActiveMembers,
} from '../../engines/membership';
import { canInitiateRun, initiateRun, completeRun } from '../../engines/run';
import type { ExtendedNetworkState, RunPolicyConfig } from '../../engines/types';
import {
  computeLocalSummary,
  aggregateSummaries,
  computeFederatedResult,
} from '../../computation/federated';
import { computeRegression } from '../../computation/regression';
import {
  makeNodeId,
  makeNetworkId,
  makeRunId,
  createAllSpecs,
  createBaseNetworkState,
  generateSyntheticDataset,
  DEFAULT_ADMISSION_SCHEDULE,
  advanceTime,
} from './test-helpers';

describe('Full Network Lifecycle E2E', () => {
  it('completes the entire network lifecycle from creation to dissolution', async () => {
    // ── Step 1: Node A generates identity ──
    const nodeA = makeNodeId('A');
    const nodeB = makeNodeId('B');
    const nodeC = makeNodeId('C');

    // ── Step 2: Create 4 specs ──
    const specs = createAllSpecs();

    // ── Step 3: Validate all 4 specs + cross-spec compatibility ──
    const validation = validateSpecCompatibility(
      specs.schema,
      specs.computation,
      specs.governance,
      specs.economic,
    );
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);

    // ── Step 4: Create network snapshot ──
    const networkId = makeNetworkId();
    const snapshot = await createNetworkSnapshot(
      specs.schema,
      specs.computation,
      specs.governance,
      specs.economic,
      networkId,
      nodeA,
    );
    expect(snapshot.networkId).toBe(networkId);
    expect(snapshot.schemaSpec.lifecycle).toBe(SpecLifecycle.NetworkSnapshot);
    expect(snapshot.computationSpec.lifecycle).toBe(SpecLifecycle.NetworkSnapshot);
    expect(snapshot.governanceSpec.lifecycle).toBe(SpecLifecycle.NetworkSnapshot);
    expect(snapshot.economicSpec.lifecycle).toBe(SpecLifecycle.NetworkSnapshot);
    expect(snapshot.specManifests.schema.hash).toBeTruthy();
    expect(snapshot.specManifests.computation.hash).toBeTruthy();
    expect(snapshot.specManifests.governance.hash).toBeTruthy();
    expect(snapshot.specManifests.economic.hash).toBeTruthy();

    // ── Step 5: Network state: draft -> pending ──
    let state: ExtendedNetworkState = createBaseNetworkState(nodeA, networkId);
    expect(state.status).toBe(NetworkStatus.Draft);

    const pendingResult = transition(state, NetworkStatus.Pending, 'Specs finalized');
    expect('error' in pendingResult).toBe(false);
    state = { ...(pendingResult as typeof state), expulsionProposals: [] };
    expect(state.status).toBe(NetworkStatus.Pending);

    const now = Date.now();
    const schedule = DEFAULT_ADMISSION_SCHEDULE;

    // ── Step 6: Node B applies to join ──
    state = submitApplication(state, nodeB, now + 100) as ExtendedNetworkState;
    expect(state.applicants).toHaveLength(1);
    expect(state.applicants[0].status).toBe(ApplicantStatus.PendingApproval);

    // ── Step 7: Node A casts approval vote (creator-only bootstrap) ──
    state = castApprovalVote(state, nodeB, nodeA, 'approve', now + 200, 'sig-a') as ExtendedNetworkState;
    expect(state.applicants[0].votes).toHaveLength(1);

    // ── Step 8: Check consensus -> approved ──
    const consensusB = checkApprovalConsensus(state, nodeB, schedule);
    expect(consensusB).toBe('approved');

    // ── Step 9: Node B accepts contract ──
    state = approveApplicant(state, nodeB, now + 300) as ExtendedNetworkState;
    expect(state.applicants[0].status).toBe(ApplicantStatus.ApprovedPendingAcceptance);

    // ── Step 10: Node B becomes active member ──
    state = acceptContract(state, nodeB, now + 400) as ExtendedNetworkState;
    expect(state.members).toHaveLength(2);
    expect(state.members[1].status).toBe(MemberStatus.Active);

    // ── Step 11: Node C applies -> Node A + B vote -> approved -> accepted ──
    state = submitApplication(state, nodeC, now + 500) as ExtendedNetworkState;
    state = castApprovalVote(state, nodeC, nodeA, 'approve', now + 600, 'sig-a') as ExtendedNetworkState;
    state = castApprovalVote(state, nodeC, nodeB, 'approve', now + 601, 'sig-b') as ExtendedNetworkState;

    const consensusC = checkApprovalConsensus(state, nodeC, schedule);
    expect(consensusC).toBe('approved');

    state = approveApplicant(state, nodeC, now + 700) as ExtendedNetworkState;
    state = acceptContract(state, nodeC, now + 800) as ExtendedNetworkState;
    expect(state.members).toHaveLength(3);

    // ── Step 12: Network state: pending -> active (3 members, minimum met) ──
    const minActiveMembers = specs.governance.membershipPolicy.minActiveMembers;
    expect(isNetworkComputationCapable(state, minActiveMembers)).toBe(true);

    const activeResult = transition(state, NetworkStatus.Active, 'Minimum members reached');
    expect('error' in activeResult).toBe(false);
    state = { ...(activeResult as typeof state), expulsionProposals: state.expulsionProposals };
    expect(state.status).toBe(NetworkStatus.Active);
    expect(state.activatedAt).toBeDefined();

    // ── Step 13: Verify network is computation-capable ──
    expect(isNetworkComputationCapable(state, minActiveMembers)).toBe(true);
    expect(getActiveMembers(state)).toHaveLength(3);

    // ── Step 14-17: Run computation ──
    const runPolicy: RunPolicyConfig = {
      ...specs.governance.runPolicy,
    };

    const runId1 = makeRunId();
    const runTime = advanceTime(now, 120000); // well past cooldown

    const canRun = canInitiateRun(state, nodeA, runPolicy, runTime);
    expect(canRun.allowed).toBe(true);

    state = initiateRun(state, runId1, nodeA, runTime) as ExtendedNetworkState;
    expect(state.runHistory).toHaveLength(1);

    // Generate data for 3 nodes
    const coefficients = { x1: 2, x2: 3 };
    const interceptValue = 5;
    const dataA = generateSyntheticDataset(100, coefficients, interceptValue, 0.5);
    const dataB = generateSyntheticDataset(200, coefficients, interceptValue, 0.5);
    const dataC = generateSyntheticDataset(150, coefficients, interceptValue, 0.5);

    const featureFields = ['x1', 'x2'];
    const targetField = 'y';

    // Step 15: Each node computes local summary
    const summaryA = computeLocalSummary(dataA, featureFields, targetField, nodeA, networkId, runId1);
    const summaryB = computeLocalSummary(dataB, featureFields, targetField, nodeB, networkId, runId1);
    const summaryC = computeLocalSummary(dataC, featureFields, targetField, nodeC, networkId, runId1);

    expect(summaryA.n).toBe(100);
    expect(summaryB.n).toBe(200);
    expect(summaryC.n).toBe(150);

    // Step 16: Coordinator aggregates
    const aggregated = aggregateSummaries([summaryA, summaryB, summaryC]);
    expect(aggregated.totalN).toBe(450);
    expect(aggregated.contributorCount).toBe(3);

    const federatedResult = computeFederatedResult(aggregated);

    // Step 17: Verify federated result matches combined-dataset local regression
    const combinedData = [...dataA, ...dataB, ...dataC];
    const localResult = computeRegression({
      data: combinedData,
      featureFields,
      targetField,
    });

    // Federated and local should produce identical results (within floating point)
    expect(federatedResult.coefficients['x1']).toBeCloseTo(localResult.coefficients['x1'], 8);
    expect(federatedResult.coefficients['x2']).toBeCloseTo(localResult.coefficients['x2'], 8);
    expect(federatedResult.intercept).toBeCloseTo(localResult.intercept, 8);
    expect(federatedResult.rSquared).toBeCloseTo(localResult.rSquared, 8);

    // Coefficients should be close to the true values
    expect(federatedResult.coefficients['x1']).toBeCloseTo(2, 0);
    expect(federatedResult.coefficients['x2']).toBeCloseTo(3, 0);
    expect(federatedResult.intercept).toBeCloseTo(5, 0);
    expect(federatedResult.rSquared).toBeGreaterThan(0.95);

    // Step 18: Run completes
    state = completeRun(state, runId1, advanceTime(runTime, 10000)) as ExtendedNetworkState;
    expect(state.runHistory[0].status).toBe('completed');

    // ── Step 19: Node B leaves -> network degrades ──
    state = removeMember(state, nodeB, 'left', advanceTime(runTime, 20000)) as ExtendedNetworkState;
    const degradedResult = transition(state, NetworkStatus.Degraded, 'Member left');
    expect('error' in degradedResult).toBe(false);
    state = { ...(degradedResult as typeof state), expulsionProposals: state.expulsionProposals };
    expect(state.status).toBe(NetworkStatus.Degraded);

    // Remaining active members get PendingReAck status
    const reackMembers = state.members.filter((m) => m.status === MemberStatus.PendingReAck);
    expect(reackMembers.length).toBe(2); // A and C

    // ── Step 20: Remaining members re-acknowledge -> network re-activates ──
    state = reAcknowledge(state, nodeA, advanceTime(runTime, 30000)) as ExtendedNetworkState;
    state = reAcknowledge(state, nodeC, advanceTime(runTime, 30001)) as ExtendedNetworkState;
    expect(allMembersReAcknowledged(state)).toBe(true);

    // After B left, only 2 active remain; but we check transition feasibility first
    const activeMembers = getActiveMembers(state);
    expect(activeMembers).toHaveLength(2); // A and C only

    // ── Step 21-22: Below minimum threshold -> should dissolve ──
    expect(shouldDissolve(state, minActiveMembers)).toBe(true);

    const dissolveResult = transition(state, NetworkStatus.Dissolved, 'Below minimum threshold');
    expect('error' in dissolveResult).toBe(false);
    state = { ...(dissolveResult as typeof state), expulsionProposals: state.expulsionProposals };
    expect(state.status).toBe(NetworkStatus.Dissolved);
    expect(state.dissolvedAt).toBeDefined();

    // Verify dissolved network rejects operations
    const canRunAfterDissolve = canInitiateRun(state, nodeA, runPolicy, advanceTime(runTime, 200000));
    expect(canRunAfterDissolve.allowed).toBe(false);
    expect(canRunAfterDissolve.reason).toContain('not active');
  });
});
