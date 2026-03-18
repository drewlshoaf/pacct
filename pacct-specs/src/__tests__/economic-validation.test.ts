import { describe, it, expect } from 'vitest';
import { economicSpecSchema } from '../economic';
import { SpecLifecycle, EconomicMode } from '@pacct/protocol-ts';
import type { SpecId } from '@pacct/protocol-ts';

function validEconomicSpec() {
  return {
    specId: 'econ-1' as SpecId,
    lifecycle: SpecLifecycle.Draft,
    version: '1.0.0',
    name: 'Test Economic',
    economicMode: EconomicMode.Progressive,
    costAllocation: {
      fixedCostPerRun: 10,
      variableCostEnabled: false,
    },
    summary: 'Equal cost sharing',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

describe('economicSpecSchema', () => {
  it('should accept a valid economic spec', () => {
    const result = economicSpecSchema.safeParse(validEconomicSpec());
    expect(result.success).toBe(true);
  });

  it('should reject negative fixedCostPerRun', () => {
    const spec = validEconomicSpec();
    spec.costAllocation.fixedCostPerRun = -5;
    const result = economicSpecSchema.safeParse(spec);
    expect(result.success).toBe(false);
  });

  it('should accept zero fixedCostPerRun', () => {
    const spec = validEconomicSpec();
    spec.costAllocation.fixedCostPerRun = 0;
    const result = economicSpecSchema.safeParse(spec);
    expect(result.success).toBe(true);
  });

  it('should accept spec without budgetCap', () => {
    const spec = validEconomicSpec();
    const result = economicSpecSchema.safeParse(spec);
    expect(result.success).toBe(true);
  });

  it('should accept spec with valid budgetCap', () => {
    const spec = {
      ...validEconomicSpec(),
      budgetCap: {
        maxTotalBudget: 10000,
        maxBudgetPerPeriod: 1000,
        periodLengthDays: 30,
      },
    };
    const result = economicSpecSchema.safeParse(spec);
    expect(result.success).toBe(true);
  });

  it('should reject invalid economicMode', () => {
    const spec = { ...validEconomicSpec(), economicMode: 'invalid' };
    const result = economicSpecSchema.safeParse(spec);
    expect(result.success).toBe(false);
  });

  it('should reject empty summary', () => {
    const spec = { ...validEconomicSpec(), summary: '' };
    const result = economicSpecSchema.safeParse(spec);
    expect(result.success).toBe(false);
  });

  it('should reject non-positive budget values', () => {
    const spec = {
      ...validEconomicSpec(),
      budgetCap: {
        maxTotalBudget: -100,
      },
    };
    const result = economicSpecSchema.safeParse(spec);
    expect(result.success).toBe(false);
  });
});
