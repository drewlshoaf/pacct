'use client';

import { EconomicMode } from '@pacct/protocol-ts';
import type { EconomicData } from '../wizard-state';
import { getEconomicModeLabel } from '@/lib/utils/spec-display';

interface StepEconomicsProps {
  data: EconomicData;
  onChange: (data: Partial<EconomicData>) => void;
  errors: string[];
}

const ECONOMIC_MODES = [
  { value: EconomicMode.Capitalist, description: 'Market-based pricing. Costs allocated based on usage and contribution.' },
  { value: EconomicMode.Progressive, description: 'Scaled pricing based on participant capacity. Larger participants pay proportionally more.' },
  { value: EconomicMode.SocialistHybrid, description: 'Equal cost sharing among all members regardless of size.' },
];

function generateAutoSummary(data: EconomicData): string {
  const mode = getEconomicModeLabel(data.economicMode);
  const parts: string[] = [`${mode} cost allocation.`];

  if (data.fixedCostPerRun > 0) {
    parts.push(`Fixed cost of ${data.fixedCostPerRun} per run.`);
  }
  if (data.variableCostEnabled) {
    parts.push('Variable costs enabled.');
  }
  if (data.maxTotalBudget) {
    parts.push(`Max total budget: ${data.maxTotalBudget}.`);
  }
  if (data.maxBudgetPerPeriod && data.budgetPeriodLengthDays) {
    parts.push(`Max ${data.maxBudgetPerPeriod} per ${data.budgetPeriodLengthDays}-day period.`);
  }

  return parts.join(' ');
}

export default function StepEconomics({ data, onChange, errors }: StepEconomicsProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Economics</h2>

      {/* Economic Mode */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Economic Mode</label>
        <div className="space-y-2">
          {ECONOMIC_MODES.map((mode) => (
            <label
              key={mode.value}
              className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer ${
                data.economicMode === mode.value ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="economicMode"
                value={mode.value}
                checked={data.economicMode === mode.value}
                onChange={(e) => onChange({ economicMode: e.target.value })}
                className="mt-0.5"
              />
              <div>
                <div className="text-sm font-medium">{getEconomicModeLabel(mode.value)}</div>
                <div className="text-xs text-gray-500">{mode.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Cost Allocation */}
      <fieldset className="border rounded-lg p-4 space-y-4">
        <legend className="text-sm font-semibold px-2 text-gray-700">Cost Allocation</legend>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fixed Cost Per Run
          </label>
          <input
            type="number"
            value={data.fixedCostPerRun}
            onChange={(e) => onChange({ fixedCostPerRun: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            min={0}
            step={0.01}
          />
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={data.variableCostEnabled}
            onChange={(e) => onChange({ variableCostEnabled: e.target.checked })}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">Enable variable costs</span>
        </label>

        {data.variableCostEnabled && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Variable Cost Description
            </label>
            <textarea
              value={data.variableCostDescription}
              onChange={(e) => onChange({ variableCostDescription: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Describe how variable costs are calculated..."
            />
          </div>
        )}
      </fieldset>

      {/* Budget Cap */}
      <fieldset className="border rounded-lg p-4 space-y-4">
        <legend className="text-sm font-semibold px-2 text-gray-700">Budget Cap (Optional)</legend>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Total Budget</label>
          <input
            type="number"
            value={data.maxTotalBudget}
            onChange={(e) => onChange({ maxTotalBudget: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="No limit"
            min={0}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Budget Per Period
            </label>
            <input
              type="number"
              value={data.maxBudgetPerPeriod}
              onChange={(e) => onChange({ maxBudgetPerPeriod: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="No limit"
              min={0}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Period Length (days)
            </label>
            <input
              type="number"
              value={data.budgetPeriodLengthDays}
              onChange={(e) => onChange({ budgetPeriodLengthDays: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="N/A"
              min={1}
            />
          </div>
        </div>
      </fieldset>

      {/* Summary */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">
            Summary <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={() => onChange({ summary: generateAutoSummary(data) })}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Auto-generate
          </button>
        </div>
        <textarea
          value={data.summary}
          onChange={(e) => onChange({ summary: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          rows={3}
          placeholder="Describe the economic arrangement..."
        />
        <p className="text-xs text-gray-500 mt-1">
          Human-readable explanation of the cost-sharing model.
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
