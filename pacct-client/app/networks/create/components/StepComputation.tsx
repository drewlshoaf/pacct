'use client';

import type { SchemaField } from '@pacct/specs';
import type { ComputationData } from '../wizard-state';

interface StepComputationProps {
  data: ComputationData;
  schemaFields: SchemaField[];
  onChange: (data: Partial<ComputationData>) => void;
  errors: string[];
}

export default function StepComputation({ data, schemaFields, onChange, errors }: StepComputationProps) {
  // Numeric fields for features (integer, float, boolean)
  const numericFields = schemaFields.filter(
    (f) => f.type === 'integer' || f.type === 'float' || f.type === 'boolean',
  );
  // Target fields (integer, float only)
  const targetEligibleFields = schemaFields.filter(
    (f) => f.type === 'integer' || f.type === 'float',
  );

  const toggleFeatureField = (fieldName: string) => {
    const current = data.featureFields;
    if (current.includes(fieldName)) {
      onChange({ featureFields: current.filter((f) => f !== fieldName) });
    } else {
      onChange({ featureFields: [...current, fieldName] });
    }
  };

  const targetIsFeature = data.targetField && data.featureFields.includes(data.targetField);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Computation Configuration</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Computation Type</label>
        <select
          value={data.computationType}
          onChange={(e) => onChange({ computationType: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="regression">Regression</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">Only regression is available in v1.</p>
      </div>

      {/* Feature fields multi-select */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Feature Fields <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Select fields to use as independent variables (features). Only numeric and boolean types
          are eligible.
        </p>
        {numericFields.length === 0 ? (
          <p className="text-sm text-orange-600">
            No numeric fields in schema. Go back and add integer, float, or boolean fields.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {numericFields.map((field) => {
              const isSelected = data.featureFields.includes(field.name);
              const isTarget = data.targetField === field.name;
              return (
                <label
                  key={field.name}
                  className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer text-sm ${
                    isSelected ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
                  } ${isTarget ? 'opacity-50' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleFeatureField(field.name)}
                    className="rounded border-gray-300"
                  />
                  <span>
                    {field.name}{' '}
                    <span className="text-gray-400">({field.type})</span>
                  </span>
                </label>
              );
            })}
          </div>
        )}
        {data.featureFields.length > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            Selected: {data.featureFields.join(', ')}
          </p>
        )}
      </div>

      {/* Target field */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Target Field <span className="text-red-500">*</span>
        </label>
        <select
          value={data.targetField}
          onChange={(e) => onChange({ targetField: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select target field...</option>
          {targetEligibleFields.map((f) => (
            <option key={f.name} value={f.name}>
              {f.name} ({f.type})
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          The dependent variable (what the model predicts). Must be integer or float.
        </p>
        {targetIsFeature && (
          <p className="text-sm text-orange-600 mt-1">
            Warning: Target field is also selected as a feature field. This is typically not
            desirable.
          </p>
        )}
      </div>

      {/* Reveal mode */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Reveal Mode</label>
        <select
          value={data.revealMode}
          onChange={(e) => onChange({ revealMode: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="coefficients">Coefficients Only</option>
          <option value="scores">Scores Only</option>
          <option value="both">Both (Coefficients + Scores)</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          What computation results will be shared with members.
        </p>
      </div>

      {/* Clip min/max */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Clip Min</label>
          <input
            type="number"
            value={data.clipMin}
            onChange={(e) => onChange({ clipMin: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="No clip"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Clip Max</label>
          <input
            type="number"
            value={data.clipMax}
            onChange={(e) => onChange({ clipMax: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="No clip"
          />
        </div>
      </div>

      {/* Normalize */}
      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={data.normalize}
            onChange={(e) => onChange({ normalize: e.target.checked })}
            className="rounded border-gray-300"
          />
          <span className="text-sm font-medium text-gray-700">Normalize output</span>
        </label>
        <p className="text-xs text-gray-500 mt-1 ml-6">
          Apply normalization to computation results.
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
