/**
 * High-level run session manager that integrates the run engine (policy)
 * with the network orchestrator (execution).
 */

import {
  NetworkRunOrchestrator,
  type NetworkRunConfig,
  type RunProgressCallback,
  type OrchestratablePeerManager,
} from './network-run-orchestrator';
import type { DatasetManager } from '../dataset/dataset-manager';
import type { RunStartMessage } from './messages';
import * as runEngine from '../engines/run';
import type { NetworkState } from '@pacct/protocol-ts';
import type { RunPolicyConfig } from '../engines/types';
import type { FederatedRegressionResult } from './federated';

export interface RunSessionConfig {
  networkId: string;
  datasetId: string;
  featureFields: string[];
  targetField: string;
  revealMode: 'coefficients' | 'scores' | 'both';
  clipMin?: number;
  clipMax?: number;
  normalize: boolean;
}

const DEFAULT_TIMEOUT_MS = 60_000;

export class RunSessionManager {
  constructor(
    private peerManager: OrchestratablePeerManager,
    private datasetManager: DatasetManager,
    private myNodeId: string,
  ) {}

  /**
   * Initiate a new run as coordinator.
   */
  async initiateRun(
    state: NetworkState,
    runPolicy: RunPolicyConfig,
    sessionConfig: RunSessionConfig,
    onProgress?: RunProgressCallback,
  ): Promise<{ newState: NetworkState; result: FederatedRegressionResult } | { error: string }> {
    const now = Date.now();

    // 1. Policy check
    const check = runEngine.canInitiateRun(state, this.myNodeId, runPolicy, now);
    if (!check.allowed) {
      return { error: check.reason ?? 'Run not allowed' };
    }

    // 2. Generate run ID
    const runId = crypto.randomUUID();

    // 3. Update state via engine
    let currentState = runEngine.initiateRun(state, runId, this.myNodeId, now);

    // 4. Load dataset
    const localData = await this.datasetManager.getDatasetForComputation(
      sessionConfig.datasetId,
      sessionConfig.featureFields,
      sessionConfig.targetField,
    );

    // 5. Determine participants from state
    const participantNodeIds = currentState.members
      .filter((m) => m.status === 'active')
      .map((m) => m.nodeId);

    // 6. Create orchestrator
    const config: NetworkRunConfig = {
      networkId: sessionConfig.networkId,
      runId,
      featureFields: sessionConfig.featureFields,
      targetField: sessionConfig.targetField,
      revealMode: sessionConfig.revealMode,
      clipMin: sessionConfig.clipMin,
      clipMax: sessionConfig.clipMax,
      normalize: sessionConfig.normalize,
      participantNodeIds,
      myNodeId: this.myNodeId,
      isCoordinator: true,
      timeoutMs: DEFAULT_TIMEOUT_MS,
    };

    const orchestrator = new NetworkRunOrchestrator(config, this.peerManager, onProgress);

    try {
      // 7. Execute
      const result = await orchestrator.coordinateNetworkRun(localData);

      // 8. Complete run in engine
      currentState = runEngine.completeRun(currentState, runId, Date.now());

      return { newState: currentState, result };
    } catch (err) {
      // 9. Abort run in engine
      const reason = err instanceof Error ? err.message : String(err);
      currentState = runEngine.abortRun(currentState, runId, reason, Date.now());

      return { error: reason };
    }
  }

  /**
   * Handle an incoming run request as a participant.
   */
  async handleIncomingRun(
    state: NetworkState,
    runStartMessage: RunStartMessage,
    datasetId: string,
    onProgress?: RunProgressCallback,
  ): Promise<{ newState: NetworkState; result: FederatedRegressionResult } | { error: string }> {
    try {
      // 1. Load dataset
      const localData = await this.datasetManager.getDatasetForComputation(
        datasetId,
        runStartMessage.featureFields,
        runStartMessage.targetField,
      );

      // 2. Determine participants — the initiator plus ourselves at minimum
      const participantNodeIds = [runStartMessage.initiatorNodeId, this.myNodeId];

      // 3. Create orchestrator as participant
      const config: NetworkRunConfig = {
        networkId: runStartMessage.networkId,
        runId: runStartMessage.runId,
        featureFields: runStartMessage.featureFields,
        targetField: runStartMessage.targetField,
        revealMode: runStartMessage.config.revealMode,
        clipMin: runStartMessage.config.clipMin,
        clipMax: runStartMessage.config.clipMax,
        normalize: runStartMessage.config.normalize,
        participantNodeIds,
        myNodeId: this.myNodeId,
        isCoordinator: false,
        timeoutMs: DEFAULT_TIMEOUT_MS,
      };

      const orchestrator = new NetworkRunOrchestrator(config, this.peerManager, onProgress);

      // 4. Execute as participant
      const result = await orchestrator.participateInRun(localData);

      return { newState: state, result };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      return { error: reason };
    }
  }
}
