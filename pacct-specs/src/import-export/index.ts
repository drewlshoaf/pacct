import { z } from 'zod';
import YAML from 'yaml';
import { schemaSpecSchema } from '../schema/schema';
import { computationSpecSchema } from '../computation/computation';
import { governanceSpecSchema } from '../governance/governance';
import { economicSpecSchema } from '../economic/economic';
import type { ValidationResult, ValidationError } from '../cross-validation/types';

type SpecType = 'schema' | 'computation' | 'governance' | 'economic';

const schemaMap: Record<SpecType, z.ZodTypeAny> = {
  schema: schemaSpecSchema,
  computation: computationSpecSchema,
  governance: governanceSpecSchema,
  economic: economicSpecSchema,
};

export interface ImportResult extends ValidationResult {
  spec?: unknown;
}

export function exportSpecToJson(spec: unknown): string {
  return JSON.stringify(spec, null, 2);
}

export function exportSpecToYaml(spec: unknown): string {
  return YAML.stringify(spec);
}

export function importSpecFromJson(json: string, specType: SpecType): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    return {
      valid: false,
      errors: [{
        code: 'INVALID_JSON',
        message: `Failed to parse JSON: ${(e as Error).message}`,
      }],
      warnings: [],
    };
  }

  return validateParsed(parsed, specType);
}

export function importSpecFromYaml(yamlStr: string, specType: SpecType): ImportResult {
  let parsed: unknown;
  try {
    parsed = YAML.parse(yamlStr);
  } catch (e) {
    return {
      valid: false,
      errors: [{
        code: 'INVALID_YAML',
        message: `Failed to parse YAML: ${(e as Error).message}`,
      }],
      warnings: [],
    };
  }

  return validateParsed(parsed, specType);
}

function validateParsed(parsed: unknown, specType: SpecType): ImportResult {
  const zodSchema = schemaMap[specType];
  const result = zodSchema.safeParse(parsed);

  if (result.success) {
    return {
      valid: true,
      errors: [],
      warnings: [],
      spec: result.data,
    };
  }

  const errors: ValidationError[] = result.error.issues.map(issue => ({
    code: 'VALIDATION_ERROR',
    message: issue.message,
    path: issue.path.join('.'),
  }));

  return {
    valid: false,
    errors,
    warnings: [],
  };
}
