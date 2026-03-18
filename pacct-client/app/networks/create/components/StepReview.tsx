'use client';

import { useState, useEffect } from 'react';
import { validateSpecCompatibility } from '@pacct/specs';
import type { ValidationResult } from '@pacct/specs';
import type { WizardState } from '../wizard-state';
import {
  buildSchemaSpec,
  buildComputationSpec,
  buildGovernanceSpec,
  buildEconomicSpec,
} from '../wizard-state';
import {
  renderSchemaSpecSummary,
  renderComputationSpecSummary,
  renderGovernanceSpecSummary,
  renderEconomicSpecSummary,
} from '@/lib/utils/spec-display';

interface StepReviewProps {
  state: WizardState;
  acknowledged: boolean;
  onSetAcknowledged: (value: boolean) => void;
}

export default function StepReview({ state, acknowledged, onSetAcknowledged }: StepReviewProps) {
  const [showRawJson, setShowRawJson] = useState(false);
  const [crossValidation, setCrossValidation] = useState<ValidationResult | null>(null);

  const schemaSpec = buildSchemaSpec(state);
  const computationSpec = buildComputationSpec(state);
  const governanceSpec = buildGovernanceSpec(state);
  const economicSpec = buildEconomicSpec(state);

  useEffect(() => {
    const result = validateSpecCompatibility(schemaSpec, computationSpec, governanceSpec, economicSpec);
    setCrossValidation(result);
  // Run once on mount — specs are derived from state which is stable for this render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const sections = [
    { title: 'Schema', summary: renderSchemaSpecSummary(schemaSpec), raw: schemaSpec },
    { title: 'Computation', summary: renderComputationSpecSummary(computationSpec), raw: computationSpec },
    { title: 'Governance', summary: renderGovernanceSpecSummary(governanceSpec), raw: governanceSpec },
    { title: 'Economics', summary: renderEconomicSpecSummary(economicSpec), raw: economicSpec },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Review &amp; Create</h2>
        <button
          type="button"
          onClick={() => setShowRawJson(!showRawJson)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {showRawJson ? 'Show Summary' : 'Show Raw JSON'}
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm font-medium text-blue-800">Network: {state.basics.name}</p>
        {state.basics.description && (
          <p className="text-sm text-blue-700">{state.basics.description}</p>
        )}
        {state.basics.category && (
          <p className="text-xs text-blue-600 mt-1">Category: {state.basics.category}</p>
        )}
      </div>

      {/* Spec sections */}
      {sections.map((section) => (
        <div key={section.title} className="border rounded-lg p-4">
          <h3 className="text-lg font-medium mb-2">{section.title}</h3>
          {showRawJson ? (
            <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto max-h-64">
              {JSON.stringify(section.raw, null, 2)}
            </pre>
          ) : (
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
              {section.summary}
            </pre>
          )}
        </div>
      ))}

      {/* Cross-spec validation */}
      {crossValidation && (
        <div
          className={`border rounded-lg p-4 ${
            crossValidation.valid
              ? 'border-green-200 bg-green-50'
              : 'border-red-200 bg-red-50'
          }`}
        >
          <h3 className="text-sm font-semibold mb-2">
            Cross-Spec Validation:{' '}
            {crossValidation.valid ? (
              <span className="text-green-700">Passed</span>
            ) : (
              <span className="text-red-700">Failed</span>
            )}
          </h3>

          {crossValidation.errors.length > 0 && (
            <div className="mb-2">
              <p className="text-xs font-medium text-red-800 mb-1">Errors:</p>
              <ul className="list-disc list-inside text-sm text-red-700">
                {crossValidation.errors.map((e, i) => (
                  <li key={i}>
                    [{e.code}] {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {crossValidation.warnings.length > 0 && (
            <div>
              <p className="text-xs font-medium text-orange-800 mb-1">Warnings:</p>
              <ul className="list-disc list-inside text-sm text-orange-700">
                {crossValidation.warnings.map((w, i) => (
                  <li key={i}>
                    [{w.code}] {w.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {crossValidation.valid && crossValidation.warnings.length === 0 && (
            <p className="text-sm text-green-700">All specs are compatible. Ready to create.</p>
          )}
        </div>
      )}

      {/* Acknowledgement */}
      <div className="border rounded-lg p-4 bg-yellow-50 border-yellow-200">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => onSetAcknowledged(e.target.checked)}
            className="rounded border-gray-300 mt-0.5"
          />
          <span className="text-sm text-gray-800">
            I understand that these terms are immutable once the network is created. All
            specifications (schema, computation, governance, and economics) will be permanently
            locked.
          </span>
        </label>
      </div>
    </div>
  );
}
