'use client';

import { useEffect, useState } from 'react';
import { listTemplates, getTemplate } from '@pacct/specs';
import type { BasicsData, SchemaData, ComputationData, GovernanceData, EconomicData } from '../wizard-state';

interface StepBasicsProps {
  data: BasicsData;
  onChange: (data: Partial<BasicsData>) => void;
  onLoadTemplate: (partial: {
    schema?: Partial<SchemaData>;
    computation?: Partial<ComputationData>;
    governance?: Partial<GovernanceData>;
    economic?: Partial<EconomicData>;
  }) => void;
  errors: string[];
}

const CATEGORIES = [
  { value: '', label: 'None' },
  { value: 'generic', label: 'Generic' },
  { value: 'education', label: 'Education' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'finance', label: 'Finance' },
  { value: 'military', label: 'Military' },
];

export default function StepBasics({ data, onChange, onLoadTemplate, errors }: StepBasicsProps) {
  const [templates, setTemplates] = useState<{ category: string; description: string }[]>([]);
  const [templateLoaded, setTemplateLoaded] = useState<string | null>(null);

  useEffect(() => {
    setTemplates(listTemplates());
  }, []);

  const handleApplyTemplate = (category: string) => {
    const template = getTemplate(category);
    if (!template) return;

    onChange({ category });

    // Map template data to wizard state shape
    const schemaData: Partial<SchemaData> = {
      fields: template.schema.fields,
      identifierFieldName: template.schema.identifierFieldName,
    };

    const computationData: Partial<ComputationData> = {
      computationType: template.computation.computationType,
      featureFields: template.computation.featureFields,
      targetField: template.computation.targetField,
      revealMode: template.computation.outputConfig.revealMode,
      clipMin: template.computation.outputConfig.clipMin?.toString() ?? '',
      clipMax: template.computation.outputConfig.clipMax?.toString() ?? '',
      normalize: template.computation.outputConfig.normalize,
    };

    const govTemplate = template.governance;
    const governanceData: Partial<GovernanceData> = {
      minActiveMembers: govTemplate.membershipPolicy.minActiveMembers,
      maxMembers: govTemplate.membershipPolicy.maxMembers?.toString() ?? '',
      visibilityMode: govTemplate.visibilityPolicy.mode,
      sectionVisibility: govTemplate.visibilityPolicy.sectionVisibility
        ? {
            schema: govTemplate.visibilityPolicy.sectionVisibility.schema,
            computation: govTemplate.visibilityPolicy.sectionVisibility.computation,
            governance: govTemplate.visibilityPolicy.sectionVisibility.governance,
            economic: govTemplate.visibilityPolicy.sectionVisibility.economic,
          }
        : { schema: 'full', computation: 'full', governance: 'full', economic: 'full' },
      approvalTimeoutMs: govTemplate.joinPolicy.approvalTimeoutMs,
      acceptanceTimeoutMs: govTemplate.joinPolicy.acceptanceTimeoutMs,
      admissionSchedule: govTemplate.consensusPolicy.admissionSchedule,
      dissolutionThreshold: govTemplate.consensusPolicy.dissolutionThreshold,
      allowedInitiators: govTemplate.runPolicy.allowedInitiators,
      minimumIntervalMs: govTemplate.runPolicy.minimumIntervalMs,
      maxRunsPerPeriod: govTemplate.runPolicy.maxRunsPerPeriod,
      periodLengthDays: govTemplate.runPolicy.periodLengthDays,
      requireCostEstimate: govTemplate.runPolicy.requireCostEstimate,
      allMembersOnlineRequired: govTemplate.runPolicy.allMembersOnlineRequired,
      preActivationTimeoutMs: govTemplate.dissolutionPolicy.preActivationTimeoutMs,
      postActivationInactivityTimeoutMs: govTemplate.dissolutionPolicy.postActivationInactivityTimeoutMs,
      warnBeforeDissolveMs: govTemplate.dissolutionPolicy.warnBeforeDissolveMs?.toString() ?? '',
      expulsionEnabled: govTemplate.expulsionPolicy?.enabled ?? false,
      expulsionRequireReason: govTemplate.expulsionPolicy?.requireReason ?? false,
      expulsionThreshold: govTemplate.consensusPolicy.expulsionThreshold?.toString() ?? '',
    };

    const econTemplate = template.economic;
    const economicData: Partial<EconomicData> = {
      economicMode: econTemplate.economicMode,
      fixedCostPerRun: econTemplate.costAllocation.fixedCostPerRun ?? 0,
      variableCostEnabled: econTemplate.costAllocation.variableCostEnabled,
      variableCostDescription: econTemplate.costAllocation.variableCostDescription ?? '',
      maxTotalBudget: econTemplate.budgetCap?.maxTotalBudget?.toString() ?? '',
      maxBudgetPerPeriod: econTemplate.budgetCap?.maxBudgetPerPeriod?.toString() ?? '',
      budgetPeriodLengthDays: econTemplate.budgetCap?.periodLengthDays?.toString() ?? '',
      summary: econTemplate.summary,
    };

    onLoadTemplate({
      schema: schemaData,
      computation: computationData,
      governance: governanceData,
      economic: economicData,
    });
    setTemplateLoaded(category);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Network Basics</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Network Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="My Analytics Network"
          maxLength={100}
        />
        <p className="text-xs text-gray-500 mt-1">{data.name.length}/100 characters (min 3)</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows={3}
          placeholder="Describe the purpose of this network..."
          maxLength={500}
        />
        <p className="text-xs text-gray-500 mt-1">{data.description.length}/500 characters</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
        <select
          value={data.category}
          onChange={(e) => onChange({ category: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Templates */}
      {templates.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Start from Template</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {templates.map((t) => (
              <button
                key={t.category}
                type="button"
                onClick={() => handleApplyTemplate(t.category)}
                className={`text-left p-3 border rounded-lg hover:bg-blue-50 transition-colors ${
                  templateLoaded === t.category ? 'border-blue-500 bg-blue-50' : ''
                }`}
              >
                <div className="font-medium capitalize">{t.category}</div>
                <div className="text-sm text-gray-600">{t.description}</div>
              </button>
            ))}
          </div>
          {templateLoaded && (
            <p className="text-sm text-green-600 mt-2">
              Template &quot;{templateLoaded}&quot; loaded. All steps pre-filled.
            </p>
          )}
        </div>
      )}

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
