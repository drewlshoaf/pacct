/**
 * Run coordinator — orchestrates a federated computation run.
 */

import type { DataRow } from './regression';
import { normalizeData, clipValues } from './regression';
import {
  type LocalSummary,
  type FederatedRegressionResult,
  computeLocalSummary,
  aggregateSummaries,
  computeFederatedResult,
  computeLocalPredictions,
} from './federated';

export interface RunCoordinatorConfig {
  networkId: string;
  runId: string;
  featureFields: string[];
  targetField: string;
  revealMode: 'coefficients' | 'scores' | 'both';
  clipMin?: number;
  clipMax?: number;
  normalize: boolean;
}

export class RunCoordinator {
  constructor(private config: RunCoordinatorConfig) {}

  /**
   * For the initiator/coordinator: orchestrate the full run.
   *
   * 1. Compute own local summary
   * 2. Receive summaries from other participants via the callback
   * 3. Aggregate all summaries (own + received)
   * 4. Compute global result
   */
  async coordinateRun(
    localData: DataRow[],
    receiveSummaries: () => Promise<LocalSummary[]>,
  ): Promise<FederatedRegressionResult> {
    const { networkId, runId, featureFields, targetField } = this.config;

    // Compute own summary
    const ownSummary = computeLocalSummary(
      localData,
      featureFields,
      targetField,
      'coordinator',
      networkId,
      runId,
    );

    // Receive summaries from other nodes
    const remoteSummaries = await receiveSummaries();

    // Aggregate all
    const allSummaries = [ownSummary, ...remoteSummaries];
    const aggregated = aggregateSummaries(allSummaries);

    // Compute global result
    return computeFederatedResult(aggregated);
  }

  /**
   * For participants: compute local summary to send to the coordinator.
   */
  computeMyLocalSummary(data: DataRow[], nodeId: string): LocalSummary {
    const { networkId, runId, featureFields, targetField } = this.config;
    return computeLocalSummary(data, featureFields, targetField, nodeId, networkId, runId);
  }

  /**
   * After receiving global result: compute local predictions.
   */
  computeMyPredictions(data: DataRow[], result: FederatedRegressionResult): number[] {
    return computeLocalPredictions(
      data,
      result.featureFields,
      result.coefficients,
      result.intercept,
    );
  }

  /**
   * Apply output config (clip and/or normalize) to prediction values.
   */
  applyOutputConfig(predictions: number[]): number[] {
    let result = predictions;

    // Clip first
    if (this.config.clipMin !== undefined || this.config.clipMax !== undefined) {
      result = clipValues(result, this.config.clipMin, this.config.clipMax);
    }

    // Normalize if requested (z-score normalization)
    if (this.config.normalize && result.length > 0) {
      const n = result.length;
      const mean = result.reduce((a, b) => a + b, 0) / n;
      let sumSq = 0;
      for (const v of result) {
        const diff = v - mean;
        sumSq += diff * diff;
      }
      const std = Math.sqrt(sumSq / n);
      if (std > 0) {
        result = result.map(v => (v - mean) / std);
      } else {
        result = result.map(() => 0);
      }
    }

    return result;
  }
}
