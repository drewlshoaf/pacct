'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { DatasetColumn, DatasetRow } from '@/lib/dataset/types';

interface DatasetMeta {
  id: string;
  name: string;
  rowCount: number;
  columnCount: number;
  columns: DatasetColumn[];
  importedAt: number;
  validationStatus: string;
  sizeBytes: number;
}

export default function DatasetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const datasetId = params.datasetId as string;

  const [dataset, setDataset] = useState<DatasetMeta | null>(null);
  const [rows, setRows] = useState<DatasetRow[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const meta = localStorage.getItem(`pacct_dataset_meta:${datasetId}`);
    if (meta) {
      setDataset(JSON.parse(meta));
    }
    const rowData = localStorage.getItem(`pacct_dataset_rows:${datasetId}`);
    if (rowData) {
      const parsed = JSON.parse(rowData);
      setRows(parsed.slice(0, 50));
    }
  }, [datasetId]);

  function handleDelete() {
    const existing = JSON.parse(localStorage.getItem('pacct_datasets') || '[]');
    const updated = existing.filter((d: DatasetMeta) => d.id !== datasetId);
    localStorage.setItem('pacct_datasets', JSON.stringify(updated));
    localStorage.removeItem(`pacct_dataset_rows:${datasetId}`);
    localStorage.removeItem(`pacct_dataset_meta:${datasetId}`);
    router.push('/datasets');
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (!dataset) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="card text-center py-12">
          <p style={{ color: 'var(--pacct-text-muted)' }}>Dataset not found</p>
          <Link href="/datasets" className="btn btn-secondary mt-4">Back to Datasets</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/datasets" className="text-sm hover:underline mb-1 inline-block" style={{ color: 'var(--pacct-text-muted)' }}>
            &larr; Datasets
          </Link>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--pacct-text)' }}>{dataset.name}</h1>
        </div>
        <div>
          {showDeleteConfirm ? (
            <span className="flex items-center gap-2">
              <span className="text-sm" style={{ color: 'var(--pacct-text-muted)' }}>Are you sure?</span>
              <button onClick={handleDelete} className="btn text-sm px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700">
                Yes, Delete
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} className="btn btn-secondary text-sm px-3 py-1.5">
                Cancel
              </button>
            </span>
          ) : (
            <button onClick={() => setShowDeleteConfirm(true)} className="btn btn-secondary text-sm">
              Delete Dataset
            </button>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--pacct-text)' }}>Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="stat">
            <span className="stat-value">{dataset.rowCount.toLocaleString()}</span>
            <span className="stat-label">Rows</span>
          </div>
          <div className="stat">
            <span className="stat-value">{dataset.columnCount}</span>
            <span className="stat-label">Columns</span>
          </div>
          <div className="stat">
            <span className="stat-value">{formatBytes(dataset.sizeBytes)}</span>
            <span className="stat-label">Size</span>
          </div>
          <div className="stat">
            <span className="stat-value text-base">{new Date(dataset.importedAt).toLocaleDateString()}</span>
            <span className="stat-label">Imported</span>
          </div>
        </div>
      </div>

      {/* Columns */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--pacct-text)' }}>Column Details</h2>
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Nulls</th>
                <th>Unique</th>
                <th>Min</th>
                <th>Max</th>
                <th>Mean</th>
              </tr>
            </thead>
            <tbody>
              {dataset.columns.map((col) => (
                <tr key={col.name}>
                  <td className="font-medium" style={{ color: 'var(--pacct-text)' }}>{col.name}</td>
                  <td>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium" style={{ background: 'var(--pacct-bg-raised)', color: 'var(--pacct-text-secondary)' }}>
                      {col.type}
                    </span>
                  </td>
                  <td>{col.nullCount}</td>
                  <td>{col.uniqueCount}</td>
                  <td className="font-mono text-xs">{col.min !== undefined ? col.min : '-'}</td>
                  <td className="font-mono text-xs">{col.max !== undefined ? col.max : '-'}</td>
                  <td className="font-mono text-xs">{col.mean !== undefined ? col.mean.toFixed(2) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Preview */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--pacct-text)' }}>
          Data Preview {rows.length > 0 && <span className="text-sm font-normal" style={{ color: 'var(--pacct-text-muted)' }}>(first {rows.length} rows)</span>}
        </h2>
        {rows.length === 0 ? (
          <p style={{ color: 'var(--pacct-text-muted)' }}>No data available</p>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  {dataset.columns.map((col) => (
                    <th key={col.name}>{col.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    <td className="font-mono text-xs" style={{ color: 'var(--pacct-text-muted)' }}>{i + 1}</td>
                    {dataset.columns.map((col) => (
                      <td key={col.name} className="font-mono text-xs">
                        {row[col.name] === null ? (
                          <span style={{ color: 'var(--pacct-text-muted)' }}>null</span>
                        ) : (
                          String(row[col.name])
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
