'use client';

import { useState } from 'react';
import { importSpecFromJson, importSpecFromYaml } from '@pacct/specs';
import type { ValidationResult } from '@pacct/specs';

type SpecType = 'schema' | 'computation' | 'governance' | 'economic';

const SPEC_TYPE_LABELS: Record<SpecType, string> = {
  schema: 'Schema',
  computation: 'Computation',
  governance: 'Governance',
  economic: 'Economic',
};

export default function ImportSpecPage() {
  const [specType, setSpecType] = useState<SpecType>('schema');
  const [inputText, setInputText] = useState('');
  const [inputFormat, setInputFormat] = useState<'json' | 'yaml'>('json');
  const [validationResult, setValidationResult] = useState<(ValidationResult & { spec?: unknown }) | null>(null);
  const [saved, setSaved] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setInputText(content);

      // Auto-detect format
      if (file.name.endsWith('.yaml') || file.name.endsWith('.yml')) {
        setInputFormat('yaml');
      } else {
        setInputFormat('json');
      }
    };
    reader.readAsText(file);
  };

  const handleValidate = () => {
    setSaved(false);
    let result: ValidationResult & { spec?: unknown };

    if (inputFormat === 'yaml') {
      result = importSpecFromYaml(inputText, specType);
    } else {
      result = importSpecFromJson(inputText, specType);
    }

    setValidationResult(result);
  };

  const handleSaveAsDraft = () => {
    if (!validationResult?.valid || !validationResult.spec) return;

    // Placeholder save — will use persistence adapter
    console.log('Saving imported spec as draft:', {
      specType,
      spec: validationResult.spec,
    });
    setSaved(true);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Import Spec</h1>

      <div className="space-y-6">
        {/* Spec type selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Spec Type</label>
          <select
            value={specType}
            onChange={(e) => {
              setSpecType(e.target.value as SpecType);
              setValidationResult(null);
            }}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {(Object.keys(SPEC_TYPE_LABELS) as SpecType[]).map((type) => (
              <option key={type} value={type}>
                {SPEC_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>

        {/* Format selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="format"
                value="json"
                checked={inputFormat === 'json'}
                onChange={() => setInputFormat('json')}
              />
              <span className="text-sm">JSON</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="format"
                value="yaml"
                checked={inputFormat === 'yaml'}
                onChange={() => setInputFormat('yaml')}
              />
              <span className="text-sm">YAML</span>
            </label>
          </div>
        </div>

        {/* File upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Upload File</label>
          <input
            type="file"
            accept=".json,.yaml,.yml"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {/* Text input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Or Paste {inputFormat.toUpperCase()}
          </label>
          <textarea
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              setValidationResult(null);
            }}
            className="w-full px-3 py-2 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500"
            rows={15}
            placeholder={
              inputFormat === 'json'
                ? '{\n  "specId": "...",\n  ...\n}'
                : 'specId: ...\nname: ...'
            }
            spellCheck={false}
          />
        </div>

        {/* Validate button */}
        <button
          type="button"
          onClick={handleValidate}
          disabled={!inputText.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Validate &amp; Import
        </button>

        {/* Validation results */}
        {validationResult && (
          <div
            className={`border rounded-lg p-4 ${
              validationResult.valid
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <h3 className="text-sm font-semibold mb-2">
              {validationResult.valid ? (
                <span className="text-green-800">Validation Passed</span>
              ) : (
                <span className="text-red-800">Validation Failed</span>
              )}
            </h3>

            {validationResult.errors.length > 0 && (
              <ul className="list-disc list-inside text-sm text-red-700 mb-2">
                {validationResult.errors.map((e, i) => (
                  <li key={i}>
                    [{e.code}] {e.message}
                    {e.path && <span className="text-gray-500"> at {e.path}</span>}
                  </li>
                ))}
              </ul>
            )}

            {validationResult.warnings.length > 0 && (
              <ul className="list-disc list-inside text-sm text-orange-700">
                {validationResult.warnings.map((w, i) => (
                  <li key={i}>
                    [{w.code}] {w.message}
                  </li>
                ))}
              </ul>
            )}

            {validationResult.valid && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={handleSaveAsDraft}
                  disabled={saved}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40"
                >
                  {saved ? 'Saved as Draft' : 'Save as Draft'}
                </button>
                {saved && (
                  <p className="text-sm text-green-700 mt-2">
                    Spec saved as draft (logged to console).
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
