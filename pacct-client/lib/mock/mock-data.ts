import type {
  NetworkState,
  MemberInfo,
  ApplicantInfo,
  RunSummary,
  NetworkManifest,
  NetworkId,
  NodeId,
  RunId,
  Hash,
  PacctEvent,
} from '@pacct/protocol-ts';
import {
  NetworkStatus,
  MemberStatus,
  ApplicantStatus,
  RunStatus,
  PacctEventType,
} from '@pacct/protocol-ts';

// ── Constants ──

const NOW = Date.now();
const HOUR = 3_600_000;
const DAY = 86_400_000;

const MY_NODE_ID = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4' as NodeId;

const NODE_IDS = {
  self: MY_NODE_ID,
  alice: 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5' as NodeId,
  bob: 'c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6' as NodeId,
  carol: 'd4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1' as NodeId,
  dave: 'e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2' as NodeId,
  eve: 'f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3' as NodeId,
};

const NETWORK_IDS = {
  salary: 'net-salary-survey-2026' as NetworkId,
  climate: 'net-climate-research-01' as NetworkId,
  health: 'net-health-outcomes-q1' as NetworkId,
  finance: 'net-finance-benchmark' as NetworkId,
  pending_join: 'net-ai-safety-collab' as NetworkId,
};

function makeManifest(networkId: NetworkId, creatorNodeId: NodeId): NetworkManifest {
  return {
    networkId,
    schemaManifestHash: 'sha256_schema_aabbccdd11223344' as Hash,
    computationManifestHash: 'sha256_comp_eeff00112233aabb' as Hash,
    governanceManifestHash: 'sha256_gov_44556677889900aa' as Hash,
    economicManifestHash: 'sha256_econ_bbccddeeff001122' as Hash,
    createdAt: NOW - 30 * DAY,
    creatorNodeId,
    signature: 'sig_mock_manifest_placeholder',
  };
}

// ── Mock Spec Details (for settings/detail views) ──

export interface MockSpecDetail {
  specType: string;
  hash: string;
  summary: string;
  raw: Record<string, unknown>;
}

function makeMockSpecs(): MockSpecDetail[] {
  return [
    {
      specType: 'schema',
      hash: 'sha256_schema_aabbccdd11223344',
      summary: 'Defines salary data fields: base_salary (int), years_experience (int), role (enum), department (enum), location (string).',
      raw: {
        version: '1.0.0',
        fields: [
          { name: 'base_salary', type: 'integer', required: true, min: 0 },
          { name: 'years_experience', type: 'integer', required: true, min: 0 },
          { name: 'role', type: 'enum', values: ['engineer', 'manager', 'analyst', 'director'] },
          { name: 'department', type: 'enum', values: ['engineering', 'product', 'sales', 'operations'] },
          { name: 'location', type: 'string', required: false },
        ],
      },
    },
    {
      specType: 'computation',
      hash: 'sha256_comp_eeff00112233aabb',
      summary: 'Secure multi-party computation: average salary by role, median salary by department, percentile distribution.',
      raw: {
        version: '1.0.0',
        computationType: 'secure_aggregation',
        operations: ['mean', 'median', 'percentile'],
        groupBy: ['role', 'department'],
        privacyBudget: { epsilon: 1.0, delta: 1e-5 },
      },
    },
    {
      specType: 'governance',
      hash: 'sha256_gov_44556677889900aa',
      summary: 'Min 3 members, max 20. Unanimous approval for new members. Creator-initiated runs. 24h cooldown between runs.',
      raw: {
        version: '1.0.0',
        minMembers: 3,
        maxMembers: 20,
        admissionPolicy: { approvalThreshold: 1.0, votingPeriodMs: 7 * DAY },
        runPolicy: {
          initiationMode: 'creator_initiated',
          allowedInitiators: 'any_member',
          minimumIntervalMs: 24 * HOUR,
          maxRunsPerPeriod: 10,
          periodLengthDays: 30,
          requireCostEstimate: false,
          allMembersOnlineRequired: false,
          midRunDisconnectBehavior: 'abort',
        },
        preApprovalVisibility: 'partial',
      },
    },
    {
      specType: 'economic',
      hash: 'sha256_econ_bbccddeeff001122',
      summary: 'Free tier. No cost per run. No staking required.',
      raw: {
        version: '1.0.0',
        mode: 'free',
        costPerRun: 0,
        stakingRequired: false,
      },
    },
  ];
}

// ── Members ──

function makeSalaryMembers(): MemberInfo[] {
  return [
    { nodeId: NODE_IDS.self, status: MemberStatus.Active, joinedAt: NOW - 25 * DAY, acknowledgedAt: NOW - 25 * DAY },
    { nodeId: NODE_IDS.alice, status: MemberStatus.Active, joinedAt: NOW - 28 * DAY, acknowledgedAt: NOW - 28 * DAY },
    { nodeId: NODE_IDS.bob, status: MemberStatus.Active, joinedAt: NOW - 20 * DAY, acknowledgedAt: NOW - 20 * DAY },
    { nodeId: NODE_IDS.carol, status: MemberStatus.Offline, joinedAt: NOW - 15 * DAY, acknowledgedAt: NOW - 15 * DAY },
    { nodeId: NODE_IDS.dave, status: MemberStatus.Left, joinedAt: NOW - 22 * DAY, acknowledgedAt: NOW - 22 * DAY, leftAt: NOW - 5 * DAY },
  ];
}

function makeClimateMembers(): MemberInfo[] {
  return [
    { nodeId: NODE_IDS.alice, status: MemberStatus.Active, joinedAt: NOW - 60 * DAY, acknowledgedAt: NOW - 60 * DAY },
    { nodeId: NODE_IDS.self, status: MemberStatus.Active, joinedAt: NOW - 55 * DAY, acknowledgedAt: NOW - 55 * DAY },
    { nodeId: NODE_IDS.bob, status: MemberStatus.PendingReAck, joinedAt: NOW - 50 * DAY, acknowledgedAt: NOW - 50 * DAY },
  ];
}

function makeHealthMembers(): MemberInfo[] {
  return [
    { nodeId: NODE_IDS.self, status: MemberStatus.Active, joinedAt: NOW - 10 * DAY, acknowledgedAt: NOW - 10 * DAY },
    { nodeId: NODE_IDS.eve, status: MemberStatus.Active, joinedAt: NOW - 8 * DAY, acknowledgedAt: NOW - 8 * DAY },
  ];
}

// ── Applicants ──

function makeSalaryApplicants(): ApplicantInfo[] {
  return [
    {
      nodeId: NODE_IDS.eve,
      status: ApplicantStatus.PendingApproval,
      appliedAt: NOW - 2 * DAY,
      votes: [
        { voterNodeId: NODE_IDS.self, vote: 'approve', timestamp: NOW - DAY, signature: 'sig_vote_1' },
      ],
    },
    {
      nodeId: 'f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0' as NodeId,
      status: ApplicantStatus.Rejected,
      appliedAt: NOW - 10 * DAY,
      rejectedAt: NOW - 8 * DAY,
      votes: [
        { voterNodeId: NODE_IDS.self, vote: 'reject', timestamp: NOW - 9 * DAY, signature: 'sig_vote_2' },
        { voterNodeId: NODE_IDS.alice, vote: 'reject', timestamp: NOW - 9 * DAY, signature: 'sig_vote_3' },
      ],
    },
  ];
}

// ── Runs ──

function makeSalaryRuns(): RunSummary[] {
  return [
    {
      runId: 'run-sal-001' as RunId,
      networkId: NETWORK_IDS.salary,
      status: RunStatus.Completed,
      initiatorNodeId: NODE_IDS.self,
      startedAt: NOW - 14 * DAY,
      completedAt: NOW - 14 * DAY + 45 * 60_000,
      participantNodeIds: [NODE_IDS.self, NODE_IDS.alice, NODE_IDS.bob],
    },
    {
      runId: 'run-sal-002' as RunId,
      networkId: NETWORK_IDS.salary,
      status: RunStatus.Completed,
      initiatorNodeId: NODE_IDS.alice,
      startedAt: NOW - 7 * DAY,
      completedAt: NOW - 7 * DAY + 30 * 60_000,
      participantNodeIds: [NODE_IDS.self, NODE_IDS.alice, NODE_IDS.bob, NODE_IDS.carol],
    },
    {
      runId: 'run-sal-003' as RunId,
      networkId: NETWORK_IDS.salary,
      status: RunStatus.Aborted,
      initiatorNodeId: NODE_IDS.bob,
      startedAt: NOW - 3 * DAY,
      abortedAt: NOW - 3 * DAY + 10 * 60_000,
      participantNodeIds: [NODE_IDS.self, NODE_IDS.alice, NODE_IDS.bob],
    },
    {
      runId: 'run-sal-004' as RunId,
      networkId: NETWORK_IDS.salary,
      status: RunStatus.Collecting,
      initiatorNodeId: NODE_IDS.self,
      startedAt: NOW - 2 * HOUR,
      participantNodeIds: [NODE_IDS.self, NODE_IDS.alice, NODE_IDS.bob],
    },
  ];
}

function makeClimateRuns(): RunSummary[] {
  return [
    {
      runId: 'run-clim-001' as RunId,
      networkId: NETWORK_IDS.climate,
      status: RunStatus.Completed,
      initiatorNodeId: NODE_IDS.alice,
      startedAt: NOW - 30 * DAY,
      completedAt: NOW - 30 * DAY + 2 * HOUR,
      participantNodeIds: [NODE_IDS.alice, NODE_IDS.self, NODE_IDS.bob],
    },
  ];
}

// ── Network States ──

function makeSalaryNetwork(): NetworkState {
  return {
    networkId: NETWORK_IDS.salary,
    alias: 'Salary Survey 2026',
    status: NetworkStatus.Active,
    creatorNodeId: NODE_IDS.self,
    members: makeSalaryMembers(),
    applicants: makeSalaryApplicants(),
    manifest: makeManifest(NETWORK_IDS.salary, NODE_IDS.self),
    createdAt: NOW - 30 * DAY,
    activatedAt: NOW - 25 * DAY,
    runHistory: makeSalaryRuns(),
  };
}

function makeClimateNetwork(): NetworkState {
  return {
    networkId: NETWORK_IDS.climate,
    alias: 'Climate Research Consortium',
    status: NetworkStatus.Degraded,
    creatorNodeId: NODE_IDS.alice,
    members: makeClimateMembers(),
    applicants: [],
    manifest: makeManifest(NETWORK_IDS.climate, NODE_IDS.alice),
    createdAt: NOW - 65 * DAY,
    activatedAt: NOW - 60 * DAY,
    runHistory: makeClimateRuns(),
  };
}

function makeHealthNetwork(): NetworkState {
  return {
    networkId: NETWORK_IDS.health,
    alias: 'Health Outcomes Q1',
    status: NetworkStatus.Pending,
    creatorNodeId: NODE_IDS.self,
    members: makeHealthMembers(),
    applicants: [],
    manifest: makeManifest(NETWORK_IDS.health, NODE_IDS.self),
    createdAt: NOW - 10 * DAY,
    runHistory: [],
  };
}

function makeFinanceNetwork(): NetworkState {
  return {
    networkId: NETWORK_IDS.finance,
    alias: 'Finance Benchmark Dissolved',
    status: NetworkStatus.Dissolved,
    creatorNodeId: NODE_IDS.bob,
    members: [
      { nodeId: NODE_IDS.bob, status: MemberStatus.Active, joinedAt: NOW - 90 * DAY, acknowledgedAt: NOW - 90 * DAY },
      { nodeId: NODE_IDS.self, status: MemberStatus.Left, joinedAt: NOW - 85 * DAY, acknowledgedAt: NOW - 85 * DAY, leftAt: NOW - 40 * DAY },
    ],
    applicants: [],
    manifest: makeManifest(NETWORK_IDS.finance, NODE_IDS.bob),
    createdAt: NOW - 90 * DAY,
    activatedAt: NOW - 85 * DAY,
    dissolvedAt: NOW - 20 * DAY,
    runHistory: [
      {
        runId: 'run-fin-001' as RunId,
        networkId: NETWORK_IDS.finance,
        status: RunStatus.Completed,
        initiatorNodeId: NODE_IDS.bob,
        startedAt: NOW - 60 * DAY,
        completedAt: NOW - 60 * DAY + HOUR,
        participantNodeIds: [NODE_IDS.bob, NODE_IDS.self],
      },
    ],
  };
}

// ── Discoverable Networks (ones we haven't joined) ──

export interface DiscoverableNetwork {
  networkId: NetworkId;
  alias: string;
  status: string;
  creatorNodeId: NodeId;
  createdAt: number;
  memberCount: number;
  visibilityMode: 'full' | 'partial' | 'none';
  alreadyApplied?: boolean;
  applicationStatus?: ApplicantStatus;
}

function makeDiscoverableNetworks(): DiscoverableNetwork[] {
  return [
    {
      networkId: NETWORK_IDS.pending_join,
      alias: 'AI Safety Collaboration',
      status: 'active',
      creatorNodeId: NODE_IDS.carol,
      createdAt: NOW - 45 * DAY,
      memberCount: 8,
      visibilityMode: 'full',
    },
    {
      networkId: 'net-genomics-pool-01' as NetworkId,
      alias: 'Genomics Data Pool',
      status: 'active',
      creatorNodeId: NODE_IDS.dave,
      createdAt: NOW - 120 * DAY,
      memberCount: 15,
      visibilityMode: 'partial',
    },
    {
      networkId: 'net-energy-grid-opt' as NetworkId,
      alias: 'Energy Grid Optimization',
      status: 'active',
      creatorNodeId: NODE_IDS.eve,
      createdAt: NOW - 30 * DAY,
      memberCount: 4,
      visibilityMode: 'none',
    },
    {
      networkId: 'net-supply-chain-q2' as NetworkId,
      alias: 'Supply Chain Analytics Q2',
      status: 'pending',
      creatorNodeId: NODE_IDS.bob,
      createdAt: NOW - 5 * DAY,
      memberCount: 2,
      visibilityMode: 'full',
      alreadyApplied: true,
      applicationStatus: ApplicantStatus.PendingApproval,
    },
  ];
}

// ── Mock Events ──

function makeMockEvents(): PacctEvent[] {
  return [
    {
      eventId: 'evt-001',
      networkId: NETWORK_IDS.salary,
      timestamp: NOW - 2 * HOUR,
      eventType: PacctEventType.RunStarted,
      runId: 'run-sal-004' as RunId,
      initiatorNodeId: NODE_IDS.self,
    },
    {
      eventId: 'evt-002',
      networkId: NETWORK_IDS.salary,
      timestamp: NOW - 2 * DAY,
      eventType: PacctEventType.ApplicantSubmitted,
      nodeId: NODE_IDS.eve,
    },
    {
      eventId: 'evt-003',
      networkId: NETWORK_IDS.climate,
      timestamp: NOW - 3 * DAY,
      eventType: PacctEventType.NetworkDegraded,
      reason: 'Member bob failed to re-acknowledge after spec update',
    },
    {
      eventId: 'evt-004',
      networkId: NETWORK_IDS.salary,
      timestamp: NOW - 3 * DAY,
      eventType: PacctEventType.RunAborted,
      runId: 'run-sal-003' as RunId,
      reason: 'Participant disconnected during collection phase',
    },
    {
      eventId: 'evt-005',
      networkId: NETWORK_IDS.salary,
      timestamp: NOW - 7 * DAY,
      eventType: PacctEventType.RunCompleted,
      runId: 'run-sal-002' as RunId,
    },
    {
      eventId: 'evt-006',
      networkId: NETWORK_IDS.health,
      timestamp: NOW - 8 * DAY,
      eventType: PacctEventType.MemberJoined,
      nodeId: NODE_IDS.eve,
    },
    {
      eventId: 'evt-007',
      networkId: NETWORK_IDS.salary,
      timestamp: NOW - 5 * DAY,
      eventType: PacctEventType.MemberLeft,
      nodeId: NODE_IDS.dave,
    },
    {
      eventId: 'evt-008',
      networkId: NETWORK_IDS.salary,
      timestamp: NOW - 14 * DAY,
      eventType: PacctEventType.RunCompleted,
      runId: 'run-sal-001' as RunId,
    },
  ];
}

// ── Public API ──

export function getMyNodeId(): NodeId {
  return MY_NODE_ID;
}

export function getMockNetworks(): NetworkState[] {
  return [
    makeSalaryNetwork(),
    makeClimateNetwork(),
    makeHealthNetwork(),
    makeFinanceNetwork(),
  ];
}

export function getMockNetworkDetail(networkId: string): NetworkState | null {
  const all = getMockNetworks();
  return all.find((n) => n.networkId === networkId) ?? null;
}

export function getMockMembers(networkId: string): MemberInfo[] {
  const net = getMockNetworkDetail(networkId);
  return net?.members ?? [];
}

export function getMockApplicants(networkId: string): ApplicantInfo[] {
  const net = getMockNetworkDetail(networkId);
  return net?.applicants ?? [];
}

export function getMockRuns(networkId: string): RunSummary[] {
  const net = getMockNetworkDetail(networkId);
  return net?.runHistory ?? [];
}

export function getMockRunDetail(networkId: string, runId: string): RunSummary | null {
  const runs = getMockRuns(networkId);
  return runs.find((r) => r.runId === runId) ?? null;
}

export function getMockSpecs(): MockSpecDetail[] {
  return makeMockSpecs();
}

export function getMockDiscoverableNetworks(): DiscoverableNetwork[] {
  return makeDiscoverableNetworks();
}

export function getMockDiscoverableNetworkDetail(networkId: string): DiscoverableNetwork | null {
  return makeDiscoverableNetworks().find((n) => n.networkId === networkId) ?? null;
}

export function getMockEvents(networkId?: string): PacctEvent[] {
  const events = makeMockEvents();
  if (networkId) {
    return events.filter((e) => e.networkId === networkId);
  }
  return events;
}

export function getMockPresence(networkId: string): { nodeId: NodeId; online: boolean; lastSeen: number }[] {
  const members = getMockMembers(networkId);
  return members.map((m) => ({
    nodeId: m.nodeId,
    online: m.status === MemberStatus.Active,
    lastSeen: m.status === MemberStatus.Active ? NOW - Math.random() * 5 * 60_000 : NOW - Math.random() * DAY,
  }));
}
