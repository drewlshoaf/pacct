import { describe, it, expect } from 'vitest';
import {
  computeLocalSummary,
  aggregateSummaries,
  computeFederatedResult,
  computeLocalPredictions,
} from '../federated';
import { computeRegression } from '../regression';
import type { DataRow } from '../regression';

describe('federated regression', () => {
  describe('computeLocalSummary', () => {
    it('has correct dimensions', () => {
      const data: DataRow[] = [
        { x1: 1, x2: 2, y: 5 },
        { x1: 3, x2: 4, y: 11 },
      ];
      const summary = computeLocalSummary(data, ['x1', 'x2'], 'y', 'n1', 'net1', 'run1');

      // 2 features + intercept = 3
      expect(summary.xtx).toHaveLength(3);
      expect(summary.xtx[0]).toHaveLength(3);
      expect(summary.xty).toHaveLength(3);
      expect(summary.n).toBe(2);
      expect(summary.nodeId).toBe('n1');
      expect(summary.networkId).toBe('net1');
      expect(summary.runId).toBe('run1');
    });

    it('computes correct summary statistics', () => {
      const data: DataRow[] = [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ];
      const summary = computeLocalSummary(data, ['x'], 'y', 'n1', 'net1', 'run1');

      // X = [[1,1],[1,3]] (intercept + x)
      // X^T X = [[2,4],[4,10]]
      expect(summary.xtx[0][0]).toBe(2); // sum(1*1) = 2
      expect(summary.xtx[0][1]).toBe(4); // sum(1*x) = 1+3 = 4
      expect(summary.xtx[1][0]).toBe(4); // same, symmetric
      expect(summary.xtx[1][1]).toBe(10); // sum(x*x) = 1+9 = 10

      // X^T y = [sum(y), sum(x*y)] = [6, 14]
      expect(summary.xty[0]).toBe(6);
      expect(summary.xty[1]).toBe(14);

      expect(summary.sumY).toBe(6);
      expect(summary.sumY2).toBe(20); // 4+16
    });
  });

  describe('single node: federated matches local', () => {
    it('produces the same result as local regression', () => {
      const data: DataRow[] = [
        { x: 1, y: 3 },
        { x: 2, y: 5 },
        { x: 3, y: 7 },
        { x: 4, y: 9 },
      ];
      const localResult = computeRegression({
        data,
        featureFields: ['x'],
        targetField: 'y',
      });

      const summary = computeLocalSummary(data, ['x'], 'y', 'n1', 'net1', 'run1');
      const aggregated = aggregateSummaries([summary]);
      const fedResult = computeFederatedResult(aggregated);

      expect(fedResult.intercept).toBeCloseTo(localResult.intercept, 10);
      expect(fedResult.coefficients['x']).toBeCloseTo(localResult.coefficients['x'], 10);
      expect(fedResult.rSquared).toBeCloseTo(localResult.rSquared, 10);
      expect(fedResult.totalN).toBe(localResult.n);
      expect(fedResult.contributorCount).toBe(1);
    });
  });

  describe('multi-node: federated matches combined', () => {
    it('3 nodes produce the same result as combined dataset', () => {
      const data1: DataRow[] = [
        { x: 1, y: 2.1 },
        { x: 2, y: 3.9 },
      ];
      const data2: DataRow[] = [
        { x: 3, y: 6.2 },
        { x: 4, y: 7.8 },
        { x: 5, y: 10.1 },
      ];
      const data3: DataRow[] = [
        { x: 6, y: 12.0 },
        { x: 7, y: 14.3 },
        { x: 8, y: 15.9 },
      ];

      const allData = [...data1, ...data2, ...data3];
      const localResult = computeRegression({
        data: allData,
        featureFields: ['x'],
        targetField: 'y',
      });

      const s1 = computeLocalSummary(data1, ['x'], 'y', 'n1', 'net1', 'run1');
      const s2 = computeLocalSummary(data2, ['x'], 'y', 'n2', 'net1', 'run1');
      const s3 = computeLocalSummary(data3, ['x'], 'y', 'n3', 'net1', 'run1');

      const aggregated = aggregateSummaries([s1, s2, s3]);
      const fedResult = computeFederatedResult(aggregated);

      expect(fedResult.intercept).toBeCloseTo(localResult.intercept, 8);
      expect(fedResult.coefficients['x']).toBeCloseTo(localResult.coefficients['x'], 8);
      expect(fedResult.rSquared).toBeCloseTo(localResult.rSquared, 8);
      expect(fedResult.totalN).toBe(8);
      expect(fedResult.contributorCount).toBe(3);
    });

    it('multi-feature multi-node matches combined', () => {
      const data1: DataRow[] = [
        { x1: 1, x2: 5, y: 14 },
        { x1: 2, x2: 3, y: 12 },
        { x1: 3, x2: 7, y: 23 },
      ];
      const data2: DataRow[] = [
        { x1: 4, x2: 2, y: 14 },
        { x1: 5, x2: 8, y: 28 },
        { x1: 6, x2: 1, y: 17 },
      ];

      const allData = [...data1, ...data2];
      const localResult = computeRegression({
        data: allData,
        featureFields: ['x1', 'x2'],
        targetField: 'y',
      });

      const s1 = computeLocalSummary(data1, ['x1', 'x2'], 'y', 'n1', 'net1', 'run1');
      const s2 = computeLocalSummary(data2, ['x1', 'x2'], 'y', 'n2', 'net1', 'run1');

      const aggregated = aggregateSummaries([s1, s2]);
      const fedResult = computeFederatedResult(aggregated);

      expect(fedResult.intercept).toBeCloseTo(localResult.intercept, 6);
      for (const field of ['x1', 'x2']) {
        expect(fedResult.coefficients[field]).toBeCloseTo(localResult.coefficients[field], 6);
      }
      expect(fedResult.rSquared).toBeCloseTo(localResult.rSquared, 6);
    });
  });

  describe('aggregateSummaries', () => {
    it('sums correctly', () => {
      const s1 = computeLocalSummary(
        [{ x: 1, y: 2 }],
        ['x'], 'y', 'n1', 'net1', 'run1',
      );
      const s2 = computeLocalSummary(
        [{ x: 3, y: 4 }],
        ['x'], 'y', 'n2', 'net1', 'run1',
      );

      const agg = aggregateSummaries([s1, s2]);
      expect(agg.totalN).toBe(2);
      expect(agg.totalSumY).toBe(6);
      expect(agg.totalSumY2).toBe(20);
      expect(agg.contributorCount).toBe(2);

      // X^T X should be sum of individual X^T X matrices
      expect(agg.xtx[0][0]).toBe(s1.xtx[0][0] + s2.xtx[0][0]);
      expect(agg.xty[0]).toBe(s1.xty[0] + s2.xty[0]);
    });

    it('throws on empty summaries', () => {
      expect(() => aggregateSummaries([])).toThrow('No summaries');
    });
  });

  describe('computeLocalPredictions', () => {
    it('produces expected values', () => {
      const data: DataRow[] = [
        { x: 1 },
        { x: 2 },
        { x: 3 },
      ];
      // y = 5 + 2*x
      const predictions = computeLocalPredictions(data, ['x'], { x: 2 }, 5);
      expect(predictions).toEqual([7, 9, 11]);
    });

    it('handles multiple features', () => {
      const data: DataRow[] = [
        { x1: 1, x2: 10 },
      ];
      // y = 1 + 2*x1 + 0.5*x2
      const predictions = computeLocalPredictions(data, ['x1', 'x2'], { x1: 2, x2: 0.5 }, 1);
      expect(predictions[0]).toBeCloseTo(8, 10);
    });
  });

  describe('empty data handling', () => {
    it('computeLocalSummary with empty data produces n=0', () => {
      const summary = computeLocalSummary([], ['x'], 'y', 'n1', 'net1', 'run1');
      expect(summary.n).toBe(0);
      expect(summary.sumY).toBe(0);
      expect(summary.sumY2).toBe(0);
    });

    it('computeFederatedResult throws on zero total samples', () => {
      const summary = computeLocalSummary([], ['x'], 'y', 'n1', 'net1', 'run1');
      const agg = aggregateSummaries([summary]);
      expect(() => computeFederatedResult(agg)).toThrow();
    });
  });
});
