/**
 * Shared helpers for integration tests.
 */

import type {
  NodeId,
  NetworkId,
  RunId,
  SpecId,
  Hash,
  NetworkState,
  NetworkManifest,
} from '@pacct/protocol-ts';
import {
  NetworkStatus,
  MemberStatus,
  SpecLifecycle,
  ComputationType,
  EconomicMode,
  RunInitiationMode,
  VisibilityMode,
  SectionVisibility,
  DisconnectBehavior,
} from '@pacct/protocol-ts';
import type { SchemaSpec, ComputationSpec, GovernanceSpec, EconomicSpec, NetworkSnapshot } from '@pacct/specs';
import { createNetworkSnapshot, validateSpecCompatibility } from '@pacct/specs';
import type { ExtendedNetworkState, ConsensusScheduleEntry } from '../../engines/types';
import { transition } from '../../engines/network-lifecycle';
import { submitApplication, castApprovalVote, checkApprovalConsensus, approveApplicant, acceptContract } from '../../engines/admission';
import { addMember } from '../../engines/membership';
import type { DataRow } from '../../computation/regression';

// ---------------------------------------------------------------------------
// ID helpers
// ---------------------------------------------------------------------------

let idCounter = 0;

export function makeNodeId(label: string): NodeId {
  return `node-${label}-${++idCounter}` as NodeId;
}

export function makeNetworkId(): NetworkId {
  return `network-${++idCounter}` as NetworkId;
}

export function makeRunId(): RunId {
  return `run-${++idCounter}` as RunId;
}

export function makeSpecId(): SpecId {
  return `spec-${++idCounter}` as SpecId;
}

export function makeHash(data: string): Hash {
  return `hash-${data}-${++idCounter}` as Hash;
}

// ---------------------------------------------------------------------------
// Spec factories
// ---------------------------------------------------------------------------

export function createSchemaSpec(overrides?: Partial<SchemaSpec>): SchemaSpec {
  const now = Date.now();
  return {
    specId: makeSpecId(),
    lifecycle: SpecLifecycle.Draft,
    version: '1.0.0',
    name: 'Test Schema',
    description: 'Integration test schema',
    fields: [
      { name: 'id', type: 'string_id', required: true },
      { name: 'x1', type: 'float', required: true, min: -1000, max: 1000 },
      { name: 'x2', type: 'float', required: true, min: -1000, max: 1000 },
      { name: 'y', type: 'float', required: true },
    ],
    identifierFieldName: 'id',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createComputationSpec(overrides?: Partial<ComputationSpec>): ComputationSpec {
  const now = Date.now();
  return {
    specId: makeSpecId(),
    lifecycle: SpecLifecycle.Draft,
    version: '1.0.0',
    name: 'Test Computation',
    description: 'Integration test computation',
    computationType: ComputationType.Regression,
    featureFields: ['x1', 'x2'],
    targetField: 'y',
    outputConfig: {
      revealMode: 'both',
      normalize: false,
    },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createGovernanceSpec(overrides?: Partial<GovernanceSpec>): GovernanceSpec {
  const now = Date.now();
  return {
    specId: makeSpecId(),
    lifecycle: SpecLifecycle.Draft,
    version: '1.0.0',
    name: 'Test Governance',
    description: 'Integration test governance',
    membershipPolicy: {
      minActiveMembers: 3,
      maxMembers: 10,
    },
    visibilityPolicy: {
      mode: VisibilityMode.Partial,
      sectionVisibility: {
        schema: SectionVisibility.Full,
        computation: SectionVisibility.SummaryOnly,
        governance: SectionVisibility.SummaryOnly,
        economic: SectionVisibility.Hidden,
      },
    },
    joinPolicy: {
      approvalTimeoutMs: 7 * 24 * 60 * 60 * 1000, // 7 days
      acceptanceTimeoutMs: 3 * 24 * 60 * 60 * 1000, // 3 days
    },
    consensusPolicy: {
      admissionSchedule: [
        { memberCountMin: 1, memberCountMax: 1, threshold: 1.0 },
        { memberCountMin: 2, memberCountMax: 5, threshold: 0.5 },
        { memberCountMin: 6, memberCountMax: 100, threshold: 0.67 },
      ],
      dissolutionThreshold: 1.0,
      expulsionThreshold: 0.75,
    },
    runPolicy: {
      initiationMode: RunInitiationMode.RestrictedManual,
      allowedInitiators: 'any_member',
      minimumIntervalMs: 60000,
      maxRunsPerPeriod: 2,
      periodLengthDays: 7,
      requireCostEstimate: false,
      allMembersOnlineRequired: true,
      midRunDisconnectBehavior: DisconnectBehavior.Abort,
    },
    dissolutionPolicy: {
      preActivationTimeoutMs: 30 * 24 * 60 * 60 * 1000, // 30 days
      postActivationInactivityTimeoutMs: 90 * 24 * 60 * 60 * 1000, // 90 days
    },
    expulsionPolicy: {
      enabled: true,
      requireReason: true,
    },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createEconomicSpec(overrides?: Partial<EconomicSpec>): EconomicSpec {
  const now = Date.now();
  return {
    specId: makeSpecId(),
    lifecycle: SpecLifecycle.Draft,
    version: '1.0.0',
    name: 'Test Economic',
    description: 'Integration test economic',
    economicMode: EconomicMode.Progressive,
    costAllocation: {
      fixedCostPerRun: 0,
      variableCostEnabled: false,
    },
    summary: 'No-cost research network',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createAllSpecs() {
  return {
    schema: createSchemaSpec(),
    computation: createComputationSpec(),
    governance: createGovernanceSpec(),
    economic: createEconomicSpec(),
  };
}

// ---------------------------------------------------------------------------
// Network state factory
// ---------------------------------------------------------------------------

export function createBaseNetworkState(
  creatorNodeId: NodeId,
  networkId?: NetworkId,
): ExtendedNetworkState {
  const nid = networkId ?? makeNetworkId();
  const now = Date.now();
  return {
    networkId: nid,
    alias: 'test-network',
    status: NetworkStatus.Draft,
    creatorNodeId,
    members: [
      {
        nodeId: creatorNodeId,
        status: MemberStatus.Active,
        joinedAt: now,
        acknowledgedAt: now,
      },
    ],
    applicants: [],
    manifest: {
      networkId: nid,
      schemaManifestHash: '' as Hash,
      computationManifestHash: '' as Hash,
      governanceManifestHash: '' as Hash,
      economicManifestHash: '' as Hash,
      createdAt: now,
      creatorNodeId,
      signature: '',
    },
    createdAt: now,
    runHistory: [],
    expulsionProposals: [],
  };
}

// ---------------------------------------------------------------------------
// Create a complete test network with N active members
// ---------------------------------------------------------------------------

export interface TestNetworkResult {
  state: ExtendedNetworkState;
  members: { nodeId: NodeId; label: string }[];
  specs: { schema: SchemaSpec; computation: ComputationSpec; governance: GovernanceSpec; economic: EconomicSpec };
  snapshot: NetworkSnapshot;
}

export async function createTestNetwork(memberCount: number): Promise<TestNetworkResult> {
  if (memberCount < 1) throw new Error('Need at least 1 member');

  const specs = createAllSpecs();
  const nodeLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const members: { nodeId: NodeId; label: string }[] = [];

  // Creator is always first member
  const creatorNodeId = makeNodeId(nodeLabels[0]);
  members.push({ nodeId: creatorNodeId, label: nodeLabels[0] });

  const networkId = makeNetworkId();
  let state: ExtendedNetworkState = createBaseNetworkState(creatorNodeId, networkId);

  // Create snapshot
  const snapshot = await createNetworkSnapshot(
    specs.schema,
    specs.computation,
    specs.governance,
    specs.economic,
    networkId,
    creatorNodeId,
  );

  // Transition to pending
  const pendingResult = transition(state, NetworkStatus.Pending, 'Specs finalized');
  if ('error' in pendingResult) throw new Error(pendingResult.message);
  state = { ...pendingResult, expulsionProposals: state.expulsionProposals } as ExtendedNetworkState;

  // Bootstrap admission schedule (creator only = 1 member)
  const schedule: ConsensusScheduleEntry[] = specs.governance.consensusPolicy.admissionSchedule;

  // Add remaining members via admission flow
  const now = Date.now();
  for (let i = 1; i < memberCount; i++) {
    const nodeId = makeNodeId(nodeLabels[i]);
    members.push({ nodeId, label: nodeLabels[i] });

    // Submit application
    state = submitApplication(state, nodeId, now + i) as ExtendedNetworkState;

    // All existing active members vote approve
    const activeMembers = state.members.filter(
      (m) => m.status === MemberStatus.Active || m.status === MemberStatus.Offline,
    );
    for (const member of activeMembers) {
      state = castApprovalVote(
        state,
        nodeId,
        member.nodeId,
        'approve',
        now + i + 1,
        'sig',
      ) as ExtendedNetworkState;
    }

    // Check consensus
    const consensus = checkApprovalConsensus(state, nodeId, schedule);
    if (consensus !== 'approved') {
      throw new Error(`Expected approved but got ${consensus} for member ${i}`);
    }

    // Approve and accept
    state = approveApplicant(state, nodeId, now + i + 2) as ExtendedNetworkState;
    state = acceptContract(state, nodeId, now + i + 3) as ExtendedNetworkState;
  }

  // Transition to active if enough members
  if (memberCount >= specs.governance.membershipPolicy.minActiveMembers) {
    const activeResult = transition(state, NetworkStatus.Active, 'Minimum members reached');
    if ('error' in activeResult) throw new Error(activeResult.message);
    state = { ...activeResult, expulsionProposals: state.expulsionProposals } as ExtendedNetworkState;
  }

  return { state, members, specs, snapshot };
}

// ---------------------------------------------------------------------------
// Synthetic dataset generation
// ---------------------------------------------------------------------------

/**
 * Generate a synthetic dataset with known linear relationship.
 * y = sum(coefficients[field] * x[field]) + intercept + noise
 */
export function generateSyntheticDataset(
  n: number,
  coefficients: Record<string, number>,
  intercept: number,
  noiseStdDev: number,
  idPrefix: string = 'row',
): DataRow[] {
  const fields = Object.keys(coefficients);
  const data: DataRow[] = [];

  // Seeded pseudo-random for reproducibility
  let seed = 42;
  function nextRandom(): number {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  }

  // Box-Muller for normal distribution
  function normalRandom(): number {
    const u1 = nextRandom() || 0.0001;
    const u2 = nextRandom();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  for (let i = 0; i < n; i++) {
    const row: DataRow = {};
    let y = intercept;

    for (const field of fields) {
      const x = normalRandom() * 10; // scale features
      row[field] = x;
      y += coefficients[field] * x;
    }

    // Add noise
    y += normalRandom() * noiseStdDev;
    row['y'] = y;
    // We don't put the string id in DataRow since DataRow is Record<string, number>

    data.push(row);
  }

  return data;
}

/**
 * Generate a synthetic dataset including a string ID column (for CSV/schema tests).
 */
export function generateSyntheticDatasetWithId(
  n: number,
  coefficients: Record<string, number>,
  intercept: number,
  noiseStdDev: number,
  idPrefix: string = 'row',
): Record<string, string | number | boolean | null>[] {
  const dataRows = generateSyntheticDataset(n, coefficients, intercept, noiseStdDev, idPrefix);
  return dataRows.map((row, i) => ({
    id: `${idPrefix}-${i}`,
    ...row,
  }));
}

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------

export function advanceTime(baseTimestamp: number, ms: number): number {
  return baseTimestamp + ms;
}

// ---------------------------------------------------------------------------
// Default consensus schedule
// ---------------------------------------------------------------------------

export const DEFAULT_ADMISSION_SCHEDULE: ConsensusScheduleEntry[] = [
  { memberCountMin: 1, memberCountMax: 1, threshold: 1.0 },
  { memberCountMin: 2, memberCountMax: 5, threshold: 0.5 },
  { memberCountMin: 6, memberCountMax: 100, threshold: 0.67 },
];
