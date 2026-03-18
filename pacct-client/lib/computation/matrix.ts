/**
 * Basic matrix operations for OLS regression via the normal equation.
 * Small-scale v1: no external dependencies.
 */

export type Matrix = number[][];
export type Vector = number[];

/** Transpose an m x n matrix to n x m. */
export function transpose(m: Matrix): Matrix {
  if (m.length === 0) return [];
  const rows = m.length;
  const cols = m[0].length;
  const result: Matrix = Array.from({ length: cols }, () => new Array(rows));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      result[j][i] = m[i][j];
    }
  }
  return result;
}

/** Multiply two matrices a (m x n) and b (n x p) -> (m x p). */
export function multiply(a: Matrix, b: Matrix): Matrix {
  const m = a.length;
  const n = a[0].length;
  const p = b[0].length;
  if (b.length !== n) {
    throw new Error(`Matrix dimension mismatch: ${m}x${n} * ${b.length}x${p}`);
  }
  const result: Matrix = Array.from({ length: m }, () => new Array(p).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < p; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += a[i][k] * b[k][j];
      }
      result[i][j] = sum;
    }
  }
  return result;
}

/** Multiply matrix m (m x n) by vector v (n) -> vector (m). */
export function multiplyVector(m: Matrix, v: Vector): Vector {
  const rows = m.length;
  const cols = m[0].length;
  if (v.length !== cols) {
    throw new Error(`Dimension mismatch: matrix ${rows}x${cols}, vector length ${v.length}`);
  }
  const result: Vector = new Array(rows);
  for (let i = 0; i < rows; i++) {
    let sum = 0;
    for (let j = 0; j < cols; j++) {
      sum += m[i][j] * v[j];
    }
    result[i] = sum;
  }
  return result;
}

/** Create an n x n identity matrix. */
export function identity(n: number): Matrix {
  const result: Matrix = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    result[i][i] = 1;
  }
  return result;
}

/** Dot product of two vectors. */
export function dotProduct(a: Vector, b: Vector): number {
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
  }
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

/**
 * Compute the inverse of a square matrix using Gauss-Jordan elimination.
 * Throws if the matrix is singular (non-invertible).
 */
export function inverse(m: Matrix): Matrix {
  const n = m.length;
  if (n === 0) throw new Error('Cannot invert empty matrix');
  if (m.some(row => row.length !== n)) {
    throw new Error('Matrix must be square');
  }

  // Build augmented matrix [m | I]
  const aug: Matrix = m.map((row, i) => {
    const augRow = new Array(2 * n).fill(0);
    for (let j = 0; j < n; j++) {
      augRow[j] = row[j];
    }
    augRow[n + i] = 1;
    return augRow;
  });

  // Forward elimination with partial pivoting
  for (let col = 0; col < n; col++) {
    // Find pivot
    let maxVal = Math.abs(aug[col][col]);
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      const absVal = Math.abs(aug[row][col]);
      if (absVal > maxVal) {
        maxVal = absVal;
        maxRow = row;
      }
    }

    if (maxVal < 1e-12) {
      throw new Error('Matrix is singular and cannot be inverted');
    }

    // Swap rows
    if (maxRow !== col) {
      const temp = aug[col];
      aug[col] = aug[maxRow];
      aug[maxRow] = temp;
    }

    // Scale pivot row
    const pivotVal = aug[col][col];
    for (let j = 0; j < 2 * n; j++) {
      aug[col][j] /= pivotVal;
    }

    // Eliminate column in all other rows
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = 0; j < 2 * n; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  // Extract right half (the inverse)
  const result: Matrix = Array.from({ length: n }, (_, i) =>
    aug[i].slice(n)
  );
  return result;
}
