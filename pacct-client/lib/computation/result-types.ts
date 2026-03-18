/**
 * Result types for computation runs.
 */

import type { FederatedRegressionResult } from './federated';
import type { RunCoordinatorConfig } from './run-coordinator';

export interface RunOutput {
  runId: string;
  networkId: string;
  result: FederatedRegressionResult;
  localPredictions?: number[];  // only if revealMode includes 'scores'
  completedAt: number;
  config: RunCoordinatorConfig;
}

export interface ResultSummary {
  runId: string;
  rSquared: number;
  totalSamples: number;
  contributors: number;
  featureCount: number;
  coefficientsSummary?: Record<string, number>; // only if revealMode includes 'coefficients'
}

export function summarizeResult(output: RunOutput): ResultSummary {
  const { result, config } = output;
  const summary: ResultSummary = {
    runId: output.runId,
    rSquared: result.rSquared,
    totalSamples: result.totalN,
    contributors: result.contributorCount,
    featureCount: result.featureFields.length,
  };

  if (config.revealMode === 'coefficients' || config.revealMode === 'both') {
    summary.coefficientsSummary = { ...result.coefficients };
  }

  return summary;
}
