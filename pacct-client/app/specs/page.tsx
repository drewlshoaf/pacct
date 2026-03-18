'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { listTemplates } from '@pacct/specs';

type SpecType = 'schema' | 'computation' | 'governance' | 'economic';

interface SpecDraft {
  id: string;
  name: string;
  specType: SpecType;
  updatedAt: number;
}

// In-memory draft store (will be replaced by persistence adapter)
const draftStore: SpecDraft[] = [];

function addDraft(draft: SpecDraft) {
  const existing = draftStore.findIndex((d) => d.id === draft.id);
  if (existing >= 0) {
    draftStore[existing] = draft;
  } else {
    draftStore.push(draft);
  }
}

function removeDraft(id: string) {
  const idx = draftStore.findIndex((d) => d.id === id);
  if (idx >= 0) draftStore.splice(idx, 1);
}

function getDrafts(): SpecDraft[] {
  return [...draftStore];
}

const SPEC_TYPE_LABELS: Record<SpecType, string> = {
  schema: 'Schema',
  computation: 'Computation',
  governance: 'Governance',
  economic: 'Economic',
};

export default function SpecLibraryPage() {
  const [drafts, setDrafts] = useState<SpecDraft[]>([]);
  const [templates, setTemplates] = useState<{ category: string; description: string }[]>([]);
  const [filterType, setFilterType] = useState<SpecType | ''>('');

  useEffect(() => {
    setDrafts(getDrafts());
    setTemplates(listTemplates());
  }, []);

  const filteredDrafts = filterType
    ? drafts.filter((d) => d.specType === filterType)
    : drafts;

  const handleDelete = (id: string) => {
    removeDraft(id);
    setDrafts(getDrafts());
  };

  const handleCreateNew = (specType: SpecType) => {
    const id = `draft-${specType}-${Date.now()}`;
    addDraft({
      id,
      name: `New ${SPEC_TYPE_LABELS[specType]} Draft`,
      specType,
      updatedAt: Date.now(),
    });
    setDrafts(getDrafts());
    // Navigate would happen in real app
    window.location.href = `/specs/${id}`;
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Spec Library</h1>
        <div className="flex gap-2">
          <Link
            href="/specs/import"
            className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
          >
            Import
          </Link>
          <Link
            href="/specs/templates"
            className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
          >
            Templates
          </Link>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-6 flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Filter by type:</label>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as SpecType | '')}
          className="px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Types</option>
          <option value="schema">Schema</option>
          <option value="computation">Computation</option>
          <option value="governance">Governance</option>
          <option value="economic">Economic</option>
        </select>
      </div>

      {/* Create new buttons */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Create New Draft</h2>
        <div className="flex gap-2">
          {(['schema', 'computation', 'governance', 'economic'] as SpecType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleCreateNew(type)}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
            >
              + {SPEC_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Draft list */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Drafts ({filteredDrafts.length})</h2>
        {filteredDrafts.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">
            No drafts yet. Create a new draft or import a spec to get started.
          </p>
        ) : (
          filteredDrafts.map((draft) => (
            <div
              key={draft.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
            >
              <div>
                <Link
                  href={`/specs/${draft.id}`}
                  className="font-medium text-blue-600 hover:text-blue-800"
                >
                  {draft.name}
                </Link>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">
                    {SPEC_TYPE_LABELS[draft.specType]}
                  </span>
                  <span className="text-xs text-gray-500">
                    Updated: {new Date(draft.updatedAt).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/specs/${draft.id}`}
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(draft.id)}
                  className="px-3 py-1 text-sm border rounded text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Template list summary */}
      {templates.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-3">Available Templates</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {templates.map((t) => (
              <Link
                key={t.category}
                href="/specs/templates"
                className="p-3 border rounded-lg hover:bg-blue-50 transition-colors"
              >
                <div className="font-medium capitalize">{t.category}</div>
                <div className="text-sm text-gray-600">{t.description}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
