'use client';

import { useState, useEffect } from 'react';
import { fetchScenarioSummary, fetchScenarioNames } from '@/lib/api';
import type { ScenarioSummary, ScenarioNameEntry } from '@/lib/api';
import type { TimeWindow } from '@/data/types';
import ScenarioSelectorSearchable from './ScenarioSelectorSearchable';
import ScenarioSummaryCard from './ScenarioSummaryCard';
import ScenarioTrendsPanel from './ScenarioTrendsPanel';
import ScenarioRunList from './ScenarioRunList';
import EvidencePanel from '../EvidencePanel';

export default function ScenarioScopeBody({
  initialScenarioId,
  window,
}: {
  initialScenarioId?: string;
  window: TimeWindow;
}) {
  const [scenarios, setScenarios] = useState<ScenarioNameEntry[]>([]);
  const [scenarioId, setScenarioId] = useState<string | null>(initialScenarioId ?? null);
  const [data, setData] = useState<ScenarioSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedAssertion, setSelectedAssertion] = useState<string | null>(null);

  // Load scenario list
  useEffect(() => {
    fetchScenarioNames().then(setScenarios);
  }, []);

  // Load scenario data when selection or window changes
  useEffect(() => {
    if (!scenarioId) {
      setData(null);
      return;
    }
    setLoading(true);
    setSelectedRunId(null);
    setSelectedAssertion(null);
    fetchScenarioSummary(scenarioId, window).then(d => {
      setData(d);
      setLoading(false);
    });
  }, [scenarioId, window]);

  return (
    <div>
      <ScenarioSelectorSearchable
        scenarios={scenarios}
        selectedId={scenarioId}
        onSelect={setScenarioId}
      />

      {loading && (
        <div className="card text-center py-12">
          <p className="text-[14px]" style={{ color: 'var(--rm-text-secondary)' }}>Loading scenario data...</p>
        </div>
      )}

      {!loading && !data && (
        <div className="card text-center py-12">
          <p className="text-[13px]" style={{ color: 'var(--rm-text-muted)' }}>Select a scenario to view analytics.</p>
        </div>
      )}

      {!loading && data && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2 space-y-5">
            <ScenarioSummaryCard data={data} />
            <ScenarioTrendsPanel data={data} />
            <ScenarioRunList
              data={data}
              selectedRunId={selectedRunId}
              onSelectRun={(runId) => {
                setSelectedRunId(runId);
                setSelectedAssertion(data.assertions.length > 0 ? data.assertions[0].metric : null);
              }}
            />
          </div>
          <div>
            <EvidencePanel
              runId={selectedRunId}
              assertionType={selectedAssertion}
            />
            {selectedRunId && data.assertions.length > 0 && (
              <div className="mt-3 space-y-1">
                {data.assertions.map(a => (
                  <button
                    key={a.metric}
                    onClick={() => setSelectedAssertion(a.metric)}
                    className="block w-full text-left px-3 py-2 rounded-lg text-[12px] transition-colors"
                    style={{
                      background: selectedAssertion === a.metric ? 'var(--rm-signal-glow)' : 'var(--rm-bg-raised)',
                      color: selectedAssertion === a.metric ? 'var(--rm-text)' : 'var(--rm-text-secondary)',
                      border: `1px solid ${selectedAssertion === a.metric ? 'var(--rm-border-hover)' : 'var(--rm-border)'}`,
                    }}
                  >
                    {a.metric === 'error_rate' ? 'Error Rate' : a.metric === 'stability' ? 'Stability' : a.metric.toUpperCase()} — limit {a.threshold}{a.unit}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
