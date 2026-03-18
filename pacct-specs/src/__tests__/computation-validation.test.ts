import { describe, it, expect } from 'vitest';
import { computationSpecSchema } from '../computation';
import { SpecLifecycle, ComputationType } from '@pacct/protocol-ts';
import type { SpecId } from '@pacct/protocol-ts';

function validComputationSpec() {
  return {
    specId: 'comp-1' as SpecId,
    lifecycle: SpecLifecycle.Draft,
    version: '1.0.0',
    name: 'Test Computation',
    computationType: ComputationType.Regression,
    featureFields: ['age', 'income'],
    targetField: 'score',
    outputConfig: {
      revealMode: 'coefficients' as const,
      normalize: true,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

describe('computationSpecSchema', () => {
  it('should accept a valid computation spec', () => {
    const result = computationSpecSchema.safeParse(validComputationSpec());
    expect(result.success).toBe(true);
  });

  it('should reject empty featureFields', () => {
    const spec = { ...validComputationSpec(), featureFields: [] };
    const result = computationSpecSchema.safeParse(spec);
    expect(result.success).toBe(false);
  });

  it('should reject empty targetField', () => {
    const spec = { ...validComputationSpec(), targetField: '' };
    const result = computationSpecSchema.safeParse(spec);
    expect(result.success).toBe(false);
  });

  it('should reject when clipMin > clipMax', () => {
    const spec = {
      ...validComputationSpec(),
      outputConfig: {
        revealMode: 'coefficients' as const,
        normalize: true,
        clipMin: 10,
        clipMax: 5,
      },
    };
    const result = computationSpecSchema.safeParse(spec);
    expect(result.success).toBe(false);
  });

  it('should accept when clipMin equals clipMax', () => {
    const spec = {
      ...validComputationSpec(),
      outputConfig: {
        revealMode: 'coefficients' as const,
        normalize: true,
        clipMin: 5,
        clipMax: 5,
      },
    };
    const result = computationSpecSchema.safeParse(spec);
    expect(result.success).toBe(true);
  });

  it('should accept valid clipMin and clipMax', () => {
    const spec = {
      ...validComputationSpec(),
      outputConfig: {
        revealMode: 'both' as const,
        normalize: false,
        clipMin: 0,
        clipMax: 100,
      },
    };
    const result = computationSpecSchema.safeParse(spec);
    expect(result.success).toBe(true);
  });

  it('should reject invalid computationType', () => {
    const spec = { ...validComputationSpec(), computationType: 'invalid_type' };
    const result = computationSpecSchema.safeParse(spec);
    expect(result.success).toBe(false);
  });

  it('should reject missing required fields', () => {
    const { name, ...rest } = validComputationSpec();
    const result = computationSpecSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});
