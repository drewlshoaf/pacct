/**
 * Federated regression computation protocol.
 *
 * Raw data never leaves the node. Only aggregate statistics (X^T X, X^T y, n,
 * sumY, sumY2) are shared. The normal equation guarantees that aggregating
 * these statistics across nodes produces the same result as computing on the
 * combined dataset.
 */

import { type Matrix, type Vector, inverse, multiplyVector } from './matrix';
import type { DataRow } from './regression';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LocalSummary {
  nodeId: string;
  networkId: string;
  runId: string;
  xtx: Matrix;       // (p+1) x (p+1) — includes intercept column
  xty: Vector;       // (p+1) — includes intercept
  n: number;
  sumY: number;
  sumY2: number;
  featureFields: string[];
  targetField: string;
}

export interface AggregatedSummary {
  xtx: Matrix;
  xty: Vector;
  totalN: number;
  totalSumY: number;
  totalSumY2: number;
  contributorCount: number;
  featureFields: string[];
  targetField: string;
}

export interface FederatedRegressionResult {
  coefficients: Record<string, number>;
  intercept: number;
  rSquared: number;
  totalN: number;
  contributorCount: number;
  featureFields: string[];
  targetField: string;
}

// ---------------------------------------------------------------------------
// Node-side: compute local summary from raw data
// ---------------------------------------------------------------------------

export function computeLocalSummary(
  data: DataRow[],
  featureFields: string[],
  targetField: string,
  nodeId: string,
  networkId: string,
  runId: string,
): LocalSummary {
  const n = data.length;
  const p = featureFields.length;
  const dim = p + 1; // +1 for intercept

  // Initialize X^T X and X^T y
  const xtx: Matrix = Array.from({ length: dim }, () => new Array(dim).fill(0));
  const xty: Vector = new Array(dim).fill(0);
  let sumY = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    const row = data[i];
    const yi = row[targetField] ?? 0;
    sumY += yi;
    sumY2 += yi * yi;

    // Build xi vector: [1, x1, x2, ..., xp]
    const xi = new Array(dim);
    xi[0] = 1;
    for (let j = 0; j < p; j++) {
      xi[j + 1] = row[featureFields[j]] ?? 0;
    }

    // Accumulate X^T X and X^T y
    for (let a = 0; a < dim; a++) {
      xty[a] += xi[a] * yi;
      for (let b = 0; b < dim; b++) {
        xtx[a][b] += xi[a] * xi[b];
      }
    }
  }

  return {
    nodeId,
    networkId,
    runId,
    xtx,
    xty,
    n,
    sumY,
    sumY2,
    featureFields,
    targetField,
  };
}

// ---------------------------------------------------------------------------
// Coordinator-side: aggregate summaries from all nodes
// ---------------------------------------------------------------------------

export function aggregateSummaries(summaries: LocalSummary[]): AggregatedSummary {
  if (summaries.length === 0) {
    throw new Error('No summaries to aggregate');
  }

  const { featureFields, targetField } = summaries[0];
  const dim = featureFields.length + 1;

  const xtx: Matrix = Array.from({ length: dim }, () => new Array(dim).fill(0));
  const xty: Vector = new Array(dim).fill(0);
  let totalN = 0;
  let totalSumY = 0;
  let totalSumY2 = 0;

  for (const summary of summaries) {
    totalN += summary.n;
    totalSumY += summary.sumY;
    totalSumY2 += summary.sumY2;

    for (let a = 0; a < dim; a++) {
      xty[a] += summary.xty[a];
      for (let b = 0; b < dim; b++) {
        xtx[a][b] += summary.xtx[a][b];
      }
    }
  }

  return {
    xtx,
    xty,
    totalN,
    totalSumY,
    totalSumY2,
    contributorCount: summaries.length,
    featureFields,
    targetField,
  };
}

// ---------------------------------------------------------------------------
// Coordinator-side: compute final result from aggregated summary
// ---------------------------------------------------------------------------

export function computeFederatedResult(aggregated: AggregatedSummary): FederatedRegressionResult {
  const { xtx, xty, totalN, totalSumY, totalSumY2, contributorCount, featureFields, targetField } = aggregated;

  if (totalN === 0) {
    throw new Error('Cannot compute regression with zero samples');
  }

  // beta = (X^T X)^(-1) X^T y
  const xtxInv = inverse(xtx);
  const beta = multiplyVector(xtxInv, xty);

  const intercept = beta[0];
  const coefficients: Record<string, number> = {};
  for (let j = 0; j < featureFields.length; j++) {
    coefficients[featureFields[j]] = beta[j + 1];
  }

  // R-squared from aggregated statistics:
  // SS_tot = sum(y_i^2) - n * yMean^2  =  totalSumY2 - totalSumY^2 / totalN
  // SS_res = sum(y_i^2) - beta^T X^T y  (since y_hat = X beta, SS_res = y^T y - beta^T X^T y)
  //        = totalSumY2 - dotProduct(beta, xty)
  const ssTot = totalSumY2 - (totalSumY * totalSumY) / totalN;
  let betaDotXty = 0;
  for (let i = 0; i < beta.length; i++) {
    betaDotXty += beta[i] * xty[i];
  }
  const ssRes = totalSumY2 - betaDotXty;
  const rSquared = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return {
    coefficients,
    intercept,
    rSquared,
    totalN,
    contributorCount,
    featureFields,
    targetField,
  };
}

// ---------------------------------------------------------------------------
// Node-side: compute local predictions using global coefficients
// ---------------------------------------------------------------------------

export function computeLocalPredictions(
  data: DataRow[],
  featureFields: string[],
  coefficients: Record<string, number>,
  intercept: number,
): number[] {
  return data.map(row => {
    let pred = intercept;
    for (const field of featureFields) {
      pred += (coefficients[field] ?? 0) * (row[field] ?? 0);
    }
    return pred;
  });
}
