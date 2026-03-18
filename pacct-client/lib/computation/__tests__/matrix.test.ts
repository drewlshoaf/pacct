import { describe, it, expect } from 'vitest';
import {
  transpose,
  multiply,
  multiplyVector,
  inverse,
  identity,
  dotProduct,
} from '../matrix';

describe('matrix operations', () => {
  describe('transpose', () => {
    it('transposes a 2x3 matrix', () => {
      const m = [
        [1, 2, 3],
        [4, 5, 6],
      ];
      expect(transpose(m)).toEqual([
        [1, 4],
        [2, 5],
        [3, 6],
      ]);
    });

    it('transposes a 1x1 matrix', () => {
      expect(transpose([[7]])).toEqual([[7]]);
    });

    it('handles empty matrix', () => {
      expect(transpose([])).toEqual([]);
    });
  });

  describe('multiply', () => {
    it('multiplies 2x2 matrices', () => {
      const a = [
        [1, 2],
        [3, 4],
      ];
      const b = [
        [5, 6],
        [7, 8],
      ];
      expect(multiply(a, b)).toEqual([
        [19, 22],
        [43, 50],
      ]);
    });

    it('multiplies 3x3 matrices', () => {
      const a = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ];
      const b = [
        [2, 3, 4],
        [5, 6, 7],
        [8, 9, 10],
      ];
      expect(multiply(a, b)).toEqual(b);
    });

    it('multiplies non-square compatible matrices', () => {
      const a = [
        [1, 2, 3],
        [4, 5, 6],
      ];
      const b = [
        [7, 8],
        [9, 10],
        [11, 12],
      ];
      expect(multiply(a, b)).toEqual([
        [58, 64],
        [139, 154],
      ]);
    });

    it('throws on dimension mismatch', () => {
      const a = [[1, 2]];
      const b = [[3, 4]];
      expect(() => multiply(a, b)).toThrow('dimension mismatch');
    });
  });

  describe('identity', () => {
    it('creates 3x3 identity', () => {
      expect(identity(3)).toEqual([
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ]);
    });

    it('creates 1x1 identity', () => {
      expect(identity(1)).toEqual([[1]]);
    });
  });

  describe('inverse', () => {
    it('inverts a 2x2 matrix', () => {
      const m = [
        [4, 7],
        [2, 6],
      ];
      const inv = inverse(m);
      // Verify M * M^-1 = I
      const product = multiply(m, inv);
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          expect(product[i][j]).toBeCloseTo(i === j ? 1 : 0, 10);
        }
      }
    });

    it('inverts a 3x3 matrix', () => {
      const m = [
        [1, 2, 3],
        [0, 1, 4],
        [5, 6, 0],
      ];
      const inv = inverse(m);
      const product = multiply(m, inv);
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          expect(product[i][j]).toBeCloseTo(i === j ? 1 : 0, 10);
        }
      }
    });

    it('throws on singular matrix', () => {
      const m = [
        [1, 2],
        [2, 4],
      ];
      expect(() => inverse(m)).toThrow('singular');
    });
  });

  describe('multiplyVector', () => {
    it('multiplies matrix by vector', () => {
      const m = [
        [1, 2],
        [3, 4],
      ];
      const v = [5, 6];
      expect(multiplyVector(m, v)).toEqual([17, 39]);
    });

    it('throws on dimension mismatch', () => {
      const m = [[1, 2, 3]];
      const v = [1, 2];
      expect(() => multiplyVector(m, v)).toThrow('mismatch');
    });
  });

  describe('dotProduct', () => {
    it('computes dot product', () => {
      expect(dotProduct([1, 2, 3], [4, 5, 6])).toBe(32);
    });

    it('throws on length mismatch', () => {
      expect(() => dotProduct([1, 2], [3])).toThrow('mismatch');
    });
  });
});
