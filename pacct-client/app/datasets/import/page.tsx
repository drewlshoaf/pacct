'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { parseCSV, parseJSON, inferColumnTypes } from '@/lib/dataset/parser';
import type { DatasetRow, DatasetColumn } from '@/lib/dataset/types';

export default function ImportDatasetPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [rawData, setRawData] = useState('');
  const [preview, setPreview] = useState<{ headers: string[]; rows: DatasetRow[]; columns: DatasetColumn[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!name) {
      setName(file.name.replace(/\.(csv|json)$/i, ''));
    }

    if (file.name.endsWith('.json')) setFormat('json');
    else setFormat('csv');

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setRawData(text);
      parsePreview(text, file.name.endsWith('.json') ? 'json' : 'csv');
    };
    reader.readAsText(file);
  }

  function parsePreview(data: string, fmt: 'csv' | 'json') {
    setError(null);
    try {
      const parsed = fmt === 'csv' ? parseCSV(data) : parseJSON(data);
      if (parsed.headers.length === 0) {
        setError('No data found');
        setPreview(null);
        return;
      }
      const columns = inferColumnTypes(parsed.headers, parsed.rows);
      setPreview({
        headers: parsed.headers,
        rows: parsed.rows.slice(0, 10),
        columns,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Parse error');
      setPreview(null);
    }
  }

  function handleParseClick() {
    if (!rawData.trim()) {
      setError('Please provide data to parse');
      return;
    }
    parsePreview(rawData, format);
  }

  function handleImport() {
    if (!name.trim()) {
      setError('Please provide a dataset name');
      return;
    }
    if (!rawData.trim()) {
      setError('No data to import');
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const parsed = format === 'csv' ? parseCSV(rawData) : parseJSON(rawData);
      const columns = inferColumnTypes(parsed.headers, parsed.rows);
      const id = crypto.randomUUID();

      const dataset = {
        id,
        name: name.trim(),
        rowCount: parsed.rows.length,
        columnCount: columns.length,
        columns,
        importedAt: Date.now(),
        validationStatus: 'pending' as const,
        sizeBytes: new Blob([rawData]).size,
      };

      // Store in localStorage
      const existing = JSON.parse(localStorage.getItem('pacct_datasets') || '[]');
      existing.push(dataset);
      localStorage.setItem('pacct_datasets', JSON.stringify(existing));
      localStorage.setItem(`pacct_dataset_rows:${id}`, JSON.stringify(parsed.rows));
      localStorage.setItem(`pacct_dataset_meta:${id}`, JSON.stringify(dataset));

      router.push(`/datasets/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
      setImporting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--pacct-text)' }}>Import Dataset</h1>
        <p className="text-sm" style={{ color: 'var(--pacct-text-muted)' }}>
          Upload a CSV or JSON file, or paste data directly
        </p>
      </div>

      <div className="card mb-6">
        <div className="mb-4">
          <label className="form-label">Dataset Name</label>
          <input
            type="text"
            className="input"
            placeholder="My Dataset"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="form-label">Format</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--pacct-text-secondary)' }}>
              <input
                type="radio"
                name="format"
                value="csv"
                checked={format === 'csv'}
                onChange={() => setFormat('csv')}
              />
              CSV
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--pacct-text-secondary)' }}>
              <input
                type="radio"
                name="format"
                value="json"
                checked={format === 'json'}
                onChange={() => setFormat('json')}
              />
              JSON
            </label>
          </div>
        </div>

        <div className="mb-4">
          <label className="form-label">Upload File</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json"
            onChange={handleFileUpload}
            className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:cursor-pointer"
            style={{ color: 'var(--pacct-text-secondary)' }}
          />
        </div>

        <div className="mb-4">
          <label className="form-label">Or Paste Data</label>
          <textarea
            className="textarea font-mono text-xs"
            rows={8}
            placeholder={format === 'csv' ? 'id,name,value\n1,Alice,100\n2,Bob,200' : '[{"id": 1, "name": "Alice"}, ...]'}
            value={rawData}
            onChange={(e) => setRawData(e.target.value)}
          />
        </div>

        <div className="flex gap-3">
          <button onClick={handleParseClick} className="btn btn-secondary">
            Preview
          </button>
          <button onClick={handleImport} disabled={importing} className="btn btn-primary">
            {importing ? 'Importing...' : 'Import Dataset'}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error mb-6">
          <span>{error}</span>
        </div>
      )}

      {preview && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--pacct-text)' }}>
            Preview ({preview.rows.length} of {preview.rows.length}+ rows)
          </h2>

          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--pacct-text-secondary)' }}>Column Types</h3>
            <div className="flex flex-wrap gap-2">
              {preview.columns.map((col) => (
                <span key={col.name} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'var(--pacct-bg-raised)', border: '1px solid var(--pacct-border)', color: 'var(--pacct-text-secondary)' }}>
                  <span className="font-semibold" style={{ color: 'var(--pacct-text)' }}>{col.name}</span>
                  {col.type}
                </span>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto -mx-6 px-6">
            <table className="table">
              <thead>
                <tr>
                  {preview.headers.map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, i) => (
                  <tr key={i}>
                    {preview.headers.map((h) => (
                      <td key={h} className="font-mono text-xs">
                        {row[h] === null ? <span style={{ color: 'var(--pacct-text-muted)' }}>null</span> : String(row[h])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
