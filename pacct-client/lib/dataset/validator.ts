import type { SchemaSpec } from '@pacct/specs';
import type { DatasetRow } from './types';

export interface DatasetValidationResult {
  valid: boolean;
  errors: DatasetValidationError[];
  warnings: DatasetValidationWarning[];
  stats: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
  };
}

export interface DatasetValidationError {
  row?: number;
  column: string;
  code: string;
  message: string;
}

export interface DatasetValidationWarning {
  column: string;
  code: string;
  message: string;
}

/**
 * Validate dataset against a schema spec.
 */
export function validateDataset(
  headers: string[],
  rows: DatasetRow[],
  schemaSpec: SchemaSpec
): DatasetValidationResult {
  const errors: DatasetValidationError[] = [];
  const warnings: DatasetValidationWarning[] = [];
  const invalidRowSet = new Set<number>();

  const headerSet = new Set(headers);

  // Check all required schema fields are present
  for (const field of schemaSpec.fields) {
    if (field.required && !headerSet.has(field.name)) {
      errors.push({
        column: field.name,
        code: 'MISSING_REQUIRED_COLUMN',
        message: `Required column "${field.name}" is missing from the dataset`,
      });
    }
  }

  // Check for unknown columns (warning)
  const schemaFieldNames = new Set(schemaSpec.fields.map((f) => f.name));
  for (const header of headers) {
    if (!schemaFieldNames.has(header)) {
      warnings.push({
        column: header,
        code: 'UNKNOWN_COLUMN',
        message: `Column "${header}" is not defined in the schema`,
      });
    }
  }

  // Check identifier field is present
  if (!headerSet.has(schemaSpec.identifierFieldName)) {
    errors.push({
      column: schemaSpec.identifierFieldName,
      code: 'MISSING_IDENTIFIER',
      message: `Identifier field "${schemaSpec.identifierFieldName}" is missing`,
    });
  } else {
    // Check identifier uniqueness
    const identifierValues = new Set<string | number | boolean>();
    for (let i = 0; i < rows.length; i++) {
      const val = rows[i][schemaSpec.identifierFieldName];
      if (val === null || val === undefined) {
        errors.push({
          row: i,
          column: schemaSpec.identifierFieldName,
          code: 'NULL_IDENTIFIER',
          message: `Identifier field "${schemaSpec.identifierFieldName}" is null at row ${i}`,
        });
        invalidRowSet.add(i);
      } else {
        const key = String(val);
        if (identifierValues.has(key as never)) {
          errors.push({
            row: i,
            column: schemaSpec.identifierFieldName,
            code: 'DUPLICATE_IDENTIFIER',
            message: `Duplicate identifier value "${val}" at row ${i}`,
          });
          invalidRowSet.add(i);
        }
        identifierValues.add(key as never);
      }
    }
  }

  // Per-field per-row validation
  for (const field of schemaSpec.fields) {
    if (!headerSet.has(field.name)) continue;

    for (let i = 0; i < rows.length; i++) {
      const val = rows[i][field.name];

      // Null/empty handling
      if (val === null || val === undefined) {
        if (field.required) {
          errors.push({
            row: i,
            column: field.name,
            code: 'REQUIRED_FIELD_NULL',
            message: `Required field "${field.name}" is null at row ${i}`,
          });
          invalidRowSet.add(i);
        }
        continue;
      }

      // Type checks
      switch (field.type) {
        case 'integer': {
          if (typeof val !== 'number' || !Number.isInteger(val)) {
            errors.push({
              row: i,
              column: field.name,
              code: 'TYPE_MISMATCH',
              message: `Expected integer for "${field.name}" at row ${i}, got ${typeof val}: ${val}`,
            });
            invalidRowSet.add(i);
            continue;
          }
          // Range check
          if (field.min !== undefined && val < field.min) {
            errors.push({
              row: i,
              column: field.name,
              code: 'OUT_OF_RANGE',
              message: `Value ${val} is below minimum ${field.min} for "${field.name}" at row ${i}`,
            });
            invalidRowSet.add(i);
          }
          if (field.max !== undefined && val > field.max) {
            errors.push({
              row: i,
              column: field.name,
              code: 'OUT_OF_RANGE',
              message: `Value ${val} is above maximum ${field.max} for "${field.name}" at row ${i}`,
            });
            invalidRowSet.add(i);
          }
          break;
        }
        case 'float': {
          if (typeof val !== 'number') {
            errors.push({
              row: i,
              column: field.name,
              code: 'TYPE_MISMATCH',
              message: `Expected number for "${field.name}" at row ${i}, got ${typeof val}: ${val}`,
            });
            invalidRowSet.add(i);
            continue;
          }
          if (field.min !== undefined && val < field.min) {
            errors.push({
              row: i,
              column: field.name,
              code: 'OUT_OF_RANGE',
              message: `Value ${val} is below minimum ${field.min} for "${field.name}" at row ${i}`,
            });
            invalidRowSet.add(i);
          }
          if (field.max !== undefined && val > field.max) {
            errors.push({
              row: i,
              column: field.name,
              code: 'OUT_OF_RANGE',
              message: `Value ${val} is above maximum ${field.max} for "${field.name}" at row ${i}`,
            });
            invalidRowSet.add(i);
          }
          break;
        }
        case 'boolean': {
          if (typeof val === 'boolean') break;
          if (val === 0 || val === 1) break;
          errors.push({
            row: i,
            column: field.name,
            code: 'TYPE_MISMATCH',
            message: `Expected boolean for "${field.name}" at row ${i}, got ${typeof val}: ${val}`,
          });
          invalidRowSet.add(i);
          break;
        }
        case 'enum': {
          if (field.enumValues && !field.enumValues.includes(String(val))) {
            errors.push({
              row: i,
              column: field.name,
              code: 'INVALID_ENUM',
              message: `Invalid enum value "${val}" for "${field.name}" at row ${i}. Allowed: ${field.enumValues.join(', ')}`,
            });
            invalidRowSet.add(i);
          }
          break;
        }
        case 'string_id': {
          // string_id accepts strings and numbers
          break;
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      totalRows: rows.length,
      validRows: rows.length - invalidRowSet.size,
      invalidRows: invalidRowSet.size,
    },
  };
}
