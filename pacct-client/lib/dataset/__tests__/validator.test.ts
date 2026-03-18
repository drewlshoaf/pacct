import { describe, it, expect } from 'vitest';
import { validateDataset } from '../validator';
import type { SchemaSpec } from '@pacct/specs';

function makeSchema(overrides?: Partial<SchemaSpec>): SchemaSpec {
  return {
    specId: 'test-schema' as never,
    lifecycle: 'draft' as never,
    version: '1.0.0',
    name: 'Test Schema',
    fields: [
      { name: 'id', type: 'string_id', required: true },
      { name: 'age', type: 'integer', required: true, min: 0, max: 150 },
      { name: 'score', type: 'float', required: false, min: 0, max: 100 },
      { name: 'active', type: 'boolean', required: true },
      { name: 'status', type: 'enum', required: true, enumValues: ['A', 'B', 'C'] },
    ],
    identifierFieldName: 'id',
    createdAt: Date.now() as never,
    updatedAt: Date.now() as never,
    ...overrides,
  };
}

describe('validateDataset', () => {
  it('valid dataset passes', () => {
    const schema = makeSchema();
    const headers = ['id', 'age', 'score', 'active', 'status'];
    const rows = [
      { id: 'p1', age: 30, score: 85.5, active: true, status: 'A' },
      { id: 'p2', age: 25, score: null, active: false, status: 'B' },
    ];
    const result = validateDataset(headers, rows, schema);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.stats.validRows).toBe(2);
  });

  it('missing required column fails', () => {
    const schema = makeSchema();
    const headers = ['id', 'score', 'active', 'status'];
    const rows = [{ id: 'p1', score: 85.5, active: true, status: 'A' }];
    const result = validateDataset(headers, rows, schema);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'MISSING_REQUIRED_COLUMN' && e.column === 'age')).toBe(true);
  });

  it('wrong type fails (string in integer column)', () => {
    const schema = makeSchema();
    const headers = ['id', 'age', 'score', 'active', 'status'];
    const rows = [{ id: 'p1', age: 'thirty' as never, score: 85, active: true, status: 'A' }];
    const result = validateDataset(headers, rows, schema);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'TYPE_MISMATCH' && e.column === 'age')).toBe(true);
  });

  it('out of range fails', () => {
    const schema = makeSchema();
    const headers = ['id', 'age', 'score', 'active', 'status'];
    const rows = [{ id: 'p1', age: 200, score: 85, active: true, status: 'A' }];
    const result = validateDataset(headers, rows, schema);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'OUT_OF_RANGE' && e.column === 'age')).toBe(true);
  });

  it('invalid enum value fails', () => {
    const schema = makeSchema();
    const headers = ['id', 'age', 'score', 'active', 'status'];
    const rows = [{ id: 'p1', age: 30, score: 85, active: true, status: 'X' }];
    const result = validateDataset(headers, rows, schema);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'INVALID_ENUM' && e.column === 'status')).toBe(true);
  });

  it('duplicate identifier fails', () => {
    const schema = makeSchema();
    const headers = ['id', 'age', 'score', 'active', 'status'];
    const rows = [
      { id: 'p1', age: 30, score: 85, active: true, status: 'A' },
      { id: 'p1', age: 25, score: 90, active: false, status: 'B' },
    ];
    const result = validateDataset(headers, rows, schema);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'DUPLICATE_IDENTIFIER')).toBe(true);
  });

  it('optional null fields pass', () => {
    const schema = makeSchema();
    const headers = ['id', 'age', 'score', 'active', 'status'];
    const rows = [{ id: 'p1', age: 30, score: null, active: true, status: 'A' }];
    const result = validateDataset(headers, rows, schema);
    expect(result.valid).toBe(true);
  });

  it('required null field fails', () => {
    const schema = makeSchema();
    const headers = ['id', 'age', 'score', 'active', 'status'];
    const rows = [{ id: 'p1', age: null, score: 85, active: true, status: 'A' }];
    const result = validateDataset(headers, rows, schema);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'REQUIRED_FIELD_NULL' && e.column === 'age')).toBe(true);
  });

  it('unknown columns produce warnings', () => {
    const schema = makeSchema();
    const headers = ['id', 'age', 'score', 'active', 'status', 'extra_col'];
    const rows = [{ id: 'p1', age: 30, score: 85, active: true, status: 'A', extra_col: 'foo' }];
    const result = validateDataset(headers, rows, schema);
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.code === 'UNKNOWN_COLUMN' && w.column === 'extra_col')).toBe(true);
  });

  it('boolean field accepts 0 and 1', () => {
    const schema = makeSchema();
    const headers = ['id', 'age', 'score', 'active', 'status'];
    const rows = [{ id: 'p1', age: 30, score: 85, active: 1, status: 'A' }];
    const result = validateDataset(headers, rows, schema);
    expect(result.valid).toBe(true);
  });
});
