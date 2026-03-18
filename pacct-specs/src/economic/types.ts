import type { SpecId, Timestamp } from '@pacct/protocol-ts';
import type { SpecLifecycle, EconomicMode } from '@pacct/protocol-ts';

export interface CostAllocation {
  fixedCostPerRun?: number;
  variableCostEnabled: boolean;
  variableCostDescription?: string;
}

export interface BudgetCap {
  maxTotalBudget?: number;
  maxBudgetPerPeriod?: number;
  periodLengthDays?: number;
}

export interface EconomicSpec {
  specId: SpecId;
  lifecycle: SpecLifecycle;
  version: string;
  name: string;
  description?: string;
  economicMode: EconomicMode;
  costAllocation: CostAllocation;
  budgetCap?: BudgetCap;
  summary: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
