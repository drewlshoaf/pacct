'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
  schemaSpecSchema,
  computationSpecSchema,
  governanceSpecSchema,
  economicSpecSchema,
  exportSpecToJson,
  exportSpecToYaml,
} from '@pacct/specs';
import type { SchemaSpec, ComputationSpec, GovernanceSpec, EconomicSpec } from '@pacct/specs';
import {
  SpecLifecycle,
  ComputationType,
  EconomicMode,
  VisibilityMode,
  SectionVisibility,
  RunInitiationMode,
  DisconnectBehavior,
} from '@pacct/protocol-ts';
import type { SpecId } from '@pacct/protocol-ts';
import { getFieldTypeLabel, getEconomicModeLabel } from '@/lib/utils/spec-display';

type SpecType = 'schema' | 'computation' | 'governance' | 'economic';

function inferSpecType(specId: string): SpecType {
  if (specId.includes('schema')) return 'schema';
  if (specId.includes('comp')) return 'computation';
  if (specId.includes('gov')) return 'governance';
  if (specId.includes('econ')) return 'economic';
  return 'schema';
}

function createDefaultSpec(specType: SpecType, specId: string): unknown {
  const now = Date.now();
  const base = {
    specId: specId as SpecId,
    lifecycle: SpecLifecycle.Draft,
    version: '1.0.0',
    createdAt: now,
    updatedAt: now,
  };

  switch (specType) {
    case 'schema':
      return {
        ...base,
        name: 'New Schema',
        fields: [
          { name: 'record_id', type: 'string_id', required: true, description: 'Unique identifier' },
        ],
        identifierFieldName: 'record_id',
      } satisfies SchemaSpec;
    case 'computation':
      return {
        ...base,
        name: 'New Computation',
        computationType: ComputationType.Regression,
        featureFields: [],
        targetField: '',
        outputConfig: { revealMode: 'coefficients' as const, normalize: true },
      } satisfies ComputationSpec;
    case 'governance':
      return {
        ...base,
        name: 'New Governance',
        membershipPolicy: { minActiveMembers: 3 },
        visibilityPolicy: { mode: VisibilityMode.Full },
        joinPolicy: { approvalTimeoutMs: 86400000, acceptanceTimeoutMs: 86400000 },
        consensusPolicy: {
          admissionSchedule: [{ memberCountMin: 1, memberCountMax: 5, threshold: 1.0 }],
          dissolutionThreshold: 0.75,
        },
        runPolicy: {
          initiationMode: RunInitiationMode.RestrictedManual,
          allowedInitiators: 'any_member' as const,
          minimumIntervalMs: 3600000,
          maxRunsPerPeriod: 10,
          periodLengthDays: 30,
          requireCostEstimate: false,
          allMembersOnlineRequired: true,
          midRunDisconnectBehavior: DisconnectBehavior.Abort,
        },
        dissolutionPolicy: {
          preActivationTimeoutMs: 604800000,
          postActivationInactivityTimeoutMs: 2592000000,
        },
      } satisfies GovernanceSpec;
    case 'economic':
      return {
        ...base,
        name: 'New Economic',
        economicMode: EconomicMode.Progressive,
        costAllocation: { fixedCostPerRun: 0, variableCostEnabled: false },
        summary: 'Default cost-sharing arrangement',
      } satisfies EconomicSpec;
  }
}

export default function SpecEditorPage() {
  const params = useParams();
  const specId = params.specId as string;
  const specType = inferSpecType(specId);

  const [specJson, setSpecJson] = useState('');
  const [exportFormat, setExportFormat] = useState<'json' | 'yaml'>('json');

  useEffect(() => {
    const defaultSpec = createDefaultSpec(specType, specId);
    setSpecJson(JSON.stringify(defaultSpec, null, 2));
  }, [specId, specType]);

  const validationErrors = useMemo(() => {
    try {
      const parsed = JSON.parse(specJson);
      const zodSchemas = {
        schema: schemaSpecSchema,
        computation: computationSpecSchema,
        governance: governanceSpecSchema,
        economic: economicSpecSchema,
      } as const;
      const result = zodSchemas[specType].safeParse(parsed);
      if (result.success) return [];
      return result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    } catch (e) {
      return [`Invalid JSON: ${(e as Error).message}`];
    }
  }, [specJson, specType]);

  const handleExport = () => {
    try {
      const parsed = JSON.parse(specJson);
      const output = exportFormat === 'yaml' ? exportSpecToYaml(parsed) : exportSpecToJson(parsed);
      const blob = new Blob([output], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${specId}.${exportFormat === 'yaml' ? 'yaml' : 'json'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(`Export failed: ${(e as Error).message}`);
    }
  };

  const handleSave = () => {
    try {
      const parsed = JSON.parse(specJson);
      // Placeholder — will use persistence adapter later
      console.log('Saving spec draft:', { specId, specType, spec: parsed });
      alert('Draft saved (logged to console). Persistence adapter will be wired in later.');
    } catch (e) {
      alert(`Save failed: ${(e as Error).message}`);
    }
  };

  const SPEC_TYPE_LABELS: Record<SpecType, string> = {
    schema: 'Schema',
    computation: 'Computation',
    governance: 'Governance',
    economic: 'Economic',
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Spec Editor</h1>
          <p className="text-sm text-gray-500">
            {SPEC_TYPE_LABELS[specType]} Spec &mdash; {specId}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as 'json' | 'yaml')}
            className="px-2 py-1.5 border rounded text-sm"
          >
            <option value="json">JSON</option>
            <option value="yaml">YAML</option>
          </select>
          <button
            type="button"
            onClick={handleExport}
            className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50"
          >
            Export
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            Save Draft
          </button>
        </div>
      </div>

      {/* Validation status */}
      {validationErrors.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-green-700">Spec is valid.</p>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-sm font-medium text-red-800 mb-1">
            Validation Errors ({validationErrors.length}):
          </p>
          <ul className="list-disc list-inside text-sm text-red-700 max-h-40 overflow-y-auto">
            {validationErrors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* JSON editor */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Spec JSON</label>
        <textarea
          value={specJson}
          onChange={(e) => setSpecJson(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500"
          rows={30}
          spellCheck={false}
        />
      </div>
    </div>
  );
}
