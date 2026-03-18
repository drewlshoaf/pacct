import { describe, it, expect, vi } from 'vitest';
import { NetworkRunOrchestrator, type NetworkRunConfig } from '../network-run-orchestrator';
import { ComputationMessageType } from '../messages';
import { computeLocalSummary } from '../federated';
import type { DataRow } from '../regression';
import { MockPeerManager } from './mock-peer-manager';

function makeConfig(overrides?: Partial<NetworkRunConfig>): NetworkRunConfig {
  return {
    networkId: 'net-1',
    runId: 'run-1',
    featureFields: ['x'],
    targetField: 'y',
    revealMode: 'both',
    normalize: false,
    participantNodeIds: ['coordinator', 'participant-1'],
    myNodeId: 'coordinator',
    isCoordinator: true,
    timeoutMs: 2000,
    ...overrides,
  };
}

const coordinatorData: DataRow[] = [
  { x: 1, y: 3 },
  { x: 2, y: 5 },
];

const participantData: DataRow[] = [
  { x: 3, y: 7 },
  { x: 4, y: 9 },
];

describe('NetworkRunOrchestrator', () => {
  describe('coordinator flow', () => {
    it('sends RUN_START, receives ACKs and summaries, sends result', async () => {
      const peerManager = new MockPeerManager();
      peerManager.addPeer('participant-1');

      const config = makeConfig();
      const progressPhases: string[] = [];
      const orchestrator = new NetworkRunOrchestrator(config, peerManager, (phase) => {
        progressPhases.push(phase);
      });

      // Start the coordinator run
      const runPromise = orchestrator.coordinateNetworkRun(coordinatorData);

      // Simulate participant sending READY_ACK
      await tick();
      peerManager.simulateMessage('participant-1', {
        type: ComputationMessageType.READY_ACK,
        runId: 'run-1',
        nodeId: 'participant-1',
        timestamp: Date.now(),
      });

      // Simulate participant sending LOCAL_SUMMARY
      await tick();
      const participantSummary = computeLocalSummary(
        participantData, ['x'], 'y', 'participant-1', 'net-1', 'run-1',
      );
      peerManager.simulateMessage('participant-1', {
        type: ComputationMessageType.LOCAL_SUMMARY,
        runId: 'run-1',
        nodeId: 'participant-1',
        summary: {
          xtx: participantSummary.xtx,
          xty: participantSummary.xty,
          n: participantSummary.n,
          sumY: participantSummary.sumY,
          sumY2: participantSummary.sumY2,
          featureFields: participantSummary.featureFields,
          targetField: participantSummary.targetField,
        },
        timestamp: Date.now(),
      });

      const result = await runPromise;

      // Verify correct regression result (y = 2x + 1)
      expect(result.intercept).toBeCloseTo(1, 6);
      expect(result.coefficients['x']).toBeCloseTo(2, 6);
      expect(result.rSquared).toBeCloseTo(1, 6);
      expect(result.totalN).toBe(4);
      expect(result.contributorCount).toBe(2);

      // Verify RUN_START was sent
      const sentToParticipant = peerManager.getSentMessages('participant-1');
      const runStartMsg = sentToParticipant.find(
        (m: any) => m.type === ComputationMessageType.RUN_START,
      );
      expect(runStartMsg).toBeDefined();

      // Verify AGGREGATED_RESULT was sent
      const resultMsg = sentToParticipant.find(
        (m: any) => m.type === ComputationMessageType.AGGREGATED_RESULT,
      );
      expect(resultMsg).toBeDefined();

      // Verify RUN_COMPLETE was sent
      const completeMsg = sentToParticipant.find(
        (m: any) => m.type === ComputationMessageType.RUN_COMPLETE,
      );
      expect(completeMsg).toBeDefined();

      // Verify progress phases
      expect(progressPhases).toContain('waiting_for_ready');
      expect(progressPhases).toContain('collecting_summaries');
      expect(progressPhases).toContain('computing');
      expect(progressPhases).toContain('distributing_results');
      expect(progressPhases).toContain('complete');
    });
  });

  describe('participant flow', () => {
    it('sends ACK and summary, receives result', async () => {
      const peerManager = new MockPeerManager();
      peerManager.addPeer('coordinator');

      const config = makeConfig({
        myNodeId: 'participant-1',
        isCoordinator: false,
      });

      const orchestrator = new NetworkRunOrchestrator(config, peerManager);

      const runPromise = orchestrator.participateInRun(participantData);

      // Simulate coordinator sending AGGREGATED_RESULT
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

      const result = await runPromise;

      expect(result.intercept).toBe(1);
      expect(result.coefficients['x']).toBe(2);
      expect(result.totalN).toBe(4);

      // Verify READY_ACK was sent to coordinator
      const sentToCoordinator = peerManager.getSentMessages('coordinator');
      const ackMsg = sentToCoordinator.find(
        (m: any) => m.type === ComputationMessageType.READY_ACK,
      );
      expect(ackMsg).toBeDefined();

      // Verify LOCAL_SUMMARY was sent to coordinator
      const summaryMsg = sentToCoordinator.find(
        (m: any) => m.type === ComputationMessageType.LOCAL_SUMMARY,
      );
      expect(summaryMsg).toBeDefined();
    });
  });

  describe('timeout', () => {
    it('rejects when participant does not respond with READY_ACK', async () => {
      const peerManager = new MockPeerManager();
      peerManager.addPeer('participant-1');

      const config = makeConfig({ timeoutMs: 50 });
      const orchestrator = new NetworkRunOrchestrator(config, peerManager);

      await expect(orchestrator.coordinateNetworkRun(coordinatorData)).rejects.toThrow(
        /Timeout/,
      );
    });

    it('rejects when participant does not send LOCAL_SUMMARY', async () => {
      const peerManager = new MockPeerManager();
      peerManager.addPeer('participant-1');

      const config = makeConfig({ timeoutMs: 50 });
      const orchestrator = new NetworkRunOrchestrator(config, peerManager);

      const runPromise = orchestrator.coordinateNetworkRun(coordinatorData);

      // Send ACK but not summary
      await tick();
      peerManager.simulateMessage('participant-1', {
        type: ComputationMessageType.READY_ACK,
        runId: 'run-1',
        nodeId: 'participant-1',
        timestamp: Date.now(),
      });

      await expect(runPromise).rejects.toThrow(/Timeout/);
    });
  });

  describe('abort', () => {
    it('coordinator abort sends RUN_ABORT to all peers', async () => {
      const peerManager = new MockPeerManager();
      peerManager.addPeer('participant-1');

      const config = makeConfig({ timeoutMs: 500 });
      const orchestrator = new NetworkRunOrchestrator(config, peerManager);

      const runPromise = orchestrator.coordinateNetworkRun(coordinatorData);

      // Abort before anyone responds
      await tick();
      orchestrator.abort('user cancelled');

      // The run should reject due to abort
      await expect(runPromise).rejects.toThrow(/abort/i);

      // Verify RUN_ABORT was sent
      const sentToParticipant = peerManager.getSentMessages('participant-1');
      const abortMsg = sentToParticipant.find(
        (m: any) => m.type === ComputationMessageType.RUN_ABORT,
      );
      expect(abortMsg).toBeDefined();
    });

    it('participant aborts when receiving RUN_ABORT from coordinator', async () => {
      const peerManager = new MockPeerManager();
      peerManager.addPeer('coordinator');

      const config = makeConfig({
        myNodeId: 'participant-1',
        isCoordinator: false,
        timeoutMs: 500,
      });

      const orchestrator = new NetworkRunOrchestrator(config, peerManager);
      const runPromise = orchestrator.participateInRun(participantData);

      // Simulate coordinator sending RUN_ABORT
      await tick();
      peerManager.simulateMessage('coordinator', {
        type: ComputationMessageType.RUN_ABORT,
        runId: 'run-1',
        reason: 'coordinator cancelled',
        timestamp: Date.now(),
      });

      await expect(runPromise).rejects.toThrow(/abort/i);
    });
  });

  describe('with no other participants', () => {
    it('coordinator completes immediately with only own data', async () => {
      const peerManager = new MockPeerManager();

      const config = makeConfig({
        participantNodeIds: ['coordinator'],
      });

      const orchestrator = new NetworkRunOrchestrator(config, peerManager);
      const result = await orchestrator.coordinateNetworkRun(coordinatorData);

      // With only own data: y = 2x + 1
      expect(result.intercept).toBeCloseTo(1, 6);
      expect(result.coefficients['x']).toBeCloseTo(2, 6);
      expect(result.totalN).toBe(2);
      expect(result.contributorCount).toBe(1);
    });
  });
});

function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
