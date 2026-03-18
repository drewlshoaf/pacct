import { describe, it, expect, vi } from 'vitest';
import { RunSessionManager } from '../run-session-manager';
import { ComputationMessageType, type RunStartMessage } from '../messages';
import { MockPeerManager } from './mock-peer-manager';
import type { NetworkState } from '@pacct/protocol-ts';
import { NetworkStatus, MemberStatus, RunStatus } from '@pacct/protocol-ts';
import type { RunPolicyConfig } from '../../engines/types';
import { RunInitiationMode, DisconnectBehavior } from '@pacct/protocol-ts';
import type { DataRow } from '../regression';

// Mock the crypto.randomUUID for predictable run IDs
vi.stubGlobal('crypto', {
  randomUUID: () => 'test-run-id',
});

function makeState(overrides?: Partial<NetworkState>): NetworkState {
  return {
    networkId: 'net-1',
    networkName: 'Test Network',
    creatorNodeId: 'coordinator',
    status: NetworkStatus.Active,
    members: [
      { nodeId: 'coordinator', status: MemberStatus.Active, joinedAt: 1000 },
      { nodeId: 'participant-1', status: MemberStatus.Active, joinedAt: 1000 },
    ],
    runHistory: [],
    createdAt: 1000,
    ...overrides,
  } as NetworkState;
}

function makePolicy(overrides?: Partial<RunPolicyConfig>): RunPolicyConfig {
  return {
    initiationMode: RunInitiationMode.OnDemand,
    allowedInitiators: 'any_member',
    minimumIntervalMs: 0,
    maxRunsPerPeriod: 100,
    periodLengthDays: 30,
    requireCostEstimate: false,
    allMembersOnlineRequired: false,
    midRunDisconnectBehavior: DisconnectBehavior.Abort,
    ...overrides,
  };
}

function makeMockDatasetManager() {
  return {
    getDatasetForComputation: vi.fn().mockResolvedValue([
      { x: 1, y: 3 },
      { x: 2, y: 5 },
    ] as DataRow[]),
  };
}

describe('RunSessionManager', () => {
  describe('initiateRun', () => {
    it('succeeds when policy allows and peers respond', async () => {
      const peerManager = new MockPeerManager();
      peerManager.addPeer('participant-1');

      const datasetManager = makeMockDatasetManager();
      const state = makeState();
      const policy = makePolicy();

      const manager = new RunSessionManager(
        peerManager,
        datasetManager as any,
        'coordinator',
      );

      const resultPromise = manager.initiateRun(state, policy, {
        networkId: 'net-1',
        datasetId: 'ds-1',
        featureFields: ['x'],
        targetField: 'y',
        revealMode: 'both',
        normalize: false,
      });

      // Simulate participant responses
      await tick();
      peerManager.simulateMessage('participant-1', {
        type: ComputationMessageType.READY_ACK,
        runId: 'test-run-id',
        nodeId: 'participant-1',
        timestamp: Date.now(),
      });

      await tick();
      // Send a summary for the participant
      peerManager.simulateMessage('participant-1', {
        type: ComputationMessageType.LOCAL_SUMMARY,
        runId: 'test-run-id',
        nodeId: 'participant-1',
        summary: {
          xtx: [[2, 7], [7, 25]],
          xty: [16, 58],
          n: 2,
          sumY: 16,
          sumY2: 130,
          featureFields: ['x'],
          targetField: 'y',
        },
        timestamp: Date.now(),
      });

      const outcome = await resultPromise;
      expect('result' in outcome).toBe(true);
      if ('result' in outcome) {
        expect(outcome.result.totalN).toBe(4);
        expect(outcome.newState.runHistory).toHaveLength(1);
      }
    });

    it('returns error when policy check fails', async () => {
      const peerManager = new MockPeerManager();
      const datasetManager = makeMockDatasetManager();

      // Network is not active
      const state = makeState({ status: NetworkStatus.Dissolved });
      const policy = makePolicy();

      const manager = new RunSessionManager(
        peerManager,
        datasetManager as any,
        'coordinator',
      );

      const outcome = await manager.initiateRun(state, policy, {
        networkId: 'net-1',
        datasetId: 'ds-1',
        featureFields: ['x'],
        targetField: 'y',
        revealMode: 'both',
        normalize: false,
      });

      expect('error' in outcome).toBe(true);
      if ('error' in outcome) {
        expect(outcome.error).toContain('not active');
      }
    });

    it('returns error when only creator can initiate and non-creator tries', async () => {
      const peerManager = new MockPeerManager();
      const datasetManager = makeMockDatasetManager();
      const state = makeState();
      const policy = makePolicy({ allowedInitiators: 'creator_only' });

      // myNodeId is not the creator
      const manager = new RunSessionManager(
        peerManager,
        datasetManager as any,
        'participant-1',
      );

      const outcome = await manager.initiateRun(state, policy, {
        networkId: 'net-1',
        datasetId: 'ds-1',
        featureFields: ['x'],
        targetField: 'y',
        revealMode: 'both',
        normalize: false,
      });

      expect('error' in outcome).toBe(true);
    });
  });

  describe('handleIncomingRun', () => {
    it('produces a result when coordinator sends aggregated result', async () => {
      const peerManager = new MockPeerManager();
      peerManager.addPeer('coordinator');

      const datasetManager = makeMockDatasetManager();
      const state = makeState();

      const manager = new RunSessionManager(
        peerManager,
        datasetManager as any,
        'participant-1',
      );

      const runStartMsg: RunStartMessage = {
        type: ComputationMessageType.RUN_START,
        runId: 'run-1',
        networkId: 'net-1',
        initiatorNodeId: 'coordinator',
        featureFields: ['x'],
        targetField: 'y',
        config: {
          revealMode: 'both',
          normalize: false,
        },
        timestamp: Date.now(),
      };

      const resultPromise = manager.handleIncomingRun(state, runStartMsg, 'ds-1');

      // Simulate coordinator sending the aggregated result
      await tick();
      peerManager.simulateMessage('coordinator', {
        type: ComputationMessageType.AGGREGATED_RESULT,
        runId: 'run-1',
        result: {
          coefficients: { x: 2 },
          intercept: 1,
          rSquared: 1,
          totalN: 4,
          contributorCount: 2,
          featureFields: ['x'],
          targetField: 'y',
        },
        timestamp: Date.now(),
      });

      const outcome = await resultPromise;
      expect('result' in outcome).toBe(true);
      if ('result' in outcome) {
        expect(outcome.result.intercept).toBe(1);
        expect(outcome.result.coefficients['x']).toBe(2);
      }
    });
  });
});

function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
