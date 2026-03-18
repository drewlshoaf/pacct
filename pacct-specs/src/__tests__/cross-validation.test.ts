import { describe, it, expect } from 'vitest';
import { validateSpecCompatibility } from '../cross-validation';
import {
  SpecLifecycle,
  ComputationType,
  EconomicMode,
  VisibilityMode,
  RunInitiationMode,
  DisconnectBehavior,
} from '@pacct/protocol-ts';
import type { SpecId } from '@pacct/protocol-ts';
import type { SchemaSpec } from '../schema';
import type { ComputationSpec } from '../computation';
import type { GovernanceSpec } from '../governance';
import type { EconomicSpec } from '../economic';

const now = Date.now();

function makeSchemaSpec(): SchemaSpec {
  return {
    specId: 'schema-1' as SpecId,
    lifecycle: SpecLifecycle.Draft,
    version: '1.0.0',
    name: 'Test Schema',
    fields: [
      { name: 'user_id', type: 'string_id', required: true },
      { name: 'age', type: 'integer', required: true },
      { name: 'income', type: 'float', required: true },
      { name: 'score', type: 'float', required: true },
      { name: 'active', type: 'boolean', required: false },
      { name: 'category', type: 'enum', required: false, enumValues: ['a', 'b'] },
    ],
    identifierFieldName: 'user_id',
    createdAt: now,
    updatedAt: now,
  };
}

function makeComputationSpec(): ComputationSpec {
  return {
    specId: 'comp-1' as SpecId,
    lifecycle: SpecLifecycle.Draft,
    version: '1.0.0',
    name: 'Test Computation',
    computationType: ComputationType.Regression,
    featureFields: ['age', 'income', 'active'],
    targetField: 'score',
    outputConfig: {
      revealMode: 'coefficients',
      normalize: true,
    },
    createdAt: now,
    updatedAt: now,
  };
}

function makeGovernanceSpec(): GovernanceSpec {
  return {
    specId: 'gov-1' as SpecId,
    lifecycle: SpecLifecycle.Draft,
    version: '1.0.0',
    name: 'Test Governance',
    membershipPolicy: { minActiveMembers: 3 },
    visibilityPolicy: { mode: VisibilityMode.Full },
    joinPolicy: { approvalTimeoutMs: 86400000, acceptanceTimeoutMs: 86400000 },
    consensusPolicy: {
      admissionSchedule: [{ memberCountMin: 1, memberCountMax: 10, threshold: 1.0 }],
      dissolutionThreshold: 0.75,
    },
    runPolicy: {
      initiationMode: RunInitiationMode.RestrictedManual,
      allowedInitiators: 'any_member',
      minimumIntervalMs: 3600000,
      maxRunsPerPeriod: 10,
      periodLengthDays: 30,
      requireCostEstimate: false,
      allMembersOnlineRequired: true,
      midRunDisconnectBehavior: DisconnectBehavior.Abort,
    },
    dissolutionPolicy: {
      preActivationTimeoutMs: 604800000,
      postActivationInactivityTimeoutMs: 2592000000,
    },
    createdAt: now,
    updatedAt: now,
  };
}

function makeEconomicSpec(): EconomicSpec {
  return {
    specId: 'econ-1' as SpecId,
    lifecycle: SpecLifecycle.Draft,
    version: '1.0.0',
    name: 'Test Economic',
    economicMode: EconomicMode.Progressive,
    costAllocation: { fixedCostPerRun: 0, variableCostEnabled: false },
    summary: 'Equal sharing',
    createdAt: now,
    updatedAt: now,
  };
}

describe('validateSpecCompatibility', () => {
  it('should pass for compatible specs', () => {
    const result = validateSpecCompatibility(
      makeSchemaSpec(),
      makeComputationSpec(),
      makeGovernanceSpec(),
      makeEconomicSpec(),
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail when a featureField does not exist in schema', () => {
    const comp = makeComputationSpec();
    comp.featureFields = ['age', 'nonexistent_field'];
    const result = validateSpecCompatibility(
      makeSchemaSpec(),
      comp,
      makeGovernanceSpec(),
      makeEconomicSpec(),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'FEATURE_FIELD_NOT_FOUND')).toBe(true);
  });

  it('should fail when featureField is not numeric', () => {
    const comp = makeComputationSpec();
    comp.featureFields = ['age', 'category'];
    const result = validateSpecCompatibility(
      makeSchemaSpec(),
      comp,
      makeGovernanceSpec(),
      makeEconomicSpec(),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'FEATURE_FIELD_NOT_NUMERIC')).toBe(true);
  });

  it('should fail when targetField does not exist in schema', () => {
    const comp = makeComputationSpec();
    comp.targetField = 'nonexistent';
    const result = validateSpecCompatibility(
      makeSchemaSpec(),
      comp,
      makeGovernanceSpec(),
      makeEconomicSpec(),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'TARGET_FIELD_NOT_FOUND')).toBe(true);
  });

  it('should fail when targetField is not numeric (integer/float)', () => {
    const comp = makeComputationSpec();
    comp.targetField = 'active'; // boolean is not valid for target
    const result = validateSpecCompatibility(
      makeSchemaSpec(),
      comp,
      makeGovernanceSpec(),
      makeEconomicSpec(),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'TARGET_FIELD_NOT_NUMERIC')).toBe(true);
  });

  it('should warn when targetField is also a featureField', () => {
    const comp = makeComputationSpec();
    comp.featureFields = ['age', 'score'];
    comp.targetField = 'score';
    const result = validateSpecCompatibility(
      makeSchemaSpec(),
      comp,
      makeGovernanceSpec(),
      makeEconomicSpec(),
    );
    expect(result.warnings.some(w => w.code === 'TARGET_IS_FEATURE')).toBe(true);
  });

  it('should fail when minActiveMembers < 3', () => {
    const gov = makeGovernanceSpec();
    gov.membershipPolicy.minActiveMembers = 2;
    const result = validateSpecCompatibility(
      makeSchemaSpec(),
      makeComputationSpec(),
      gov,
      makeEconomicSpec(),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'MIN_MEMBERS_TOO_LOW')).toBe(true);
  });
});
