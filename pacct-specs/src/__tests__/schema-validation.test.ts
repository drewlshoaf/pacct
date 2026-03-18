import { describe, it, expect } from 'vitest';
import { schemaSpecSchema, schemaFieldSchema } from '../schema';
import { SpecLifecycle } from '@pacct/protocol-ts';
import type { SpecId } from '@pacct/protocol-ts';

function validSchemaSpec() {
  return {
    specId: 'schema-1' as SpecId,
    lifecycle: SpecLifecycle.Draft,
    version: '1.0.0',
    name: 'Test Schema',
    fields: [
      { name: 'user_id', type: 'string_id' as const, required: true },
      { name: 'age', type: 'integer' as const, required: true, min: 0, max: 150 },
      { name: 'score', type: 'float' as const, required: true, min: 0 },
    ],
    identifierFieldName: 'user_id',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

describe('schemaSpecSchema', () => {
  it('should accept a valid schema spec', () => {
    const result = schemaSpecSchema.safeParse(validSchemaSpec());
    expect(result.success).toBe(true);
  });

  it('should reject when no fields are provided', () => {
    const spec = { ...validSchemaSpec(), fields: [] };
    const result = schemaSpecSchema.safeParse(spec);
    expect(result.success).toBe(false);
  });

  it('should reject when required top-level fields are missing', () => {
    const { name, ...rest } = validSchemaSpec();
    const result = schemaSpecSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('should reject when identifierFieldName does not reference an existing field', () => {
    const spec = { ...validSchemaSpec(), identifierFieldName: 'nonexistent' };
    const result = schemaSpecSchema.safeParse(spec);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.message.includes('does not reference'))).toBe(true);
    }
  });

  it('should reject when identifierFieldName references a non-string_id field', () => {
    const spec = { ...validSchemaSpec(), identifierFieldName: 'age' };
    const result = schemaSpecSchema.safeParse(spec);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.message.includes('string_id'))).toBe(true);
    }
  });

  it('should reject duplicate field names', () => {
    const spec = validSchemaSpec();
    spec.fields.push({ name: 'age', type: 'integer', required: false });
    const result = schemaSpecSchema.safeParse(spec);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.message.includes('Duplicate'))).toBe(true);
    }
  });

  it('should reject field names that do not match identifier pattern', () => {
    const result = schemaFieldSchema.safeParse({
      name: '123invalid',
      type: 'integer',
      required: true,
    });
    expect(result.success).toBe(false);
  });

  it('should reject enum type without enumValues', () => {
    const result = schemaFieldSchema.safeParse({
      name: 'category',
      type: 'enum',
      required: true,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.message.includes('enumValues'))).toBe(true);
    }
  });

  it('should reject enum type with empty enumValues', () => {
    const result = schemaFieldSchema.safeParse({
      name: 'category',
      type: 'enum',
      required: true,
      enumValues: [],
    });
    expect(result.success).toBe(false);
  });

  it('should accept enum type with valid enumValues', () => {
    const result = schemaFieldSchema.safeParse({
      name: 'category',
      type: 'enum',
      required: true,
      enumValues: ['a', 'b', 'c'],
    });
    expect(result.success).toBe(true);
  });

  it('should reject when min > max', () => {
    const result = schemaFieldSchema.safeParse({
      name: 'value',
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

  it('should accept when min equals max', () => {
    const result = schemaFieldSchema.safeParse({
      name: 'value',
      type: 'integer',
      required: true,
      min: 5,
      max: 5,
    });
    expect(result.success).toBe(true);
  });
});
