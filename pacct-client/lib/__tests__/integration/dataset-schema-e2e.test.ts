/**
 * Dataset + Schema Validation Integration Test
 *
 * Tests the flow of creating a schema, importing datasets,
 * validating them against the schema, extracting data for computation,
 * and feeding into the computation engine.
 */

import { describe, it, expect } from 'vitest';
import type { SchemaSpec } from '@pacct/specs';
import { SpecLifecycle } from '@pacct/protocol-ts';
import type { SpecId } from '@pacct/protocol-ts';
import { parseCSV } from '../../dataset/parser';
import { validateDataset } from '../../dataset/validator';
import { DatasetManager } from '../../dataset/dataset-manager';
import { MemoryAdapter } from '../../persistence/memory-adapter';
import { computeRegression } from '../../computation/regression';
import {
  computeLocalSummary,
  aggregateSummaries,
  computeFederatedResult,
} from '../../computation/federated';

function makeSchemaSpec(): SchemaSpec {
  return {
    specId: 'schema-ds-test' as SpecId,
    lifecycle: SpecLifecycle.Draft,
    version: '1.0.0',
    name: 'DS Test Schema',
    fields: [
      { name: 'patient_id', type: 'string_id', required: true },
      { name: 'age', type: 'integer', required: true, min: 0, max: 150 },
      { name: 'weight', type: 'float', required: true, min: 0 },
      { name: 'is_smoker', type: 'boolean', required: true },
      { name: 'outcome', type: 'float', required: true },
    ],
    identifierFieldName: 'patient_id',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

describe('Dataset + Schema Validation E2E', () => {
  it('validates a correct dataset against schema and feeds into computation', async () => {
    // ── Step 1: Create a schema spec with specific fields and constraints ──
    const schema = makeSchemaSpec();

    // ── Step 2: Import a CSV dataset ──
    const csvGood = [
      'patient_id,age,weight,is_smoker,outcome',
      'P001,25,70.5,false,3.2',
      'P002,45,85.0,true,7.1',
      'P003,30,65.3,false,2.8',
      'P004,55,92.1,true,8.5',
      'P005,40,78.0,false,4.1',
    ].join('\n');

    const storage = new MemoryAdapter();
    const manager = new DatasetManager(storage);

    const importResult = await manager.importFromCSV('test-good', csvGood);
    expect(importResult.success).toBe(true);
    expect(importResult.rowCount).toBe(5);
    expect(importResult.dataset).toBeDefined();

    // ── Step 3: Validate dataset against schema -> passes ──
    const datasetId = importResult.dataset!.id;
    const validationResult = await manager.validateAgainstSchema(datasetId, schema);
    expect(validationResult.valid).toBe(true);
    expect(validationResult.errors).toHaveLength(0);
    expect(validationResult.stats.totalRows).toBe(5);
    expect(validationResult.stats.validRows).toBe(5);
    expect(validationResult.stats.invalidRows).toBe(0);

    // ── Step 5: Use getDatasetForComputation -> verify correct extraction ──
    const featureFields = ['age', 'weight', 'is_smoker'];
    const targetField = 'outcome';
    const computationData = await manager.getDatasetForComputation(
      datasetId,
      featureFields,
      targetField,
    );

    expect(computationData).toHaveLength(5);
    // Verify types are numbers
    for (const row of computationData) {
      expect(typeof row['age']).toBe('number');
      expect(typeof row['weight']).toBe('number');
      expect(typeof row['is_smoker']).toBe('number'); // boolean converted to 0/1
      expect(typeof row['outcome']).toBe('number');
    }
    // First row: P001 has is_smoker=false -> 0
    expect(computationData[0]['is_smoker']).toBe(0);
    // Second row: P002 has is_smoker=true -> 1
    expect(computationData[1]['is_smoker']).toBe(1);

    // ── Step 6: Feed into computation engine -> verify it runs ──
    const summary = computeLocalSummary(
      computationData,
      featureFields,
      targetField,
      'node1',
      'net1',
      'run1',
    );
    expect(summary.n).toBe(5);
    expect(summary.featureFields).toEqual(featureFields);

    // Can aggregate even with a single summary
    const aggregated = aggregateSummaries([summary]);
    const result = computeFederatedResult(aggregated);
    expect(result.totalN).toBe(5);
    expect(result.coefficients).toHaveProperty('age');
    expect(result.coefficients).toHaveProperty('weight');
    expect(result.coefficients).toHaveProperty('is_smoker');
  });

  it('catches validation errors for bad data (wrong types, out of range, missing)', async () => {
    // ── Step 4: Import a bad dataset -> fails with specific errors ──
    const schema = makeSchemaSpec();

    const csvBad = [
      'patient_id,age,weight,is_smoker,outcome',
      'P001,notanumber,70.5,false,3.2',     // age: wrong type
      'P002,-5,85.0,true,7.1',              // age: below min (0)
      'P003,30,65.3,false,2.8',             // valid row
      'P003,40,75.0,false,3.0',             // duplicate identifier
      ',55,92.1,true,8.5',                  // null identifier
      'P006,200,78.0,false,4.1',            // age: above max (150)
    ].join('\n');

    const { headers, rows } = parseCSV(csvBad);
    const result = validateDataset(headers, rows, schema);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);

    // Check for specific error types
    const errorCodes = result.errors.map((e) => e.code);

    // "notanumber" is parsed as a string by CSV parser, which means age won't be a number
    // The CSV parser will coerce it - it stays as string "notanumber"
    // But our validator checks DatasetRow values, and the parser tries Number("notanumber") -> NaN, keeps string
    // So the type check should catch it
    expect(errorCodes).toContain('TYPE_MISMATCH');

    // age=-5 is below min=0
    expect(errorCodes).toContain('OUT_OF_RANGE');

    // Duplicate identifier P003
    expect(errorCodes).toContain('DUPLICATE_IDENTIFIER');

    // Null identifier (empty string is coerced to null by parser)
    expect(errorCodes).toContain('NULL_IDENTIFIER');

    // age=200 is above max=150
    const outOfRangeErrors = result.errors.filter((e) => e.code === 'OUT_OF_RANGE');
    expect(outOfRangeErrors.length).toBeGreaterThanOrEqual(2); // -5 and 200

    expect(result.stats.invalidRows).toBeGreaterThan(0);
  });

  it('detects missing required columns', () => {
    const schema = makeSchemaSpec();

    // Missing 'weight' column entirely
    const csvMissing = [
      'patient_id,age,is_smoker,outcome',
      'P001,25,false,3.2',
    ].join('\n');

    const { headers, rows } = parseCSV(csvMissing);
    const result = validateDataset(headers, rows, schema);

    expect(result.valid).toBe(false);
    const missingErrors = result.errors.filter((e) => e.code === 'MISSING_REQUIRED_COLUMN');
    expect(missingErrors.length).toBeGreaterThanOrEqual(1);
    expect(missingErrors.some((e) => e.column === 'weight')).toBe(true);
  });

  it('warns about unknown columns', () => {
    const schema = makeSchemaSpec();

    const csvExtra = [
      'patient_id,age,weight,is_smoker,outcome,extra_col',
      'P001,25,70.5,false,3.2,hello',
    ].join('\n');

    const { headers, rows } = parseCSV(csvExtra);
    const result = validateDataset(headers, rows, schema);

    // Should be valid (unknown cols are just warnings)
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.code === 'UNKNOWN_COLUMN')).toBe(true);
  });

  it('handles boolean conversion correctly for computation', async () => {
    const storage = new MemoryAdapter();
    const manager = new DatasetManager(storage);

    const csv = [
      'patient_id,age,weight,is_smoker,outcome',
      'P001,25,70.5,true,3.2',
      'P002,30,80.0,false,4.0',
      'P003,35,75.0,true,5.5',
      'P004,40,90.0,false,6.0',
      'P005,28,68.0,true,3.8',
    ].join('\n');

    const importRes = await manager.importFromCSV('bool-test', csv);
    expect(importRes.success).toBe(true);

    const datasetId = importRes.dataset!.id;
    const computationData = await manager.getDatasetForComputation(
      datasetId,
      ['age', 'is_smoker'],
      'outcome',
    );

    expect(computationData[0]['is_smoker']).toBe(1); // true -> 1
    expect(computationData[1]['is_smoker']).toBe(0); // false -> 0

    // Verify we can run regression on it
    const result = computeRegression({
      data: computationData,
      featureFields: ['age', 'is_smoker'],
      targetField: 'outcome',
    });
    expect(result.n).toBe(5);
  });
});
