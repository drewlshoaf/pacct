import type {
  NetworkState,
  MemberInfo,
  ApplicantInfo,
  RunSummary,
  NodeId,
  NetworkId,
  RunId,
  Timestamp,
  NetworkManifest,
  Hash,
} from '@pacct/protocol-ts';
import {
  NetworkStatus,
  MemberStatus,
  ApplicantStatus,
  RunStatus,
} from '@pacct/protocol-ts';
import type { ExtendedNetworkState, RunPolicyConfig } from '../types';

export function testNodeId(id: string): NodeId {
  return id as NodeId;
}

export function testNetworkId(id: string): NetworkId {
  return id as NetworkId;
}

export function testRunId(id: string): RunId {
  return id as RunId;
}

function testHash(h: string): Hash {
  return h as Hash;
}

function createTestManifest(overrides?: Partial<NetworkManifest>): NetworkManifest {
  return {
    networkId: testNetworkId('net-1'),
    schemaManifestHash: testHash('schema-hash'),
    computationManifestHash: testHash('comp-hash'),
    governanceManifestHash: testHash('gov-hash'),
    economicManifestHash: testHash('econ-hash'),
    createdAt: 1000,
    creatorNodeId: testNodeId('node-creator'),
    signature: 'sig-manifest',
    ...overrides,
  };
}

export function createTestMember(
  nodeId: string | NodeId,
  overrides?: Partial<MemberInfo>,
): MemberInfo {
  const nid = typeof nodeId === 'string' ? testNodeId(nodeId) : nodeId;
  return {
    nodeId: nid,
    status: MemberStatus.Active,
    joinedAt: 1000,
    acknowledgedAt: 1000,
    ...overrides,
  };
}

export function createTestApplicant(
  nodeId: string | NodeId,
  overrides?: Partial<ApplicantInfo>,
): ApplicantInfo {
  const nid = typeof nodeId === 'string' ? testNodeId(nodeId) : nodeId;
  return {
    nodeId: nid,
    status: ApplicantStatus.PendingApproval,
    appliedAt: 1000,
    votes: [],
    ...overrides,
  };
}

export function createTestRunSummary(
  overrides?: Partial<RunSummary>,
): RunSummary {
  return {
    runId: testRunId('run-1'),
    networkId: testNetworkId('net-1'),
    status: RunStatus.Pending,
    initiatorNodeId: testNodeId('node-1'),
    startedAt: 1000,
    participantNodeIds: [testNodeId('node-1'), testNodeId('node-2')],
    ...overrides,
  };
}

export function createTestNetworkState(
  overrides?: Partial<NetworkState>,
): NetworkState {
  return {
    networkId: testNetworkId('net-1'),
    alias: 'Test Network',
    status: NetworkStatus.Active,
    creatorNodeId: testNodeId('node-creator'),
    members: [
      createTestMember('node-creator'),
      createTestMember('node-2'),
    ],
    applicants: [],
    manifest: createTestManifest(),
    createdAt: 1000,
    activatedAt: 2000,
    runHistory: [],
    ...overrides,
  };
}

export function createTestExtendedState(
  overrides?: Partial<ExtendedNetworkState>,
): ExtendedNetworkState {
  return {
    ...createTestNetworkState(),
    expulsionProposals: [],
    dissolveProposal: undefined,
    ...overrides,
  };
}

export function createTestRunPolicy(
  overrides?: Partial<RunPolicyConfig>,
): RunPolicyConfig {
  return {
    initiationMode: 'scheduled' as any, // RunInitiationMode value
    allowedInitiators: 'any_member',
    minimumIntervalMs: 60000,
    maxRunsPerPeriod: 10,
    periodLengthDays: 30,
    requireCostEstimate: false,
    allMembersOnlineRequired: false,
    midRunDisconnectBehavior: 'abort' as any, // DisconnectBehavior value
    ...overrides,
  };
}
