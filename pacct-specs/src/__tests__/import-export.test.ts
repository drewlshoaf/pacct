import { describe, it, expect } from 'vitest';
import {
  exportSpecToJson,
  exportSpecToYaml,
  importSpecFromJson,
  importSpecFromYaml,
} from '../import-export';
import { SpecLifecycle, ComputationType, EconomicMode } from '@pacct/protocol-ts';
import type { SpecId } from '@pacct/protocol-ts';

const now = Date.now();

function validSchemaSpec() {
  return {
    specId: 'schema-1' as SpecId,
    lifecycle: SpecLifecycle.Draft,
    version: '1.0.0',
    name: 'Test Schema',
    fields: [
      { name: 'user_id', type: 'string_id' as const, required: true },
      { name: 'age', type: 'integer' as const, required: true },
    ],
    identifierFieldName: 'user_id',
    createdAt: now,
    updatedAt: now,
  };
}

function validComputationSpec() {
  return {
    specId: 'comp-1' as SpecId,
    lifecycle: SpecLifecycle.Draft,
    version: '1.0.0',
    name: 'Test Computation',
    computationType: ComputationType.Regression,
    featureFields: ['age'],
    targetField: 'score',
    outputConfig: { revealMode: 'coefficients' as const, normalize: true },
    createdAt: now,
    updatedAt: now,
  };
}

function validEconomicSpec() {
  return {
    specId: 'econ-1' as SpecId,
    lifecycle: SpecLifecycle.Draft,
    version: '1.0.0',
    name: 'Test Economic',
    economicMode: EconomicMode.Progressive,
    costAllocation: { fixedCostPerRun: 0, variableCostEnabled: false },
    summary: 'Test',
    createdAt: now,
    updatedAt: now,
  };
}

describe('import/export', () => {
  describe('JSON roundtrip', () => {
    it('should roundtrip a schema spec via JSON', () => {
      const spec = validSchemaSpec();
      const json = exportSpecToJson(spec);
      const result = importSpecFromJson(json, 'schema');
      expect(result.valid).toBe(true);
      expect(result.spec).toBeDefined();
      expect((result.spec as typeof spec).name).toBe('Test Schema');
    });

    it('should roundtrip a computation spec via JSON', () => {
      const spec = validComputationSpec();
      const json = exportSpecToJson(spec);
      const result = importSpecFromJson(json, 'computation');
      expect(result.valid).toBe(true);
      expect(result.spec).toBeDefined();
    });

    it('should roundtrip an economic spec via JSON', () => {
      const spec = validEconomicSpec();
      const json = exportSpecToJson(spec);
      const result = importSpecFromJson(json, 'economic');
      expect(result.valid).toBe(true);
      expect(result.spec).toBeDefined();
    });

    it('should fail on invalid JSON', () => {
      const result = importSpecFromJson('not valid json', 'schema');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_JSON')).toBe(true);
    });

    it('should fail on valid JSON but invalid spec', () => {
      const result = importSpecFromJson('{"name": "test"}', 'schema');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('YAML roundtrip', () => {
    it('should roundtrip a schema spec via YAML', () => {
      const spec = validSchemaSpec();
      const yamlStr = exportSpecToYaml(spec);
      const result = importSpecFromYaml(yamlStr, 'schema');
      expect(result.valid).toBe(true);
      expect(result.spec).toBeDefined();
      expect((result.spec as typeof spec).name).toBe('Test Schema');
    });

    it('should roundtrip a computation spec via YAML', () => {
      const spec = validComputationSpec();
      const yamlStr = exportSpecToYaml(spec);
      const result = importSpecFromYaml(yamlStr, 'computation');
      expect(result.valid).toBe(true);
      expect(result.spec).toBeDefined();
    });

    it('should roundtrip an economic spec via YAML', () => {
      const spec = validEconomicSpec();
      const yamlStr = exportSpecToYaml(spec);
      const result = importSpecFromYaml(yamlStr, 'economic');
      expect(result.valid).toBe(true);
      expect(result.spec).toBeDefined();
    });

    it('should fail on invalid YAML that parses to wrong type', () => {
      const result = importSpecFromYaml('just a string', 'schema');
      expect(result.valid).toBe(false);
    });

    it('should fail on valid YAML but invalid spec', () => {
      const result = importSpecFromYaml('name: test\nversion: 1', 'schema');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('exportSpecToJson', () => {
    it('should produce valid JSON', () => {
      const json = exportSpecToJson(validSchemaSpec());
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should be pretty-printed', () => {
      const json = exportSpecToJson(validSchemaSpec());
      expect(json).toContain('\n');
    });
  });

  describe('exportSpecToYaml', () => {
    it('should produce valid YAML', () => {
      const yamlStr = exportSpecToYaml(validSchemaSpec());
      expect(yamlStr.length).toBeGreaterThan(0);
      expect(yamlStr).toContain('name:');
    });
  });
});
