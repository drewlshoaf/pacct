'use client';

import { useState, useMemo } from 'react';
import type { ScenarioNameEntry } from '@/lib/api';

export default function ScenarioSelectorSearchable({
  scenarios,
  selectedId,
  onSelect,
}: {
  scenarios: ScenarioNameEntry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return scenarios;
    const lower = search.toLowerCase();
    return scenarios.filter(s => s.name.toLowerCase().includes(lower));
  }, [scenarios, search]);

  return (
    <div className="mb-5">
      <div className="flex items-center gap-3">
        <label className="text-[12px] font-semibold" style={{ color: 'var(--rm-text-muted)' }}>Scenario</label>
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search scenarios..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-[13px] px-3 py-1.5 rounded-lg"
            style={{
              background: 'var(--rm-bg-raised)',
              color: 'var(--rm-text)',
              border: '1px solid var(--rm-border)',
            }}
          />
        </div>
      </div>
      {search && filtered.length > 0 && (
        <div className="mt-2 max-h-[200px] overflow-y-auto rounded-lg" style={{ border: '1px solid var(--rm-border)', background: 'var(--rm-bg-surface)' }}>
          {filtered.map(s => (
            <button
              key={s.name}
              onClick={() => { onSelect(s.name); setSearch(''); }}
              className="w-full text-left px-3 py-2 text-[13px] transition-colors hover:bg-[var(--rm-bg-raised)]"
              style={{
                color: s.name === selectedId ? 'var(--rm-signal)' : 'var(--rm-text)',
                borderBottom: '1px solid var(--rm-border)',
              }}
            >
              {s.name}
              <span className="text-[11px] ml-2" style={{ color: 'var(--rm-text-muted)' }}>({s.run_count} runs)</span>
            </button>
          ))}
        </div>
      )}
      {selectedId && !search && (
        <div className="mt-2 text-[13px]" style={{ color: 'var(--rm-text)' }}>
          Selected: <strong>{selectedId}</strong>
        </div>
      )}
    </div>
  );
}
