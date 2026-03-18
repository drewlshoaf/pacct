import { z } from 'zod';
import { SpecLifecycle } from '@pacct/protocol-ts';

const fieldNameRegex = /^[a-zA-Z][a-zA-Z0-9_]*$/;

export const schemaFieldSchema = z.object({
  name: z.string().min(1).regex(fieldNameRegex, 'Field name must start with a letter and contain only alphanumeric characters and underscores'),
  type: z.enum(['integer', 'float', 'boolean', 'enum', 'string_id']),
  required: z.boolean(),
  description: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  enumValues: z.array(z.string()).optional(),
}).superRefine((field, ctx) => {
  if (field.type === 'enum') {
    if (!field.enumValues || field.enumValues.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'enumValues is required and must be non-empty when type is enum',
        path: ['enumValues'],
      });
    }
  }
  if (field.min !== undefined && field.max !== undefined && field.min > field.max) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'min must be less than or equal to max',
      path: ['min'],
    });
  }
  if ((field.min !== undefined || field.max !== undefined) && field.type !== 'integer' && field.type !== 'float') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'min/max constraints are only valid for integer and float types',
      path: ['min'],
    });
  }
});

export const schemaSpecSchema = z.object({
  specId: z.string().min(1),
  lifecycle: z.nativeEnum(SpecLifecycle),
  version: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  fields: z.array(schemaFieldSchema).min(1, 'At least one field is required'),
  identifierFieldName: z.string().min(1),
  createdAt: z.number(),
  updatedAt: z.number(),
}).superRefine((spec, ctx) => {
  // Check unique field names
  const names = spec.fields.map(f => f.name);
  const seen = new Set<string>();
  for (const name of names) {
    if (seen.has(name)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate field name: ${name}`,
        path: ['fields'],
      });
    }
    seen.add(name);
  }

  // Check identifierFieldName references a string_id field
  const idField = spec.fields.find(f => f.name === spec.identifierFieldName);
  if (!idField) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `identifierFieldName "${spec.identifierFieldName}" does not reference an existing field`,
      path: ['identifierFieldName'],
    });
  } else if (idField.type !== 'string_id') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `identifierFieldName must reference a field of type "string_id", but "${spec.identifierFieldName}" is of type "${idField.type}"`,
      path: ['identifierFieldName'],
    });
  }
});
