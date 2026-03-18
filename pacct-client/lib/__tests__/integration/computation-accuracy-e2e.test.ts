/**
 * Computation Accuracy Integration Test
 *
 * Verifies federated computation produces correct results by comparing
 * federated regression (from split data) against local regression on
 * the combined dataset.
 */

import { describe, it, expect } from 'vitest';
import { computeRegression, normalizeData, clipValues } from '../../computation/regression';
import type { DataRow } from '../../computation/regression';
import {
  computeLocalSummary,
  aggregateSummaries,
  computeFederatedResult,
  computeLocalPredictions,
} from '../../computation/federated';
import { RunCoordinator } from '../../computation/run-coordinator';
import { generateSyntheticDataset } from './test-helpers';

describe('Computation Accuracy E2E', () => {
  it('federated regression matches combined-dataset regression (2 features)', () => {
    // ── Step 1: Generate 3 synthetic datasets with known linear relationship ──
    // y = 2*x1 + 3*x2 + 5 + noise
    const coefficients = { x1: 2, x2: 3 };
    const intercept = 5;
    const noiseStdDev = 0.5;

    // ── Step 2: Split data across 3 nodes (different sizes) ──
    const dataNode1 = generateSyntheticDataset(100, coefficients, intercept, noiseStdDev);
    const dataNode2 = generateSyntheticDataset(200, coefficients, intercept, noiseStdDev);
    const dataNode3 = generateSyntheticDataset(150, coefficients, intercept, noiseStdDev);

    const featureFields = ['x1', 'x2'];
    const targetField = 'y';

    // ── Step 3: Each node computes local summary ──
    const summary1 = computeLocalSummary(dataNode1, featureFields, targetField, 'node1', 'net1', 'run1');
    const summary2 = computeLocalSummary(dataNode2, featureFields, targetField, 'node2', 'net1', 'run1');
    const summary3 = computeLocalSummary(dataNode3, featureFields, targetField, 'node3', 'net1', 'run1');

    expect(summary1.n).toBe(100);
    expect(summary2.n).toBe(200);
    expect(summary3.n).toBe(150);

    // ── Step 4: Aggregate and compute federated result ──
    const aggregated = aggregateSummaries([summary1, summary2, summary3]);
    const federatedResult = computeFederatedResult(aggregated);

    // ── Step 5: Compute local regression on COMBINED dataset (all 450 rows) ──
    const combinedData = [...dataNode1, ...dataNode2, ...dataNode3];
    const localResult = computeRegression({ data: combinedData, featureFields, targetField });

    // ── Step 6: Verify: federated coefficients == combined coefficients ──
    expect(federatedResult.coefficients['x1']).toBeCloseTo(localResult.coefficients['x1'], 10);
    expect(federatedResult.coefficients['x2']).toBeCloseTo(localResult.coefficients['x2'], 10);

    // ── Step 7: Verify: federated R-squared == combined R-squared ──
    expect(federatedResult.rSquared).toBeCloseTo(localResult.rSquared, 10);

    // ── Step 8: Verify: federated intercept == combined intercept ──
    expect(federatedResult.intercept).toBeCloseTo(localResult.intercept, 10);

    // Verify values are close to the true generative parameters
    expect(federatedResult.coefficients['x1']).toBeCloseTo(2, 0);
    expect(federatedResult.coefficients['x2']).toBeCloseTo(3, 0);
    expect(federatedResult.intercept).toBeCloseTo(5, 0);
    expect(federatedResult.rSquared).toBeGreaterThan(0.95);
    expect(federatedResult.totalN).toBe(450);
    expect(federatedResult.contributorCount).toBe(3);
  });

  it('federated regression matches with 3 features + 1 target', () => {
    // ── Step 9: Test with 3 feature fields + 1 target ──
    const coefficients = { x1: 1.5, x2: -2.0, x3: 4.0 };
    const intercept = 10;
    const noiseStdDev = 1.0;

    const data1 = generateSyntheticDataset(120, coefficients, intercept, noiseStdDev);
    const data2 = generateSyntheticDataset(180, coefficients, intercept, noiseStdDev);
    const data3 = generateSyntheticDataset(100, coefficients, intercept, noiseStdDev);

    const featureFields = ['x1', 'x2', 'x3'];
    const targetField = 'y';

    const s1 = computeLocalSummary(data1, featureFields, targetField, 'n1', 'net2', 'run2');
    const s2 = computeLocalSummary(data2, featureFields, targetField, 'n2', 'net2', 'run2');
    const s3 = computeLocalSummary(data3, featureFields, targetField, 'n3', 'net2', 'run2');

    const agg = aggregateSummaries([s1, s2, s3]);
    const fedResult = computeFederatedResult(agg);

    const combined = [...data1, ...data2, ...data3];
    const localResult = computeRegression({ data: combined, featureFields, targetField });

    expect(fedResult.coefficients['x1']).toBeCloseTo(localResult.coefficients['x1'], 10);
    expect(fedResult.coefficients['x2']).toBeCloseTo(localResult.coefficients['x2'], 10);
    expect(fedResult.coefficients['x3']).toBeCloseTo(localResult.coefficients['x3'], 10);
    expect(fedResult.intercept).toBeCloseTo(localResult.intercept, 10);
    expect(fedResult.rSquared).toBeCloseTo(localResult.rSquared, 10);
  });

  it('federated regression works with boolean feature (0/1)', () => {
    // ── Step 10: Test with boolean feature ──
    // Generate data where one feature is binary (0 or 1)
    const featureFields = ['x1', 'flag'];
    const targetField = 'y';

    // Manually build data with a boolean-like column
    function makeBoolData(n: number, seed: number): DataRow[] {
      const rows: DataRow[] = [];
      let s = seed;
      function nextR(): number {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        return s / 0x7fffffff;
      }
      for (let i = 0; i < n; i++) {
        const x1 = nextR() * 20 - 10;
        const flag = nextR() > 0.5 ? 1 : 0;
        const y = 3 * x1 + 7 * flag + 2 + (nextR() - 0.5);
        rows.push({ x1, flag, y });
      }
      return rows;
    }

    const data1 = makeBoolData(100, 1);
    const data2 = makeBoolData(150, 2);
    const data3 = makeBoolData(120, 3);

    const s1 = computeLocalSummary(data1, featureFields, targetField, 'n1', 'net3', 'run3');
    const s2 = computeLocalSummary(data2, featureFields, targetField, 'n2', 'net3', 'run3');
    const s3 = computeLocalSummary(data3, featureFields, targetField, 'n3', 'net3', 'run3');

    const agg = aggregateSummaries([s1, s2, s3]);
    const fedResult = computeFederatedResult(agg);

    const combined = [...data1, ...data2, ...data3];
    const localResult = computeRegression({ data: combined, featureFields, targetField });

    expect(fedResult.coefficients['x1']).toBeCloseTo(localResult.coefficients['x1'], 10);
    expect(fedResult.coefficients['flag']).toBeCloseTo(localResult.coefficients['flag'], 10);
    expect(fedResult.intercept).toBeCloseTo(localResult.intercept, 10);
    expect(fedResult.rSquared).toBeCloseTo(localResult.rSquared, 10);

    // Coefficients should be close to true values
    expect(fedResult.coefficients['x1']).toBeCloseTo(3, 0);
    expect(fedResult.coefficients['flag']).toBeCloseTo(7, 0);
  });

  it('works with clip and normalize applied via RunCoordinator', async () => {
    // ── Step 11: Test with clip and normalize applied ──
    const coefficients = { x1: 2, x2: 3 };
    const intercept = 5;
    const noiseStdDev = 0.5;

    const coordinatorData = generateSyntheticDataset(100, coefficients, intercept, noiseStdDev);
    const nodeData1 = generateSyntheticDataset(120, coefficients, intercept, noiseStdDev);
    const nodeData2 = generateSyntheticDataset(130, coefficients, intercept, noiseStdDev);

    const coordinator = new RunCoordinator({
      networkId: 'net4',
      runId: 'run4',
      featureFields: ['x1', 'x2'],
      targetField: 'y',
      revealMode: 'both',
      clipMin: -50,
      clipMax: 50,
      normalize: true,
    });

    // Participant summaries
    const remoteSummary1 = coordinator.computeMyLocalSummary(nodeData1, 'node1');
    const remoteSummary2 = coordinator.computeMyLocalSummary(nodeData2, 'node2');

    // Coordinator runs the full flow
    const result = await coordinator.coordinateRun(
      coordinatorData,
      async () => [remoteSummary1, remoteSummary2],
    );

    expect(result.totalN).toBe(350);
    expect(result.contributorCount).toBe(3);
    expect(result.coefficients['x1']).toBeCloseTo(2, 0);
    expect(result.coefficients['x2']).toBeCloseTo(3, 0);

    // Compute predictions and apply output config
    const predictions = coordinator.computeMyPredictions(coordinatorData, result);
    expect(predictions.length).toBe(100);

    const processed = coordinator.applyOutputConfig(predictions);
    expect(processed.length).toBe(100);

    // After normalization, mean should be ~0 and std ~1
    const mean = processed.reduce((a, b) => a + b, 0) / processed.length;
    expect(mean).toBeCloseTo(0, 5);

    const variance = processed.reduce((a, b) => a + (b - mean) ** 2, 0) / processed.length;
    const std = Math.sqrt(variance);
    expect(std).toBeCloseTo(1, 5);
  });

  it('produces predictions using local data and global coefficients', () => {
    const coefficients = { x1: 2, x2: 3 };
    const intercept = 5;
    const data = generateSyntheticDataset(50, coefficients, intercept, 0.1);
    const featureFields = ['x1', 'x2'];

    const predictions = computeLocalPredictions(data, featureFields, coefficients, intercept);
    expect(predictions.length).toBe(50);

    // Each prediction should be close to the actual y value
    for (let i = 0; i < data.length; i++) {
      const expected = intercept + coefficients.x1 * data[i].x1 + coefficients.x2 * data[i].x2;
      expect(predictions[i]).toBeCloseTo(expected, 10);
    }
  });
});
