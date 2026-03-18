import { describe, it, expect } from 'vitest';
import { parseCSV, parseJSON } from '../../dataset/parser';
import { validateDataset } from '../../dataset/validator';
import { DatasetManager } from '../../dataset/dataset-manager';
import { MemoryAdapter } from '../../persistence/memory-adapter';
import type { SchemaSpec } from '@pacct/specs';
import { SpecLifecycle } from '@pacct/protocol-ts';

function makeTestSchema(overrides?: Partial<SchemaSpec>): SchemaSpec {
  return {
    specId: 'schema-1' as any,
    lifecycle: SpecLifecycle.Draft,
    version: '1.0.0',
    name: 'Test Schema',
    fields: [
      { name: 'id', type: 'string_id', required: true },
      { name: 'salary', type: 'integer', required: true, min: 0 },
      { name: 'score', type: 'float', required: false },
    ],
    identifierFieldName: 'id',
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

describe('Dataset Edge Cases - CSV Parsing', () => {
  it('handles empty CSV (headers only, no rows)', () => {
    const result = parseCSV('name,age,salary\n');
    expect(result.headers).toEqual(['name', 'age', 'salary']);
    expect(result.rows).toHaveLength(0);
  });

  it('handles CSV with no headers (empty string)', () => {
    const result = parseCSV('');
    expect(result.headers).toHaveLength(0);
    expect(result.rows).toHaveLength(0);
  });

  it('handles CSV with mismatched column count per row', () => {
    const csv = 'a,b,c\n1,2,3\n4,5\n6,7,8,9';
    const result = parseCSV(csv);
    expect(result.rows).toHaveLength(3);
    // Row with fewer columns should have missing values as empty string -> coerced to null
    expect(result.rows[1]['c']).toBeNull();
    // Row with extra columns - extra columns are ignored (only headers count)
    expect(result.rows[2]['a']).toBe(6);
  });

  it('handles extremely large number in a field', () => {
    const csv = 'id,value\n1,999999999999999999999999999999';
    const result = parseCSV(csv);
    expect(result.rows[0]['value']).toBe(1e+30);
  });

  it('handles NaN in numeric field', () => {
    const csv = 'id,value\n1,NaN';
    const result = parseCSV(csv);
    // NaN is not a number in coercion, so it becomes string 'NaN'
    expect(result.rows[0]['value']).toBe('NaN');
  });

  it('handles Infinity in numeric field', () => {
    const csv = 'id,value\n1,Infinity';
    const result = parseCSV(csv);
    // Infinity becomes number Infinity via Number()
    expect(result.rows[0]['value']).toBe(Infinity);
  });

  it('handles CSV with only whitespace', () => {
    const result = parseCSV('   \n   \n   ');
    // The first line becomes a header with whitespace, trimmed
    // Subsequent lines are empty when trimmed, so skipped
    expect(result.rows).toHaveLength(0);
  });
});

describe('Dataset Edge Cases - JSON Parsing', () => {
  it('handles malformed JSON', () => {
    expect(() => parseJSON('{not valid json')).toThrow();
  });

  it('handles JSON that is not an array', () => {
    const result = parseJSON('{"key": "value"}');
    expect(result.headers).toHaveLength(0);
    expect(result.rows).toHaveLength(0);
  });

  it('handles JSON with nested objects', () => {
    const json = JSON.stringify([
      { id: 1, nested: { a: 1, b: 2 } },
      { id: 2, nested: { a: 3, b: 4 } },
    ]);
    const result = parseJSON(json);
    expect(result.headers).toContain('nested');
    // Nested objects are preserved as-is
    expect(typeof result.rows[0]['nested']).toBe('object');
  });

  it('handles empty JSON array', () => {
    const result = parseJSON('[]');
    expect(result.headers).toHaveLength(0);
    expect(result.rows).toHaveLength(0);
  });
});

describe('Dataset Edge Cases - Validation', () => {
  it('validates dataset with zero rows against schema', () => {
    const schema = makeTestSchema();
    const result = validateDataset(['id', 'salary', 'score'], [], schema);
    expect(result.valid).toBe(true);
    expect(result.stats.totalRows).toBe(0);
    expect(result.stats.validRows).toBe(0);
    expect(result.stats.invalidRows).toBe(0);
  });
});

describe('Dataset Edge Cases - DatasetManager', () => {
  it('getDatasetForComputation with non-existent field returns 0 for missing fields', async () => {
    const storage = new MemoryAdapter();
    const manager = new DatasetManager(storage);

    const csv = 'id,salary\nrec1,50000\nrec2,60000';
    const importResult = await manager.importFromCSV('test', csv);
    expect(importResult.success).toBe(true);

    const datasetId = importResult.dataset!.id;

    // Request a field that doesn't exist in the data
    const rows = await manager.getDatasetForComputation(
      datasetId,
      ['salary'],
      'nonexistent_field',
    );
    // The nonexistent field should get 0 (null/undefined -> 0)
    expect(rows[0]['nonexistent_field']).toBe(0);
  });

  it('importFromCSV with headers-only CSV succeeds with 0 rows', async () => {
    const storage = new MemoryAdapter();
    const manager = new DatasetManager(storage);

    const result = await manager.importFromCSV('empty', 'col1,col2,col3\n');
    expect(result.success).toBe(true);
    expect(result.rowCount).toBe(0);
  });

  it('importFromJSON with malformed JSON returns error', async () => {
    const storage = new MemoryAdapter();
    const manager = new DatasetManager(storage);

    const result = await manager.importFromJSON('bad', '{not json');
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  it('importFromJSON with non-array JSON returns error about no columns', async () => {
    const storage = new MemoryAdapter();
    const manager = new DatasetManager(storage);

    const result = await manager.importFromJSON('bad', '{"key": "value"}');
    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(expect.stringContaining('No columns'));
  });
});
