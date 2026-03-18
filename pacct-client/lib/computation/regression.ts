/**
 * Pure OLS linear regression implementation using the normal equation.
 * beta = (X^T X)^(-1) X^T y
 */

import { type Matrix, type Vector, transpose, multiply, multiplyVector, inverse } from './matrix';

export interface DataRow {
  [fieldName: string]: number;
}

export interface RegressionInput {
  data: DataRow[];
  featureFields: string[];
  targetField: string;
}

export interface RegressionResult {
  coefficients: Record<string, number>; // field name -> coefficient
  intercept: number;
  rSquared: number;
  residualStdError: number;
  predictions: number[];
  n: number; // sample size
}

/**
 * Compute OLS regression using the normal equation.
 */
export function computeRegression(input: RegressionInput): RegressionResult {
  const { data, featureFields, targetField } = input;
  const n = data.length;

  if (n === 0) {
    throw new Error('Cannot compute regression with empty data');
  }
  if (featureFields.length === 0) {
    throw new Error('At least one feature field is required');
  }

  const p = featureFields.length;

  // Build X matrix with intercept column (first column = 1)
  const X: Matrix = new Array(n);
  const y: Vector = new Array(n);

  for (let i = 0; i < n; i++) {
    const row = data[i];
    const xRow = new Array(p + 1);
    xRow[0] = 1; // intercept
    for (let j = 0; j < p; j++) {
      xRow[j + 1] = row[featureFields[j]] ?? 0;
    }
    X[i] = xRow;
    y[i] = row[targetField] ?? 0;
  }

  // Normal equation: beta = (X^T X)^(-1) X^T y
  const Xt = transpose(X);
  const XtX = multiply(Xt, X);
  const Xty = multiplyVector(Xt, y);
  const XtXInv = inverse(XtX);
  const beta = multiplyVector(XtXInv, Xty);

  const intercept = beta[0];
  const coefficients: Record<string, number> = {};
  for (let j = 0; j < p; j++) {
    coefficients[featureFields[j]] = beta[j + 1];
  }

  // Predictions
  const predictions = multiplyVector(X, beta);

  // R-squared
  const yMean = y.reduce((a, b) => a + b, 0) / n;
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const residual = y[i] - predictions[i];
    ssRes += residual * residual;
    const diff = y[i] - yMean;
    ssTot += diff * diff;
  }
  const rSquared = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  // Residual standard error
  const degreesOfFreedom = n - p - 1;
  const residualStdError = degreesOfFreedom > 0
    ? Math.sqrt(ssRes / degreesOfFreedom)
    : 0;

  return {
    coefficients,
    intercept,
    rSquared,
    residualStdError,
    predictions,
    n,
  };
}

/**
 * Normalize data to mean=0, std=1 for each field.
 */
export function normalizeData(
  data: DataRow[],
  fields: string[]
): { normalized: DataRow[]; means: Record<string, number>; stdDevs: Record<string, number> } {
  const n = data.length;
  if (n === 0) {
    return { normalized: [], means: {}, stdDevs: {} };
  }

  const means: Record<string, number> = {};
  const stdDevs: Record<string, number> = {};

  // Compute means
  for (const field of fields) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += data[i][field] ?? 0;
    }
    means[field] = sum / n;
  }

  // Compute standard deviations
  for (const field of fields) {
    let sumSq = 0;
    const mean = means[field];
    for (let i = 0; i < n; i++) {
      const diff = (data[i][field] ?? 0) - mean;
      sumSq += diff * diff;
    }
    stdDevs[field] = Math.sqrt(sumSq / n);
  }

  // Normalize
  const normalized: DataRow[] = data.map(row => {
    const newRow: DataRow = { ...row };
    for (const field of fields) {
      const std = stdDevs[field];
      if (std === 0) {
        newRow[field] = 0;
      } else {
        newRow[field] = ((row[field] ?? 0) - means[field]) / std;
      }
    }
    return newRow;
  });

  return { normalized, means, stdDevs };
}

/**
 * Clip values to a [min, max] range.
 */
export function clipValues(values: number[], min?: number, max?: number): number[] {
  return values.map(v => {
    let clipped = v;
    if (min !== undefined && clipped < min) clipped = min;
    if (max !== undefined && clipped > max) clipped = max;
    return clipped;
  });
}
