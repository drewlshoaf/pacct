/**
 * Orchestrates a federated computation run across the peer network.
 *
 * The coordinator (run initiator) drives the protocol:
 *   RUN_START → wait READY_ACK → collect LOCAL_SUMMARY → aggregate → AGGREGATED_RESULT → RUN_COMPLETE
 *
 * Participants respond to the coordinator:
 *   receive RUN_START → READY_ACK → LOCAL_SUMMARY → wait AGGREGATED_RESULT
 */

import type { PeerConnection } from '../transport/peer-connection';
import { RunCoordinator } from './run-coordinator';
import { RunDisconnectHandler } from './disconnect-handler';
import {
  ComputationMessageType,
  parseComputationMessage,
  type RunStartMessage,
  type ReadyAckMessage,
  type LocalSummaryMessage,
  type AggregatedResultMessage,
  type RunCompleteMessage,
  type RunAbortMessage,
  type ComputationMessage,
} from './messages';
import type { DataRow } from './regression';
import type { FederatedRegressionResult, LocalSummary } from './federated';

export interface NetworkRunConfig {
  networkId: string;
  runId: string;
  featureFields: string[];
  targetField: string;
  revealMode: 'coefficients' | 'scores' | 'both';
  clipMin?: number;
  clipMax?: number;
  normalize: boolean;
  participantNodeIds: string[];
  myNodeId: string;
  isCoordinator: boolean;
  timeoutMs: number;
}

export type RunPhase =
  | 'waiting_for_ready'
  | 'collecting_summaries'
  | 'computing'
  | 'distributing_results'
  | 'complete'
  | 'aborted';

export type RunProgressCallback = (phase: RunPhase, detail?: string) => void;

/**
 * Minimal interface that the orchestrator needs from PeerManager so it can
 * be easily mocked in tests.
 */
export interface OrchestratablePeerManager {
  getConnectedPeers(): Map<string, PeerConnection>;
  onPeerMessage(handler: (peerNodeId: string, data: ArrayBuffer | string) => void): void;
  onPeerDisconnected(handler: (peerNodeId: string) => void): void;
}

export class NetworkRunOrchestrator {
  private config: NetworkRunConfig;
  private peerManager: OrchestratablePeerManager;
  private runCoordinator: RunCoordinator;
  private onProgress?: RunProgressCallback;
  private aborted = false;
  private abortReason?: string;
  private disconnectHandler: RunDisconnectHandler;
  private abortListeners: ((reason: string) => void)[] = [];

  constructor(
    config: NetworkRunConfig,
    peerManager: OrchestratablePeerManager,
    onProgress?: RunProgressCallback,
  ) {
    this.config = config;
    this.peerManager = peerManager;
    this.onProgress = onProgress;
    this.runCoordinator = new RunCoordinator({
      networkId: config.networkId,
      runId: config.runId,
      featureFields: config.featureFields,
      targetField: config.targetField,
      revealMode: config.revealMode,
      clipMin: config.clipMin,
      clipMax: config.clipMax,
      normalize: config.normalize,
    });

    // Set up disconnect monitoring
    const otherParticipants = config.participantNodeIds.filter(
      (id) => id !== config.myNodeId,
    );
    this.disconnectHandler = new RunDisconnectHandler(
      peerManager,
      otherParticipants,
      (peerNodeId) => {
        this.abort(`Peer ${peerNodeId} disconnected during run`);
      },
    );
  }

  /**
   * Coordinator flow: drive the full protocol.
   */
  async coordinateNetworkRun(localData: DataRow[]): Promise<FederatedRegressionResult> {
    this.disconnectHandler.startMonitoring();

    try {
      const otherParticipants = this.config.participantNodeIds.filter(
        (id) => id !== this.config.myNodeId,
      );

      // 1. Send RUN_START to all peers
      const runStartMsg: RunStartMessage = {
        type: ComputationMessageType.RUN_START,
        runId: this.config.runId,
        networkId: this.config.networkId,
        initiatorNodeId: this.config.myNodeId,
        featureFields: this.config.featureFields,
        targetField: this.config.targetField,
        config: {
          revealMode: this.config.revealMode,
          clipMin: this.config.clipMin,
          clipMax: this.config.clipMax,
          normalize: this.config.normalize,
        },
        timestamp: Date.now(),
      };
      this.broadcastToParticipants(runStartMsg, otherParticipants);

      // 2. Wait for READY_ACK from all participants
      this.setPhase('waiting_for_ready');
      await this.waitForMessages<ReadyAckMessage>(
        otherParticipants,
        ComputationMessageType.READY_ACK,
        (msg) => msg.nodeId,
      );

      this.checkAborted();

      // 3. Compute own local summary
      this.setPhase('collecting_summaries');
      const ownSummary = this.runCoordinator.computeMyLocalSummary(
        localData,
        this.config.myNodeId,
      );

      // 4. Collect LOCAL_SUMMARY from all participants
      const summaryMessages = await this.waitForMessages<LocalSummaryMessage>(
        otherParticipants,
        ComputationMessageType.LOCAL_SUMMARY,
        (msg) => msg.nodeId,
      );

      this.checkAborted();

      // 5. Aggregate and compute result
      this.setPhase('computing');
      const remoteSummaries: LocalSummary[] = summaryMessages.map((msg) => ({
        nodeId: msg.nodeId,
        networkId: this.config.networkId,
        runId: this.config.runId,
        xtx: msg.summary.xtx,
        xty: msg.summary.xty,
        n: msg.summary.n,
        sumY: msg.summary.sumY,
        sumY2: msg.summary.sumY2,
        featureFields: msg.summary.featureFields,
        targetField: msg.summary.targetField,
      }));

      const result = await this.runCoordinator.coordinateRun(
        localData,
        async () => remoteSummaries,
      );

      // 6. Send AGGREGATED_RESULT to all peers
      this.setPhase('distributing_results');
      const resultMsg: AggregatedResultMessage = {
        type: ComputationMessageType.AGGREGATED_RESULT,
        runId: this.config.runId,
        result: {
          coefficients: result.coefficients,
          intercept: result.intercept,
          rSquared: result.rSquared,
          totalN: result.totalN,
          contributorCount: result.contributorCount,
          featureFields: result.featureFields,
          targetField: result.targetField,
        },
        timestamp: Date.now(),
      };
      this.broadcastToParticipants(resultMsg, otherParticipants);

      // 7. Send RUN_COMPLETE to all peers
      const completeMsg: RunCompleteMessage = {
        type: ComputationMessageType.RUN_COMPLETE,
        runId: this.config.runId,
        timestamp: Date.now(),
      };
      this.broadcastToParticipants(completeMsg, otherParticipants);

      this.setPhase('complete');
      return result;
    } finally {
      this.disconnectHandler.stopMonitoring();
    }
  }

  /**
   * Participant flow: respond to a coordinator-driven run.
   */
  async participateInRun(localData: DataRow[]): Promise<FederatedRegressionResult> {
    this.disconnectHandler.startMonitoring();

    try {
      const coordinatorNodeId = this.config.participantNodeIds.find(
        (id) => id !== this.config.myNodeId,
      );

      // 1. Send READY_ACK to coordinator
      this.setPhase('waiting_for_ready');
      const ackMsg: ReadyAckMessage = {
        type: ComputationMessageType.READY_ACK,
        runId: this.config.runId,
        nodeId: this.config.myNodeId,
        timestamp: Date.now(),
      };
      this.sendToCoordinator(ackMsg);

      // 2. Compute local summary
      this.setPhase('collecting_summaries');
      const summary = this.runCoordinator.computeMyLocalSummary(
        localData,
        this.config.myNodeId,
      );

      // 3. Send LOCAL_SUMMARY to coordinator
      const summaryMsg: LocalSummaryMessage = {
        type: ComputationMessageType.LOCAL_SUMMARY,
        runId: this.config.runId,
        nodeId: this.config.myNodeId,
        summary: {
          xtx: summary.xtx,
          xty: summary.xty,
          n: summary.n,
          sumY: summary.sumY,
          sumY2: summary.sumY2,
          featureFields: summary.featureFields,
          targetField: summary.targetField,
        },
        timestamp: Date.now(),
      };
      this.sendToCoordinator(summaryMsg);

      // 4. Wait for AGGREGATED_RESULT from coordinator
      this.setPhase('computing');
      const [resultMessage] = await this.waitForMessages<AggregatedResultMessage>(
        [coordinatorNodeId!],
        ComputationMessageType.AGGREGATED_RESULT,
        () => coordinatorNodeId!,
      );

      this.checkAborted();

      this.setPhase('complete');

      return {
        coefficients: resultMessage.result.coefficients,
        intercept: resultMessage.result.intercept,
        rSquared: resultMessage.result.rSquared,
        totalN: resultMessage.result.totalN,
        contributorCount: resultMessage.result.contributorCount,
        featureFields: resultMessage.result.featureFields,
        targetField: resultMessage.result.targetField,
      };
    } finally {
      this.disconnectHandler.stopMonitoring();
    }
  }

  /**
   * Abort the current run and notify all peers.
   */
  abort(reason: string): void {
    if (this.aborted) return;
    this.aborted = true;
    this.abortReason = reason;

    const otherParticipants = this.config.participantNodeIds.filter(
      (id) => id !== this.config.myNodeId,
    );

    const abortMsg: RunAbortMessage = {
      type: ComputationMessageType.RUN_ABORT,
      runId: this.config.runId,
      reason,
      timestamp: Date.now(),
    };
    this.broadcastToParticipants(abortMsg, otherParticipants);
    this.setPhase('aborted', reason);

    // Notify any pending waitForMessages calls
    for (const listener of this.abortListeners) {
      listener(reason);
    }
    this.abortListeners = [];
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private checkAborted(): void {
    if (this.aborted) {
      throw new Error(`Run aborted: ${this.abortReason}`);
    }
  }

  private setPhase(phase: RunPhase, detail?: string): void {
    this.onProgress?.(phase, detail);
  }

  private broadcastToParticipants(msg: ComputationMessage, participantIds: string[]): void {
    const data = JSON.stringify(msg);
    const peers = this.peerManager.getConnectedPeers();
    for (const peerId of participantIds) {
      const conn = peers.get(peerId);
      if (conn) {
        conn.send(data);
      }
    }
  }

  private sendToCoordinator(msg: ComputationMessage): void {
    // The coordinator is the initiator, which is the first participant
    // that isn't us. In practice the config tells us who the coordinator is.
    const coordinatorId = this.config.participantNodeIds.find(
      (id) => id !== this.config.myNodeId,
    );
    if (!coordinatorId) return;

    const peers = this.peerManager.getConnectedPeers();
    const conn = peers.get(coordinatorId);
    if (conn) {
      conn.send(JSON.stringify(msg));
    }
  }

  /**
   * Wait for a specific message type from each of the expected peers.
   * Returns the collected messages once all expected peers have responded.
   * Rejects on timeout or abort.
   */
  private waitForMessages<T extends ComputationMessage>(
    expectedPeerIds: string[],
    messageType: ComputationMessageType,
    extractPeerId: (msg: T) => string,
  ): Promise<T[]> {
    return new Promise<T[]>((resolve, reject) => {
      const collected = new Map<string, T>();
      const remaining = new Set(expectedPeerIds);
      let settled = false;

      if (remaining.size === 0) {
        resolve([]);
        return;
      }

      const settle = () => { settled = true; };

      const timeoutId = setTimeout(() => {
        if (settled) return;
        settle();
        const missing = Array.from(remaining).join(', ');
        reject(
          new Error(
            `Timeout waiting for ${messageType} from peers: ${missing}`,
          ),
        );
      }, this.config.timeoutMs);

      // Register abort listener so external abort() calls reject this promise
      const abortListener = (reason: string) => {
        if (settled) return;
        settle();
        clearTimeout(timeoutId);
        reject(new Error(`Run aborted: ${reason}`));
      };
      this.abortListeners.push(abortListener);

      // Also check if already aborted
      if (this.aborted) {
        settle();
        clearTimeout(timeoutId);
        reject(new Error(`Run aborted: ${this.abortReason}`));
        return;
      }

      const handler = (_peerNodeId: string, data: ArrayBuffer | string) => {
        if (settled) return;
        if (typeof data !== 'string') return;

        const parsed = parseComputationMessage(data);
        if (!parsed || parsed.runId !== this.config.runId) return;

        // Handle abort from any peer
        if (parsed.type === ComputationMessageType.RUN_ABORT) {
          settle();
          clearTimeout(timeoutId);
          this.aborted = true;
          this.abortReason = (parsed as RunAbortMessage).reason;
          reject(new Error(`Run aborted: ${this.abortReason}`));
          return;
        }

        if (parsed.type !== messageType) return;

        const peerId = extractPeerId(parsed as T);
        if (remaining.has(peerId)) {
          remaining.delete(peerId);
          collected.set(peerId, parsed as T);

          if (remaining.size === 0) {
            settle();
            clearTimeout(timeoutId);
            resolve(Array.from(collected.values()));
          }
        }
      };

      this.peerManager.onPeerMessage(handler);
    });
  }
}
