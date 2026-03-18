import { z } from 'zod';
import { SpecLifecycle, ComputationType } from '@pacct/protocol-ts';

export const outputConfigSchema = z.object({
  revealMode: z.enum(['coefficients', 'scores', 'both']),
  clipMin: z.number().optional(),
  clipMax: z.number().optional(),
  normalize: z.boolean(),
}).superRefine((config, ctx) => {
  if (config.clipMin !== undefined && config.clipMax !== undefined && config.clipMin > config.clipMax) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'clipMin must be less than or equal to clipMax',
      path: ['clipMin'],
    });
  }
});

export const computationSpecSchema = z.object({
  specId: z.string().min(1),
  lifecycle: z.nativeEnum(SpecLifecycle),
  version: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  computationType: z.nativeEnum(ComputationType),
  featureFields: z.array(z.string().min(1)).min(1, 'At least one feature field is required'),
  targetField: z.string().min(1),
  outputConfig: outputConfigSchema,
  createdAt: z.number(),
  updatedAt: z.number(),
});
