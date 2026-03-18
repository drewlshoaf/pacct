import { describe, it, expect } from 'vitest';
import {
  NetworkStatus,
  MemberStatus,
  ApplicantStatus,
  RunStatus,
} from '../index';
import type {
  NetworkState,
  MemberInfo,
  ApplicantInfo,
  RunSummary,
  ApprovalVote,
  NetworkManifest,
} from '../index';
import type { NodeId, NetworkId, RunId, Hash, Timestamp } from '../index';

const nodeId = (s: string) => s as NodeId;
const networkId = (s: string) => s as NetworkId;
const runId = (s: string) => s as RunId;
const hash = (s: string) => s as Hash;
const ts = Date.now() as Timestamp;

describe('ApprovalVote', () => {
  it('can be constructed', () => {
    const vote: ApprovalVote = {
      voterNodeId: nodeId('voter-1'),
      vote: 'approve',
      timestamp: ts,
      signature: 'sig',
    };
    expect(vote.vote).toBe('approve');
  });
});

describe('MemberInfo', () => {
  it('can be constructed with required fields', () => {
    const member: MemberInfo = {
      nodeId: nodeId('node-1'),
      status: MemberStatus.Active,
      joinedAt: ts,
    };
    expect(member.status).toBe(MemberStatus.Active);
    expect(member.leftAt).toBeUndefined();
  });

  it('can be constructed with optional fields', () => {
    const member: MemberInfo = {
      nodeId: nodeId('node-1'),
      status: MemberStatus.Left,
      joinedAt: ts,
      leftAt: ts + 1000,
      acknowledgedAt: ts + 500,
    };
    expect(member.leftAt).toBeDefined();
    expect(member.acknowledgedAt).toBeDefined();
  });
});

describe('ApplicantInfo', () => {
  it('can be constructed', () => {
    const applicant: ApplicantInfo = {
      nodeId: nodeId('applicant-1'),
      status: ApplicantStatus.PendingApproval,
      appliedAt: ts,
      votes: [
        {
          voterNodeId: nodeId('voter-1'),
          vote: 'approve',
          timestamp: ts,
          signature: 'sig-1',
        },
      ],
    };
    expect(applicant.status).toBe(ApplicantStatus.PendingApproval);
    expect(applicant.votes).toHaveLength(1);
  });
});

describe('RunSummary', () => {
  it('can be constructed', () => {
    const run: RunSummary = {
      runId: runId('run-1'),
      networkId: networkId('net-1'),
      status: RunStatus.Completed,
      initiatorNodeId: nodeId('node-1'),
      startedAt: ts,
      completedAt: ts + 5000,
      participantNodeIds: [nodeId('node-1'), nodeId('node-2')],
    };
    expect(run.status).toBe(RunStatus.Completed);
    expect(run.participantNodeIds).toHaveLength(2);
  });
});

describe('NetworkState', () => {
  it('can be constructed with full state', () => {
    const manifest: NetworkManifest = {
      networkId: networkId('net-1'),
      schemaManifestHash: hash('h1'),
      computationManifestHash: hash('h2'),
      governanceManifestHash: hash('h3'),
      economicManifestHash: hash('h4'),
      createdAt: ts,
      creatorNodeId: nodeId('node-1'),
      signature: 'sig',
    };

    const state: NetworkState = {
      networkId: networkId('net-1'),
      alias: 'Test Network',
      status: NetworkStatus.Active,
      creatorNodeId: nodeId('node-1'),
      members: [
        {
          nodeId: nodeId('node-1'),
          status: MemberStatus.Active,
          joinedAt: ts,
        },
      ],
      applicants: [],
      manifest,
      createdAt: ts,
      activatedAt: ts + 1000,
      runHistory: [],
    };

    expect(state.status).toBe(NetworkStatus.Active);
    expect(state.members).toHaveLength(1);
    expect(state.alias).toBe('Test Network');
    expect(state.dissolvedAt).toBeUndefined();
  });
});
