import { describe, it, expect } from 'vitest';
import { parseCSV, parseJSON, inferColumnTypes, computeColumnStats } from '../parser';

describe('parseCSV', () => {
  it('parses simple CSV', () => {
    const csv = 'name,age,score\nAlice,30,95.5\nBob,25,88.0';
    const { headers, rows } = parseCSV(csv);
    expect(headers).toEqual(['name', 'age', 'score']);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ name: 'Alice', age: 30, score: 95.5 });
    expect(rows[1]).toEqual({ name: 'Bob', age: 25, score: 88 });
  });

  it('handles quoted fields with commas', () => {
    const csv = 'name,address\nAlice,"123 Main St, Apt 4"\nBob,"456 Oak Ave, Suite 2"';
    const { headers, rows } = parseCSV(csv);
    expect(headers).toEqual(['name', 'address']);
    expect(rows[0].address).toBe('123 Main St, Apt 4');
    expect(rows[1].address).toBe('456 Oak Ave, Suite 2');
  });

  it('handles empty rows', () => {
    const csv = 'a,b\n1,2\n\n3,4\n';
    const { rows } = parseCSV(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ a: 1, b: 2 });
    expect(rows[1]).toEqual({ a: 3, b: 4 });
  });

  it('handles \\r\\n line endings', () => {
    const csv = 'x,y\r\n1,2\r\n3,4';
    const { headers, rows } = parseCSV(csv);
    expect(headers).toEqual(['x', 'y']);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ x: 1, y: 2 });
  });

  it('trims whitespace from headers and values', () => {
    const csv = ' name , age \nAlice , 30 ';
    const { headers, rows } = parseCSV(csv);
    expect(headers).toEqual(['name', 'age']);
    expect(rows[0]).toEqual({ name: 'Alice', age: 30 });
  });

  it('handles boolean values', () => {
    const csv = 'flag\ntrue\nfalse\ntrue';
    const { rows } = parseCSV(csv);
    expect(rows[0].flag).toBe(true);
    expect(rows[1].flag).toBe(false);
  });

  it('handles null values', () => {
    const csv = 'a,b\n1,\n,3';
    const { rows } = parseCSV(csv);
    expect(rows[0].b).toBeNull();
    expect(rows[1].a).toBeNull();
  });

  it('handles escaped quotes in quoted fields', () => {
    const csv = 'name\n"He said ""hello"""';
    const { rows } = parseCSV(csv);
    expect(rows[0].name).toBe('He said "hello"');
  });
});

describe('parseJSON', () => {
  it('parses JSON array of objects', () => {
    const json = JSON.stringify([
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ]);
    const { headers, rows } = parseJSON(json);
    expect(headers).toContain('name');
    expect(headers).toContain('age');
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe('Alice');
    expect(rows[1].age).toBe(25);
  });

  it('handles objects with different keys', () => {
    const json = JSON.stringify([
      { a: 1 },
      { a: 2, b: 3 },
    ]);
    const { headers, rows } = parseJSON(json);
    expect(headers).toContain('a');
    expect(headers).toContain('b');
    expect(rows[0].b).toBeNull();
    expect(rows[1].b).toBe(3);
  });

  it('returns empty for empty array', () => {
    const { headers, rows } = parseJSON('[]');
    expect(headers).toEqual([]);
    expect(rows).toEqual([]);
  });
});

describe('inferColumnTypes', () => {
  it('infers integer type', () => {
    const cols = inferColumnTypes(['x'], [{ x: 1 }, { x: 2 }, { x: 3 }]);
    expect(cols[0].type).toBe('integer');
  });

  it('infers float type', () => {
    const cols = inferColumnTypes(['x'], [{ x: 1.5 }, { x: 2.3 }]);
    expect(cols[0].type).toBe('float');
  });

  it('infers boolean type', () => {
    const cols = inferColumnTypes(['x'], [{ x: true }, { x: false }, { x: true }]);
    expect(cols[0].type).toBe('boolean');
  });

  it('infers string_id type', () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({ x: `id_${i}` }));
    const cols = inferColumnTypes(['x'], rows);
    expect(cols[0].type).toBe('string_id');
  });

  it('infers enum type for low-cardinality strings', () => {
    const rows = [
      { x: 'A' }, { x: 'B' }, { x: 'A' }, { x: 'C' },
      { x: 'B' }, { x: 'A' }, { x: 'C' }, { x: 'A' },
    ];
    const cols = inferColumnTypes(['x'], rows);
    expect(cols[0].type).toBe('enum');
    expect(cols[0].enumValues).toEqual(['A', 'B', 'C']);
  });
});

describe('computeColumnStats', () => {
  it('computes min, max, mean for numeric column', () => {
    const stats = computeColumnStats('val', [{ val: 10 }, { val: 20 }, { val: 30 }]);
    expect(stats.min).toBe(10);
    expect(stats.max).toBe(30);
    expect(stats.mean).toBe(20);
  });

  it('counts nulls', () => {
    const stats = computeColumnStats('x', [{ x: 1 }, { x: null }, { x: 3 }]);
    expect(stats.nullCount).toBe(1);
  });

  it('counts unique values', () => {
    const stats = computeColumnStats('x', [{ x: 'a' }, { x: 'b' }, { x: 'a' }]);
    expect(stats.uniqueCount).toBe(2);
  });
});
