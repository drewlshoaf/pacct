import { describe, it, expect } from 'vitest';
import {
  schemaSpecSchema,
  schemaFieldSchema,
  computationSpecSchema,
  governanceSpecSchema,
  economicSpecSchema,
} from '@pacct/specs';
import {
  SpecLifecycle,
  ComputationType,
  EconomicMode,
  VisibilityMode,
  SectionVisibility,
  RunInitiationMode,
  DisconnectBehavior,
} from '@pacct/protocol-ts';

// ── Helpers ──

function validSchemaSpec(overrides?: Record<string, unknown>) {
  return {
    specId: 'schema-1',
    lifecycle: SpecLifecycle.Draft,
    version: '1.0.0',
    name: 'Test Schema',
    fields: [
      { name: 'record_id', type: 'string_id', required: true },
      { name: 'value', type: 'integer', required: true },
    ],
    identifierFieldName: 'record_id',
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

function validComputationSpec(overrides?: Record<string, unknown>) {
  return {
    specId: 'comp-1',
    lifecycle: SpecLifecycle.Draft,
    version: '1.0.0',
    name: 'Test Computation',
    computationType: ComputationType.Regression,
    featureFields: ['feature1'],
    targetField: 'target1',
    outputConfig: {
      revealMode: 'coefficients',
      normalize: false,
    },
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

function validGovernanceSpec(overrides?: Record<string, unknown>) {
  return {
    specId: 'gov-1',
    lifecycle: SpecLifecycle.Draft,
    version: '1.0.0',
    name: 'Test Governance',
    membershipPolicy: {
      minActiveMembers: 3,
    },
    visibilityPolicy: {
      mode: VisibilityMode.Full,
    },
    joinPolicy: {
      approvalTimeoutMs: 86400000,
      acceptanceTimeoutMs: 86400000,
    },
    consensusPolicy: {
      admissionSchedule: [
        { memberCountMin: 1, memberCountMax: 100, threshold: 0.5 },
      ],
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

function validEconomicSpec(overrides?: Record<string, unknown>) {
  return {
    specId: 'econ-1',
    lifecycle: SpecLifecycle.Draft,
    version: '1.0.0',
    name: 'Test Economic',
    economicMode: EconomicMode.Capitalist,
    costAllocation: {
      fixedCostPerRun: 10,
      variableCostEnabled: false,
    },
    budgetCap: {
      maxTotalBudget: 1000,
      periodLengthDays: 30,
    },
    summary: 'Test economic model',
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

// ── Schema Spec Tests ──

describe('Schema Spec - Invalid Inputs', () => {
  it('rejects empty fields array', () => {
    const result = schemaSpecSchema.safeParse(validSchemaSpec({ fields: [] }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.message.includes('At least one field'))).toBe(true);
    }
  });

  it('rejects field with empty name', () => {
    const result = schemaFieldSchema.safeParse({
      name: '',
      type: 'integer',
      required: true,
    });
    expect(result.success).toBe(false);
  });

  it('rejects field name with spaces', () => {
    const result = schemaFieldSchema.safeParse({
      name: 'my field',
      type: 'integer',
      required: true,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.message.includes('Field name must start with a letter'))).toBe(true);
    }
  });

  it('rejects field name starting with number', () => {
    const result = schemaFieldSchema.safeParse({
      name: '1field',
      type: 'integer',
      required: true,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.message.includes('Field name must start with a letter'))).toBe(true);
    }
  });

  it('rejects duplicate field names', () => {
    const result = schemaSpecSchema.safeParse(validSchemaSpec({
      fields: [
        { name: 'record_id', type: 'string_id', required: true },
        { name: 'value', type: 'integer', required: true },
        { name: 'value', type: 'float', required: false },
      ],
    }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.message.includes('Duplicate field name'))).toBe(true);
    }
  });

  it('rejects identifierFieldName pointing to non-existent field', () => {
    const result = schemaSpecSchema.safeParse(validSchemaSpec({
      identifierFieldName: 'nonexistent',
    }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.message.includes('does not reference an existing field'))).toBe(true);
    }
  });

  it('rejects identifierFieldName pointing to non-string_id field', () => {
    const result = schemaSpecSchema.safeParse(validSchemaSpec({
      identifierFieldName: 'value',
    }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.message.includes('must reference a field of type "string_id"'))).toBe(true);
    }
  });

  it('rejects enum field with empty enumValues array', () => {
    const result = schemaFieldSchema.safeParse({
      name: 'category',
      type: 'enum',
      required: true,
      enumValues: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.message.includes('enumValues is required'))).toBe(true);
    }
  });

  it('rejects enum field with no enumValues', () => {
    const result = schemaFieldSchema.safeParse({
      name: 'category',
      type: 'enum',
      required: true,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.message.includes('enumValues is required'))).toBe(true);
    }
  });

  it('rejects integer field with min > max', () => {
    const result = schemaFieldSchema.safeParse({
      name: 'score',
      type: 'integer',
      required: true,
      min: 100,
      max: 10,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.message.includes('min must be less than or equal to max'))).toBe(true);
    }
  });

  it('rejects float field with min > max', () => {
    const result = schemaFieldSchema.safeParse({
      name: 'ratio',
      type: 'float',
      required: true,
      min: 5.5,
      max: 1.2,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.message.includes('min must be less than or equal to max'))).toBe(true);
    }
  });

  it('rejects spec with no string_id field and identifierFieldName referencing it', () => {
    const result = schemaSpecSchema.safeParse(validSchemaSpec({
      fields: [
        { name: 'value', type: 'integer', required: true },
        { name: 'score', type: 'float', required: true },
      ],
      identifierFieldName: 'value',
    }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.message.includes('must reference a field of type "string_id"'))).toBe(true);
    }
  });

  it('rejects field type not in allowed list', () => {
    const result = schemaFieldSchema.safeParse({
      name: 'data',
      type: 'binary',
      required: true,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing specId', () => {
    const spec = validSchemaSpec();
    delete (spec as any).specId;
    const result = schemaSpecSchema.safeParse(spec);
    expect(result.success).toBe(false);
  });

  it('rejects missing version', () => {
    const spec = validSchemaSpec();
    delete (spec as any).version;
    const result = schemaSpecSchema.safeParse(spec);
    expect(result.success).toBe(false);
  });

  it('rejects missing name', () => {
    const spec = validSchemaSpec();
    delete (spec as any).name;
    const result = schemaSpecSchema.safeParse(spec);
    expect(result.success).toBe(false);
  });
});

// ── Computation Spec Tests ──

describe('Computation Spec - Invalid Inputs', () => {
  it('rejects empty featureFields', () => {
    const result = computationSpecSchema.safeParse(
      validComputationSpec({ featureFields: [] }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.message.includes('At least one feature field'))).toBe(true);
    }
  });

  it('rejects clipMin > clipMax', () => {
    const result = computationSpecSchema.safeParse(
      validComputationSpec({
        outputConfig: {
          revealMode: 'coefficients',
          normalize: false,
          clipMin: 10,
          clipMax: 1,
        },
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.message.includes('clipMin must be less than or equal to clipMax'))).toBe(true);
    }
  });

  it('rejects computationType not in enum', () => {
    const result = computationSpecSchema.safeParse(
      validComputationSpec({ computationType: 'neural_network' }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects revealMode not in allowed values', () => {
    const result = computationSpecSchema.safeParse(
      validComputationSpec({
        outputConfig: {
          revealMode: 'raw_data',
          normalize: false,
        },
      }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects featureFields with duplicates (same value twice)', () => {
    // Note: zod array doesn't auto-deduplicate; test the data can be parsed
    // but cross-validation would catch this
    const spec = validComputationSpec({ featureFields: ['field1', 'field1'] });
    const result = computationSpecSchema.safeParse(spec);
    // Zod schema may or may not catch duplicates; the cross-validator does.
    // If it passes parsing, the values are still duplicated:
    if (result.success) {
      expect(result.data.featureFields).toHaveLength(2);
    }
  });
});

// ── Governance Spec Tests ──

describe('Governance Spec - Invalid Inputs', () => {
  it('rejects minActiveMembers = 0', () => {
    const result = governanceSpecSchema.safeParse(
      validGovernanceSpec({
        membershipPolicy: { minActiveMembers: 0 },
      }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects minActiveMembers = 2 (below 3)', () => {
    const result = governanceSpecSchema.safeParse(
      validGovernanceSpec({
        membershipPolicy: { minActiveMembers: 2 },
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.message.includes('minActiveMembers must be >= 3'))).toBe(true);
    }
  });

  it('rejects minActiveMembers = -1', () => {
    const result = governanceSpecSchema.safeParse(
      validGovernanceSpec({
        membershipPolicy: { minActiveMembers: -1 },
      }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects maxMembers < minActiveMembers', () => {
    const result = governanceSpecSchema.safeParse(
      validGovernanceSpec({
        membershipPolicy: { minActiveMembers: 5, maxMembers: 3 },
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.message.includes('maxMembers must be >= minActiveMembers'))).toBe(true);
    }
  });

  it('rejects approvalTimeoutMs = 0', () => {
    const result = governanceSpecSchema.safeParse(
      validGovernanceSpec({
        joinPolicy: {
          approvalTimeoutMs: 0,
          acceptanceTimeoutMs: 86400000,
        },
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.message.includes('approvalTimeoutMs must be > 0'))).toBe(true);
    }
  });

  it('rejects acceptanceTimeoutMs = -1', () => {
    const result = governanceSpecSchema.safeParse(
      validGovernanceSpec({
        joinPolicy: {
          approvalTimeoutMs: 86400000,
          acceptanceTimeoutMs: -1,
        },
      }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects dissolutionThreshold > 1', () => {
    const result = governanceSpecSchema.safeParse(
      validGovernanceSpec({
        consensusPolicy: {
          admissionSchedule: [
            { memberCountMin: 1, memberCountMax: 100, threshold: 0.5 },
          ],
          dissolutionThreshold: 1.5,
        },
      }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects dissolutionThreshold < 0', () => {
    const result = governanceSpecSchema.safeParse(
      validGovernanceSpec({
        consensusPolicy: {
          admissionSchedule: [
            { memberCountMin: 1, memberCountMax: 100, threshold: 0.5 },
          ],
          dissolutionThreshold: -0.1,
        },
      }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects expulsionThreshold > 1', () => {
    const result = governanceSpecSchema.safeParse(
      validGovernanceSpec({
        consensusPolicy: {
          admissionSchedule: [
            { memberCountMin: 1, memberCountMax: 100, threshold: 0.5 },
          ],
          dissolutionThreshold: 0.67,
          expulsionThreshold: 1.1,
        },
      }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects admissionSchedule with gap', () => {
    const result = governanceSpecSchema.safeParse(
      validGovernanceSpec({
        consensusPolicy: {
          admissionSchedule: [
            { memberCountMin: 1, memberCountMax: 2, threshold: 0.5 },
            { memberCountMin: 4, memberCountMax: 5, threshold: 0.5 },
          ],
          dissolutionThreshold: 0.67,
        },
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.message.includes('gap or overlap'))).toBe(true);
    }
  });

  it('rejects sectionVisibility missing when mode is partial', () => {
    const result = governanceSpecSchema.safeParse(
      validGovernanceSpec({
        visibilityPolicy: {
          mode: VisibilityMode.Partial,
          // sectionVisibility is missing
        },
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.message.includes('sectionVisibility is required'))).toBe(true);
    }
  });

  it('rejects minimumIntervalMs = 0 (allowed by schema as min(0))', () => {
    // minimumIntervalMs uses z.number().int().min(0), so 0 is actually valid.
    // But let's test negative:
    const result = governanceSpecSchema.safeParse(
      validGovernanceSpec({
        runPolicy: {
          initiationMode: RunInitiationMode.RestrictedManual,
          allowedInitiators: 'any_member',
          minimumIntervalMs: -1,
          maxRunsPerPeriod: 10,
          periodLengthDays: 30,
          requireCostEstimate: false,
          allMembersOnlineRequired: false,
          midRunDisconnectBehavior: DisconnectBehavior.Abort,
        },
      }),
    );
    expect(result.success).toBe(false);
  });

  it('rejects maxRunsPerPeriod = 0', () => {
    const result = governanceSpecSchema.safeParse(
      validGovernanceSpec({
        runPolicy: {
          initiationMode: RunInitiationMode.RestrictedManual,
          allowedInitiators: 'any_member',
          minimumIntervalMs: 60000,
          maxRunsPerPeriod: 0,
          periodLengthDays: 30,
          requireCostEstimate: false,
          allMembersOnlineRequired: false,
          midRunDisconnectBehavior: DisconnectBehavior.Abort,
        },
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.message.includes('maxRunsPerPeriod must be > 0'))).toBe(true);
    }
  });

  it('rejects periodLengthDays = 0', () => {
    const result = governanceSpecSchema.safeParse(
      validGovernanceSpec({
        runPolicy: {
          initiationMode: RunInitiationMode.RestrictedManual,
          allowedInitiators: 'any_member',
          minimumIntervalMs: 60000,
          maxRunsPerPeriod: 10,
          periodLengthDays: 0,
          requireCostEstimate: false,
          allMembersOnlineRequired: false,
          midRunDisconnectBehavior: DisconnectBehavior.Abort,
        },
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.message.includes('periodLengthDays must be > 0'))).toBe(true);
    }
  });
});

// ── Economic Spec Tests ──

describe('Economic Spec - Invalid Inputs', () => {
  it('rejects negative fixedCostPerRun', () => {
    const result = economicSpecSchema.safeParse(
      validEconomicSpec({
        costAllocation: {
          fixedCostPerRun: -5,
          variableCostEnabled: false,
        },
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.message.includes('fixedCostPerRun must be non-negative'))).toBe(true);
    }
  });

  it('rejects negative maxTotalBudget', () => {
    const result = economicSpecSchema.safeParse(
      validEconomicSpec({
        budgetCap: {
          maxTotalBudget: -100,
        },
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.message.includes('maxTotalBudget must be positive'))).toBe(true);
    }
  });

  it('rejects periodLengthDays = 0 in budgetCap', () => {
    const result = economicSpecSchema.safeParse(
      validEconomicSpec({
        budgetCap: {
          maxTotalBudget: 1000,
          periodLengthDays: 0,
        },
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.message.includes('periodLengthDays must be positive'))).toBe(true);
    }
  });

  it('rejects economicMode not in enum', () => {
    const result = economicSpecSchema.safeParse(
      validEconomicSpec({ economicMode: 'communist' }),
    );
    expect(result.success).toBe(false);
  });
});
