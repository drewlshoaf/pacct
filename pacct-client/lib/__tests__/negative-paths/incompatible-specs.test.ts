import { describe, it, expect } from 'vitest';
import { validateSpecCompatibility } from '@pacct/specs';
import type { SchemaSpec, ComputationSpec, GovernanceSpec, EconomicSpec } from '@pacct/specs';
import {
  SpecLifecycle,
  ComputationType,
  EconomicMode,
  VisibilityMode,
  RunInitiationMode,
  DisconnectBehavior,
} from '@pacct/protocol-ts';

function makeSchema(overrides?: Partial<SchemaSpec>): SchemaSpec {
  return {
    specId: 'schema-1' as any,
    lifecycle: SpecLifecycle.Draft,
    version: '1.0.0',
    name: 'Test Schema',
    fields: [
      { name: 'record_id', type: 'string_id', required: true },
      { name: 'salary', type: 'integer', required: true },
      { name: 'experience', type: 'float', required: true },
      { name: 'active', type: 'boolean', required: false },
    ],
    identifierFieldName: 'record_id',
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

function makeComputation(overrides?: Partial<ComputationSpec>): ComputationSpec {
  return {
    specId: 'comp-1' as any,
    lifecycle: SpecLifecycle.Draft,
    version: '1.0.0',
    name: 'Test Computation',
    computationType: ComputationType.Regression,
    featureFields: ['salary', 'experience'],
    targetField: 'active',
    outputConfig: {
      revealMode: 'coefficients',
      normalize: false,
    },
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

function makeGovernance(overrides?: Partial<GovernanceSpec>): GovernanceSpec {
  return {
    specId: 'gov-1' as any,
    lifecycle: SpecLifecycle.Draft,
    version: '1.0.0',
    name: 'Test Governance',
    membershipPolicy: { minActiveMembers: 3 },
    visibilityPolicy: { mode: VisibilityMode.Full },
    joinPolicy: { approvalTimeoutMs: 86400000, acceptanceTimeoutMs: 86400000 },
    consensusPolicy: {
      admissionSchedule: [{ memberCountMin: 1, memberCountMax: 100, threshold: 0.5 }],
      dissolutionThreshold: 0.67,
    },
    runPolicy: {
      initiationMode: RunInitiationMode.RestrictedManual,
      allowedInitiators: 'any_member',
      minimumIntervalMs: 60000,
      maxRunsPerPeriod: 10,
      periodLengthDays: 30,
      requireCostEstimate: false,
      allMembersOnlineRequired: false,
      midRunDisconnectBehavior: DisconnectBehavior.Abort,
    },
    dissolutionPolicy: {
      preActivationTimeoutMs: 86400000,
      postActivationInactivityTimeoutMs: 604800000,
    },
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

function makeEconomic(overrides?: Partial<EconomicSpec>): EconomicSpec {
  return {
    specId: 'econ-1' as any,
    lifecycle: SpecLifecycle.Draft,
    version: '1.0.0',
    name: 'Test Economic',
    economicMode: EconomicMode.Capitalist,
    costAllocation: { fixedCostPerRun: 10, variableCostEnabled: false },
    budgetCap: { maxTotalBudget: 1000, periodLengthDays: 30 },
    summary: 'Test economic model',
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

describe('Incompatible Cross-Spec Validation', () => {
  it('rejects computation referencing field not in schema', () => {
    const result = validateSpecCompatibility(
      makeSchema(),
      makeComputation({ featureFields: ['nonexistent_field'] }),
      makeGovernance(),
      makeEconomic(),
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'FEATURE_FIELD_NOT_FOUND' }),
    );
  });

  it('rejects computation target field that is string_id type', () => {
    const result = validateSpecCompatibility(
      makeSchema(),
      makeComputation({ targetField: 'record_id' }),
      makeGovernance(),
      makeEconomic(),
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'TARGET_FIELD_NOT_NUMERIC' }),
    );
  });

  it('rejects computation target field that is enum type', () => {
    const schema = makeSchema({
      fields: [
        { name: 'record_id', type: 'string_id', required: true },
        { name: 'category', type: 'enum', required: true, enumValues: ['a', 'b'] },
        { name: 'salary', type: 'integer', required: true },
      ],
    });
    const result = validateSpecCompatibility(
      schema,
      makeComputation({ targetField: 'category', featureFields: ['salary'] }),
      makeGovernance(),
      makeEconomic(),
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'TARGET_FIELD_NOT_NUMERIC' }),
    );
  });

  it('rejects computation feature field that is string_id type', () => {
    const result = validateSpecCompatibility(
      makeSchema(),
      makeComputation({ featureFields: ['record_id'], targetField: 'salary' }),
      makeGovernance(),
      makeEconomic(),
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'FEATURE_FIELD_NOT_NUMERIC' }),
    );
  });

  it('warns when target field is also listed as feature field', () => {
    const result = validateSpecCompatibility(
      makeSchema(),
      makeComputation({ featureFields: ['salary', 'experience'], targetField: 'salary' }),
      makeGovernance(),
      makeEconomic(),
    );
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: 'TARGET_IS_FEATURE' }),
    );
  });

  it('rejects when schema has only string_id fields for computation numeric targets', () => {
    const schema = makeSchema({
      fields: [
        { name: 'id1', type: 'string_id', required: true },
        { name: 'id2', type: 'string_id', required: true },
      ],
    });
    const result = validateSpecCompatibility(
      schema,
      makeComputation({ featureFields: ['id2'], targetField: 'id1' }),
      makeGovernance(),
      makeEconomic(),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  it('rejects minActiveMembers below computation requirement of 3', () => {
    const governance = makeGovernance({
      membershipPolicy: { minActiveMembers: 2 },
    });
    // Note: this would fail governance spec validation too, but
    // cross-validator also catches it
    const result = validateSpecCompatibility(
      makeSchema(),
      makeComputation(),
      governance,
      makeEconomic(),
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'MIN_MEMBERS_TOO_LOW' }),
    );
  });
});
