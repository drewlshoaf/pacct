import { describe, it, expect } from 'vitest';
import { RunCoordinator } from '../run-coordinator';
import { computeLocalSummary } from '../federated';
import type { DataRow } from '../regression';
import type { RunCoordinatorConfig } from '../run-coordinator';

const baseConfig: RunCoordinatorConfig = {
  networkId: 'net1',
  runId: 'run1',
  featureFields: ['x'],
  targetField: 'y',
  revealMode: 'both',
  normalize: false,
};

describe('RunCoordinator', () => {
  describe('coordinateRun', () => {
    it('produces a valid result', async () => {
      const coordinator = new RunCoordinator(baseConfig);

      const localData: DataRow[] = [
        { x: 1, y: 3 },
        { x: 2, y: 5 },
      ];

      const remoteData: DataRow[] = [
        { x: 3, y: 7 },
        { x: 4, y: 9 },
      ];

      const remoteSummary = computeLocalSummary(
        remoteData, ['x'], 'y', 'node-2', 'net1', 'run1',
      );

      const result = await coordinator.coordinateRun(
        localData,
        async () => [remoteSummary],
      );

      expect(result.intercept).toBeCloseTo(1, 8);
      expect(result.coefficients['x']).toBeCloseTo(2, 8);
      expect(result.rSquared).toBeCloseTo(1, 8);
      expect(result.totalN).toBe(4);
      expect(result.contributorCount).toBe(2);
    });
  });

  describe('computeMyLocalSummary', () => {
    it('returns a valid local summary', () => {
      const coordinator = new RunCoordinator(baseConfig);
      const data: DataRow[] = [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ];
      const summary = coordinator.computeMyLocalSummary(data, 'my-node');
      expect(summary.nodeId).toBe('my-node');
      expect(summary.networkId).toBe('net1');
      expect(summary.runId).toBe('run1');
      expect(summary.n).toBe(2);
    });
  });

  describe('computeMyPredictions', () => {
    it('produces correct predictions from a federated result', () => {
      const coordinator = new RunCoordinator(baseConfig);
      const data: DataRow[] = [
        { x: 5 },
        { x: 10 },
      ];
      const result = {
        coefficients: { x: 2 },
        intercept: 1,
        rSquared: 1,
        totalN: 100,
        contributorCount: 3,
        featureFields: ['x'],
        targetField: 'y',
      };
      const predictions = coordinator.computeMyPredictions(data, result);
      expect(predictions).toEqual([11, 21]);
    });
  });

  describe('applyOutputConfig', () => {
    it('clips correctly', () => {
      const coordinator = new RunCoordinator({
        ...baseConfig,
        clipMin: 0,
        clipMax: 10,
      });
      const result = coordinator.applyOutputConfig([-5, 3, 7, 15]);
      expect(result).toEqual([0, 3, 7, 10]);
    });

    it('normalizes correctly', () => {
      const coordinator = new RunCoordinator({
        ...baseConfig,
        normalize: true,
      });
      const input = [10, 20, 30, 40];
      const result = coordinator.applyOutputConfig(input);

      // Check mean is ~0
      const mean = result.reduce((a, b) => a + b, 0) / result.length;
      expect(mean).toBeCloseTo(0, 10);

      // Check std is ~1
      const std = Math.sqrt(
        result.reduce((s, v) => s + v * v, 0) / result.length,
      );
      expect(std).toBeCloseTo(1, 10);
    });

    it('clips then normalizes when both set', () => {
      const coordinator = new RunCoordinator({
        ...baseConfig,
        clipMin: 0,
        clipMax: 100,
        normalize: true,
      });
      const input = [-50, 25, 75, 150];
      const result = coordinator.applyOutputConfig(input);

      // After clip: [0, 25, 75, 100]
      // Then normalize
      const mean = result.reduce((a, b) => a + b, 0) / result.length;
      expect(mean).toBeCloseTo(0, 10);
    });

    it('handles constant predictions with normalize', () => {
      const coordinator = new RunCoordinator({
        ...baseConfig,
        normalize: true,
      });
      const result = coordinator.applyOutputConfig([5, 5, 5]);
      expect(result).toEqual([0, 0, 0]);
    });

    it('does nothing when no config', () => {
      const coordinator = new RunCoordinator(baseConfig);
      expect(coordinator.applyOutputConfig([1, 2, 3])).toEqual([1, 2, 3]);
    });
  });
});
