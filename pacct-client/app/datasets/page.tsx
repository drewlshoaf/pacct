'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DatasetSummary {
  id: string;
  name: string;
  rowCount: number;
  columnCount: number;
  sizeBytes: number;
  validationStatus: 'pending' | 'valid' | 'invalid';
  importedAt: number;
}

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<DatasetSummary[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('pacct_datasets');
    if (stored) {
      try {
        setDatasets(JSON.parse(stored));
      } catch {
        // ignore
      }
    }
  }, []);

  function handleDelete(id: string) {
    const updated = datasets.filter((d) => d.id !== id);
    setDatasets(updated);
    localStorage.setItem('pacct_datasets', JSON.stringify(updated));
    localStorage.removeItem(`pacct_dataset_rows:${id}`);
    localStorage.removeItem(`pacct_dataset_meta:${id}`);
    setDeleteId(null);
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const statusBadge = (status: string) => {
    const classes: Record<string, string> = {
      valid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      invalid: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      pending: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes[status] || classes.pending}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--pacct-text)' }}>Datasets</h1>
        <Link
          href="/datasets/import"
          className="btn btn-primary"
        >
          Import Dataset
        </Link>
      </div>

      {datasets.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-lg mb-2" style={{ color: 'var(--pacct-text-muted)' }}>
            No datasets imported yet
          </p>
          <p className="text-sm mb-4" style={{ color: 'var(--pacct-text-muted)' }}>
            Import a CSV or JSON file to get started
          </p>
          <Link href="/datasets/import" className="btn btn-secondary">
            Import Your First Dataset
          </Link>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--pacct-border)' }}>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--pacct-text-muted)' }}>Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--pacct-text-muted)' }}>Rows</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--pacct-text-muted)' }}>Columns</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--pacct-text-muted)' }}>Size</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--pacct-text-muted)' }}>Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--pacct-text-muted)' }}>Imported</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--pacct-text-muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {datasets.map((ds) => (
                <tr key={ds.id} style={{ borderBottom: '1px solid var(--pacct-border)' }} className="hover:bg-[var(--pacct-signal-glow)] transition-colors">
                  <td className="px-4 py-4">
                    <Link href={`/datasets/${ds.id}`} className="font-medium hover:underline" style={{ color: 'var(--pacct-signal)' }}>
                      {ds.name}
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-sm" style={{ color: 'var(--pacct-text-secondary)' }}>{ds.rowCount.toLocaleString()}</td>
                  <td className="px-4 py-4 text-sm" style={{ color: 'var(--pacct-text-secondary)' }}>{ds.columnCount}</td>
                  <td className="px-4 py-4 text-sm" style={{ color: 'var(--pacct-text-secondary)' }}>{formatBytes(ds.sizeBytes)}</td>
                  <td className="px-4 py-4">{statusBadge(ds.validationStatus)}</td>
                  <td className="px-4 py-4 text-sm" style={{ color: 'var(--pacct-text-muted)' }}>{new Date(ds.importedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-4 text-right">
                    {deleteId === ds.id ? (
                      <span className="text-sm">
                        <button onClick={() => handleDelete(ds.id)} className="text-red-600 font-medium mr-2 hover:underline">Confirm</button>
                        <button onClick={() => setDeleteId(null)} className="hover:underline" style={{ color: 'var(--pacct-text-muted)' }}>Cancel</button>
                      </span>
                    ) : (
                      <button onClick={() => setDeleteId(ds.id)} className="text-sm hover:underline" style={{ color: 'var(--pacct-text-muted)' }}>
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
