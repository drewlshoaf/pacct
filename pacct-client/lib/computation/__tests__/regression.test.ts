import { describe, it, expect } from 'vitest';
import { computeRegression, normalizeData, clipValues } from '../regression';
import type { DataRow } from '../regression';

describe('regression', () => {
  describe('computeRegression', () => {
    it('fits a simple 2-point line y = 2x + 1', () => {
      const data: DataRow[] = [
        { x: 0, y: 1 },
        { x: 1, y: 3 },
      ];
      const result = computeRegression({
        data,
        featureFields: ['x'],
        targetField: 'y',
      });

      expect(result.intercept).toBeCloseTo(1, 10);
      expect(result.coefficients['x']).toBeCloseTo(2, 10);
      expect(result.rSquared).toBeCloseTo(1, 10);
      expect(result.n).toBe(2);
      expect(result.predictions).toHaveLength(2);
      expect(result.predictions[0]).toBeCloseTo(1, 10);
      expect(result.predictions[1]).toBeCloseTo(3, 10);
    });

    it('fits a multi-feature regression', () => {
      // y = 1 + 2*x1 + 3*x2
      const data: DataRow[] = [
        { x1: 1, x2: 0, y: 3 },
        { x1: 0, x2: 1, y: 4 },
        { x1: 1, x2: 1, y: 6 },
        { x1: 2, x2: 1, y: 8 },
      ];
      const result = computeRegression({
        data,
        featureFields: ['x1', 'x2'],
        targetField: 'y',
      });

      expect(result.intercept).toBeCloseTo(1, 8);
      expect(result.coefficients['x1']).toBeCloseTo(2, 8);
      expect(result.coefficients['x2']).toBeCloseTo(3, 8);
      expect(result.rSquared).toBeCloseTo(1, 8);
    });

    it('gives R-squared = 1 for perfect fit', () => {
      const data: DataRow[] = [
        { x: 1, y: 5 },
        { x: 2, y: 7 },
        { x: 3, y: 9 },
      ];
      const result = computeRegression({
        data,
        featureFields: ['x'],
        targetField: 'y',
      });
      expect(result.rSquared).toBeCloseTo(1, 10);
    });

    it('handles boolean features (0/1)', () => {
      // y = 10 + 5*isActive
      const data: DataRow[] = [
        { isActive: 0, y: 10 },
        { isActive: 1, y: 15 },
        { isActive: 0, y: 10 },
        { isActive: 1, y: 15 },
      ];
      const result = computeRegression({
        data,
        featureFields: ['isActive'],
        targetField: 'y',
      });

      expect(result.intercept).toBeCloseTo(10, 8);
      expect(result.coefficients['isActive']).toBeCloseTo(5, 8);
      expect(result.rSquared).toBeCloseTo(1, 8);
    });

    it('throws on empty data', () => {
      expect(() =>
        computeRegression({ data: [], featureFields: ['x'], targetField: 'y' }),
      ).toThrow('empty data');
    });

    it('throws on no feature fields', () => {
      expect(() =>
        computeRegression({ data: [{ y: 1 }], featureFields: [], targetField: 'y' }),
      ).toThrow('At least one feature');
    });
  });

  describe('normalizeData', () => {
    it('produces mean~0 and std~1', () => {
      const data: DataRow[] = [
        { x: 10, y: 100 },
        { x: 20, y: 200 },
        { x: 30, y: 300 },
        { x: 40, y: 400 },
      ];
      const { normalized, means, stdDevs } = normalizeData(data, ['x', 'y']);

      expect(means['x']).toBeCloseTo(25, 10);
      expect(means['y']).toBeCloseTo(250, 10);

      // Check normalized values have mean 0
      const normXMean = normalized.reduce((s, r) => s + r.x, 0) / normalized.length;
      expect(normXMean).toBeCloseTo(0, 10);

      // Check normalized values have std ~1
      const normXStd = Math.sqrt(
        normalized.reduce((s, r) => s + r.x * r.x, 0) / normalized.length,
      );
      expect(normXStd).toBeCloseTo(1, 10);
    });

    it('handles empty data', () => {
      const { normalized, means, stdDevs } = normalizeData([], ['x']);
      expect(normalized).toEqual([]);
      expect(means).toEqual({});
      expect(stdDevs).toEqual({});
    });

    it('handles constant field (std=0)', () => {
      const data: DataRow[] = [{ x: 5 }, { x: 5 }, { x: 5 }];
      const { normalized } = normalizeData(data, ['x']);
      // All values should become 0 when std is 0
      for (const row of normalized) {
        expect(row.x).toBe(0);
      }
    });
  });

  describe('clipValues', () => {
    it('clips at min', () => {
      expect(clipValues([-5, 0, 5, 10], 0)).toEqual([0, 0, 5, 10]);
    });

    it('clips at max', () => {
      expect(clipValues([-5, 0, 5, 10], undefined, 5)).toEqual([-5, 0, 5, 5]);
    });

    it('clips at both boundaries', () => {
      expect(clipValues([-5, 0, 5, 10], 0, 5)).toEqual([0, 0, 5, 5]);
    });

    it('does nothing without bounds', () => {
      expect(clipValues([1, 2, 3])).toEqual([1, 2, 3]);
    });
  });
});
