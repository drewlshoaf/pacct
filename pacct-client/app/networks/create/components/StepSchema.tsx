'use client';

import { useCallback } from 'react';
import type { SchemaField, SchemaFieldType } from '@pacct/specs';
import type { SchemaData } from '../wizard-state';
import { getFieldTypeLabel } from '@/lib/utils/spec-display';

interface StepSchemaProps {
  data: SchemaData;
  onChange: (data: Partial<SchemaData>) => void;
  errors: string[];
}

const FIELD_TYPES: SchemaFieldType[] = ['integer', 'float', 'boolean', 'enum', 'string_id'];

export default function StepSchema({ data, onChange, errors }: StepSchemaProps) {
  const updateField = useCallback(
    (index: number, updates: Partial<SchemaField>) => {
      const newFields = data.fields.map((f, i) => (i === index ? { ...f, ...updates } : f));
      onChange({ fields: newFields });
    },
    [data.fields, onChange],
  );

  const addField = useCallback(() => {
    const newField: SchemaField = {
      name: '',
      type: 'float',
      required: false,
      description: '',
    };
    onChange({ fields: [...data.fields, newField] });
  }, [data.fields, onChange]);

  const removeField = useCallback(
    (index: number) => {
      const newFields = data.fields.filter((_, i) => i !== index);
      onChange({ fields: newFields });
    },
    [data.fields, onChange],
  );

  const moveField = useCallback(
    (index: number, direction: -1 | 1) => {
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= data.fields.length) return;
      const newFields = [...data.fields];
      const tmp = newFields[index];
      newFields[index] = newFields[newIndex];
      newFields[newIndex] = tmp;
      onChange({ fields: newFields });
    },
    [data.fields, onChange],
  );

  const stringIdFields = data.fields.filter((f) => f.type === 'string_id');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Data Schema</h2>
        <button
          type="button"
          onClick={addField}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          + Add Field
        </button>
      </div>

      <p className="text-sm text-gray-600">
        Define the data fields that each member will contribute. At least one field of type
        &quot;String Identifier&quot; is required for the record identifier.
      </p>

      {/* Field list */}
      <div className="space-y-4">
        {data.fields.map((field, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-3 bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Field {index + 1}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveField(index, -1)}
                  disabled={index === 0}
                  className="px-2 py-1 text-xs border rounded hover:bg-white disabled:opacity-30"
                  title="Move up"
                >
                  Up
                </button>
                <button
                  type="button"
                  onClick={() => moveField(index, 1)}
                  disabled={index === data.fields.length - 1}
                  className="px-2 py-1 text-xs border rounded hover:bg-white disabled:opacity-30"
                  title="Move down"
                >
                  Down
                </button>
                <button
                  type="button"
                  onClick={() => removeField(index)}
                  className="px-2 py-1 text-xs border rounded text-red-600 hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Field Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={field.name}
                  onChange={(e) => updateField(index, { name: e.target.value })}
                  className="w-full px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="field_name"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={field.type}
                  onChange={(e) => {
                    const newType = e.target.value as SchemaFieldType;
                    const updates: Partial<SchemaField> = { type: newType };
                    // Clear type-specific fields
                    if (newType !== 'enum') updates.enumValues = undefined;
                    if (newType !== 'integer' && newType !== 'float') {
                      updates.min = undefined;
                      updates.max = undefined;
                    }
                    updateField(index, updates);
                  }}
                  className="w-full px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {getFieldTypeLabel(t)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <input
                  type="text"
                  value={field.description ?? ''}
                  onChange={(e) => updateField(index, { description: e.target.value })}
                  className="w-full px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional description"
                />
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => updateField(index, { required: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  Required
                </label>
              </div>
            </div>

            {/* Conditional: min/max for numeric */}
            {(field.type === 'integer' || field.type === 'float') && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Min</label>
                  <input
                    type="number"
                    value={field.min ?? ''}
                    onChange={(e) =>
                      updateField(index, {
                        min: e.target.value === '' ? undefined : parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="No minimum"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Max</label>
                  <input
                    type="number"
                    value={field.max ?? ''}
                    onChange={(e) =>
                      updateField(index, {
                        max: e.target.value === '' ? undefined : parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="No maximum"
                  />
                </div>
              </div>
            )}

            {/* Conditional: enumValues for enum */}
            {field.type === 'enum' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Enum Values <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={(field.enumValues ?? []).join(', ')}
                  onChange={(e) =>
                    updateField(index, {
                      enumValues: e.target.value
                        .split(',')
                        .map((v) => v.trim())
                        .filter(Boolean),
                    })
                  }
                  className="w-full px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="value1, value2, value3"
                />
                <p className="text-xs text-gray-500 mt-1">Comma-separated list of values</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {data.fields.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-8">
          No fields defined. Click &quot;+ Add Field&quot; to add your first field.
        </p>
      )}

      {/* Identifier field selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Identifier Field <span className="text-red-500">*</span>
        </label>
        <select
          value={data.identifierFieldName}
          onChange={(e) => onChange({ identifierFieldName: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select identifier field...</option>
          {stringIdFields.map((f) => (
            <option key={f.name} value={f.name}>
              {f.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Must be a field of type &quot;String Identifier&quot;.{' '}
          {stringIdFields.length === 0 && (
            <span className="text-orange-600">Add a string_id field first.</span>
          )}
        </p>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm font-medium text-red-800 mb-1">Validation Errors:</p>
          <ul className="list-disc list-inside text-sm text-red-700">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
