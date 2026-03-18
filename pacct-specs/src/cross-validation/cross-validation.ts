import type { SchemaSpec } from '../schema/types';
import type { ComputationSpec } from '../computation/types';
import type { GovernanceSpec } from '../governance/types';
import type { EconomicSpec } from '../economic/types';
import type { ValidationResult, ValidationError, ValidationWarning } from './types';

export function validateSpecCompatibility(
  schema: SchemaSpec,
  computation: ComputationSpec,
  governance: GovernanceSpec,
  economic: EconomicSpec,
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Schema <-> Computation checks
  const fieldNames = new Set(schema.fields.map(f => f.name));
  const fieldMap = new Map(schema.fields.map(f => [f.name, f]));
  const numericTypes = new Set(['integer', 'float', 'boolean']);
  const targetNumericTypes = new Set(['integer', 'float']);

  // Check featureFields exist in schema
  for (const featureField of computation.featureFields) {
    if (!fieldNames.has(featureField)) {
      errors.push({
        code: 'FEATURE_FIELD_NOT_FOUND',
        message: `Feature field "${featureField}" does not exist in schema spec`,
        path: 'computation.featureFields',
      });
    } else {
      const field = fieldMap.get(featureField)!;
      if (!numericTypes.has(field.type)) {
        errors.push({
          code: 'FEATURE_FIELD_NOT_NUMERIC',
          message: `Feature field "${featureField}" must be a numeric type (integer, float, boolean), but is "${field.type}"`,
          path: 'computation.featureFields',
        });
      }
    }
  }

  // Check targetField exists in schema
  if (!fieldNames.has(computation.targetField)) {
    errors.push({
      code: 'TARGET_FIELD_NOT_FOUND',
      message: `Target field "${computation.targetField}" does not exist in schema spec`,
      path: 'computation.targetField',
    });
  } else {
    const targetField = fieldMap.get(computation.targetField)!;
    if (!targetNumericTypes.has(targetField.type)) {
      errors.push({
        code: 'TARGET_FIELD_NOT_NUMERIC',
        message: `Target field "${computation.targetField}" must be numeric (integer or float), but is "${targetField.type}"`,
        path: 'computation.targetField',
      });
    }
  }

  // Target field should not be a feature field
  if (computation.featureFields.includes(computation.targetField)) {
    warnings.push({
      code: 'TARGET_IS_FEATURE',
      message: `Target field "${computation.targetField}" is also listed as a feature field`,
      path: 'computation.targetField',
    });
  }

  // Governance <-> Computation checks
  if (governance.membershipPolicy.minActiveMembers < 3) {
    errors.push({
      code: 'MIN_MEMBERS_TOO_LOW',
      message: 'minActiveMembers must be >= 3 for multi-party computation',
      path: 'governance.membershipPolicy.minActiveMembers',
    });
  }

  // Economic <-> Governance run policy checks
  if (
    economic.budgetCap?.periodLengthDays !== undefined &&
    governance.runPolicy.periodLengthDays > 0
  ) {
    const econPeriod = economic.budgetCap.periodLengthDays;
    const govPeriod = governance.runPolicy.periodLengthDays;
    if (econPeriod % govPeriod !== 0 && govPeriod % econPeriod !== 0) {
      warnings.push({
        code: 'PERIOD_LENGTH_MISMATCH',
        message: `Economic budget period (${econPeriod} days) and governance run period (${govPeriod} days) are not multiples of each other`,
        path: 'economic.budgetCap.periodLengthDays',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
