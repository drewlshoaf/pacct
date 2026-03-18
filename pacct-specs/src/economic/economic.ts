import { z } from 'zod';
import { SpecLifecycle, EconomicMode } from '@pacct/protocol-ts';

export const economicSpecSchema = z.object({
  specId: z.string().min(1),
  lifecycle: z.nativeEnum(SpecLifecycle),
  version: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  economicMode: z.nativeEnum(EconomicMode),
  costAllocation: z.object({
    fixedCostPerRun: z.number().min(0, 'fixedCostPerRun must be non-negative').optional(),
    variableCostEnabled: z.boolean(),
    variableCostDescription: z.string().optional(),
  }),
  budgetCap: z.object({
    maxTotalBudget: z.number().positive('maxTotalBudget must be positive').optional(),
    maxBudgetPerPeriod: z.number().positive('maxBudgetPerPeriod must be positive').optional(),
    periodLengthDays: z.number().positive('periodLengthDays must be positive').optional(),
  }).optional(),
  summary: z.string().min(1),
  createdAt: z.number(),
  updatedAt: z.number(),
});
