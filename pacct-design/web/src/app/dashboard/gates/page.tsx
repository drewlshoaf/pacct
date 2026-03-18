'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import PortalLayout, { PageHeader } from '@/components/layout/PortalLayout';
import { useGates, deleteGateFromServer, deleteGate, saveGateToServer, saveGate } from './_store/gateStore';
import type { Gate } from '@loadtoad/schema';
import RmSelect from '@/components/ui/RmSelect';

const PAGE_SIZE = 10;

type SortKey = 'name' | 'entity' | 'conditions' | 'enabled';
type SortDir = 'asc' | 'desc';


function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="ml-1 inline-block">
      <path d="M5 1L8.5 4.5H1.5L5 1Z" fill={active && dir === 'asc' ? 'var(--rm-signal)' : 'var(--rm-text-muted)'} opacity={active && dir === 'asc' ? 1 : 0.3} />
      <path d="M5 9L1.5 5.5H8.5L5 9Z" fill={active && dir === 'desc' ? 'var(--rm-signal)' : 'var(--rm-text-muted)'} opacity={active && dir === 'desc' ? 1 : 0.3} />
    </svg>
  );
}

export default function GatesPage() {
  const gates = useGates();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [cloning, setCloning] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [enabledFilter, setEnabledFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  const processed = useMemo(() => {
    let list = [...gates];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(g =>
        g.name.toLowerCase().includes(q)
        || g.description.toLowerCase().includes(q)
        || g.entity_name.toLowerCase().includes(q)
      );
    }

    if (enabledFilter === 'enabled') {
      list = list.filter(g => g.enabled);
    } else if (enabledFilter === 'disabled') {
      list = list.filter(g => !g.enabled);
    }

    // Only show scenario-linked gates
    list = list.filter(g => g.entity_type === 'scenario');

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'entity':
          cmp = a.entity_name.localeCompare(b.entity_name);
          break;
        case 'conditions':
          cmp = a.conditions.length - b.conditions.length;
          break;
        case 'enabled':
          cmp = (a.enabled ? 1 : 0) - (b.enabled ? 1 : 0);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [gates, search, enabledFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = processed.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await deleteGateFromServer(id);
    } catch {
      deleteGate(id);
    }
    setDeleting(null);
  };

  const handleClone = async (e: React.MouseEvent, gate: Gate) => {
    e.preventDefault();
    e.stopPropagation();
    setCloning(gate.id);
    const now = new Date().toISOString();
    const cloned: Gate = {
      ...structuredClone(gate),
      id: crypto.randomUUID(),
      name: `${gate.name} (Copy)`,
      conditions: gate.conditions.map(c => ({ ...c, id: crypto.randomUUID() })),
      created_at: now,
      updated_at: now,
    };
    try {
      await saveGateToServer(cloned);
    } catch {
      saveGate(cloned);
    }
    setCloning(null);
  };

  const pageNumbers = useMemo(() => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push('ellipsis');
      const start = Math.max(2, safePage - 1);
      const end = Math.min(totalPages - 1, safePage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safePage < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, safePage]);

  const thStyle = { color: 'var(--rm-text-secondary)', cursor: 'pointer' } as const;

  return (
    <PortalLayout>
      <PageHeader
        title="Gates"
        description="Define pass/fail criteria for your performance entities"
        actions={
          <Link href="/dashboard/gates/new" className="btn btn-primary text-[13px]">
            Create Gate
          </Link>
        }
      />

      {gates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20" style={{ color: 'var(--rm-text-muted)' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-40">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <p className="text-[15px] font-medium mb-1" style={{ color: 'var(--rm-text-secondary)' }}>No gates defined yet</p>
          <p className="text-[13px] mb-4">Create your first gate to set pass/fail criteria.</p>
          <Link href="/dashboard/gates/new" className="btn btn-primary text-[13px]">Create Gate</Link>
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-[360px]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--rm-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search gates..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-3 py-2 rounded-lg text-[13px] outline-none transition-colors"
                style={{ background: 'var(--rm-bg-raised)', border: '1px solid var(--rm-border)', color: 'var(--rm-text)' }}
              />
            </div>
            <RmSelect
              value={enabledFilter}
              onChange={v => { setEnabledFilter(v as 'all' | 'enabled' | 'disabled'); setPage(1); }}
              options={[
                { value: 'all', label: 'All States' },
                { value: 'enabled', label: 'Enabled' },
                { value: 'disabled', label: 'Disabled' },
              ]}
              size="sm"
            />
            <span className="text-[12px] ml-auto" style={{ color: 'var(--rm-text-muted)' }}>
              {processed.length} gate{processed.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-lg" style={{ border: '1px solid var(--rm-border)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr style={{ background: 'var(--rm-bg-raised)' }}>
                    <th className="text-left px-4 py-2.5 font-medium" style={thStyle} onClick={() => toggleSort('name')}>
                      Name <SortIcon active={sortKey === 'name'} dir={sortDir} />
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium" style={thStyle} onClick={() => toggleSort('entity')}>
                      Scenario <SortIcon active={sortKey === 'entity'} dir={sortDir} />
                    </th>
                    <th className="text-center px-4 py-2.5 font-medium" style={thStyle} onClick={() => toggleSort('conditions')}>
                      Conditions <SortIcon active={sortKey === 'conditions'} dir={sortDir} />
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium" style={thStyle} onClick={() => toggleSort('enabled')}>
                      State <SortIcon active={sortKey === 'enabled'} dir={sortDir} />
                    </th>
                    <th className="px-4 py-2.5 font-medium text-right" style={{ color: 'var(--rm-text-secondary)' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center" style={{ color: 'var(--rm-text-muted)' }}>
                        No gates match your filters.
                      </td>
                    </tr>
                  ) : paged.map((gate) => (
                    <tr
                      key={gate.id}
                      className="cursor-pointer transition-colors"
                      style={{ borderTop: '1px solid var(--rm-border)' }}
                      onClick={() => window.location.href = `/dashboard/gates/${gate.id}/edit`}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--rm-bg-raised)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td className="px-4 py-3 max-w-[220px]">
                        <div className="text-[13px] font-medium truncate" style={{ color: 'var(--rm-text)' }}>
                          {gate.name || 'Untitled Gate'}
                        </div>
                        {gate.description && (
                          <div className="text-[11px] truncate mt-0.5" style={{ color: 'var(--rm-text-muted)' }}>
                            {gate.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-[180px]">
                        <div className="text-[12px] truncate" style={{ color: 'var(--rm-text-secondary)' }}>
                          {gate.entity_name || gate.entity_id.slice(0, 8) + '...'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className="text-[11px] px-1.5 py-0.5 rounded"
                          style={{ background: 'var(--rm-bg-raised)', color: 'var(--rm-text-secondary)' }}
                        >
                          {gate.conditions.length}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-[10px] font-medium px-2 py-0.5 rounded"
                          style={{
                            background: gate.enabled ? 'var(--rm-signal-glow)' : 'var(--rm-bg-raised)',
                            color: gate.enabled ? 'var(--rm-pass)' : 'var(--rm-text-muted)',
                          }}
                        >
                          {gate.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 justify-end">
                          <Link
                            href={`/dashboard/gates/${gate.id}/edit`}
                            className="p-1 rounded transition-colors no-underline"
                            title="Edit"
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--rm-signal-glow)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--rm-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </Link>
                          <button
                            onClick={(e) => handleClone(e, gate)}
                            disabled={cloning === gate.id}
                            className="p-1 rounded transition-colors"
                            title="Duplicate"
                            style={{ opacity: cloning === gate.id ? 0.4 : 1 }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--rm-signal-glow)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--rm-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, gate.id, gate.name)}
                            disabled={deleting === gate.id}
                            className="p-1 rounded hover:bg-red-500/10"
                            title="Delete"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={deleting === gate.id ? 'var(--rm-text-muted)' : 'var(--rm-fail)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3">
              <span className="text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>
                {processed.length} gate{processed.length !== 1 ? 's' : ''} — page {safePage} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(1)} disabled={safePage === 1}
                  className="px-2 py-1 rounded text-[11px] font-medium transition-colors"
                  style={{ background: safePage > 1 ? 'var(--rm-bg-raised)' : 'transparent', color: safePage > 1 ? 'var(--rm-text-secondary)' : 'var(--rm-text-muted)', cursor: safePage > 1 ? 'pointer' : 'default' }}>
                  &#171;
                </button>
                <button onClick={() => setPage(safePage - 1)} disabled={safePage === 1}
                  className="px-2 py-1 rounded text-[11px] font-medium transition-colors"
                  style={{ background: safePage > 1 ? 'var(--rm-bg-raised)' : 'transparent', color: safePage > 1 ? 'var(--rm-text-secondary)' : 'var(--rm-text-muted)', cursor: safePage > 1 ? 'pointer' : 'default' }}>
                  &#8249;
                </button>
                {pageNumbers.map((p, i) =>
                  p === 'ellipsis' ? (
                    <span key={`e${i}`} className="px-1.5 text-[11px]" style={{ color: 'var(--rm-text-muted)' }}>...</span>
                  ) : (
                    <button key={p} onClick={() => setPage(p)}
                      className="px-2.5 py-1 rounded text-[11px] font-medium transition-colors"
                      style={{
                        background: p === safePage ? 'var(--rm-signal-glow)' : 'var(--rm-bg-raised)',
                        color: p === safePage ? 'var(--rm-signal)' : 'var(--rm-text-secondary)',
                        cursor: 'pointer',
                        fontWeight: p === safePage ? 700 : 500,
                      }}>
                      {p}
                    </button>
                  )
                )}
                <button onClick={() => setPage(safePage + 1)} disabled={safePage === totalPages}
                  className="px-2 py-1 rounded text-[11px] font-medium transition-colors"
                  style={{ background: safePage < totalPages ? 'var(--rm-bg-raised)' : 'transparent', color: safePage < totalPages ? 'var(--rm-text-secondary)' : 'var(--rm-text-muted)', cursor: safePage < totalPages ? 'pointer' : 'default' }}>
                  &#8250;
                </button>
                <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages}
                  className="px-2 py-1 rounded text-[11px] font-medium transition-colors"
                  style={{ background: safePage < totalPages ? 'var(--rm-bg-raised)' : 'transparent', color: safePage < totalPages ? 'var(--rm-text-secondary)' : 'var(--rm-text-muted)', cursor: safePage < totalPages ? 'pointer' : 'default' }}>
                  &#187;
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </PortalLayout>
  );
}
