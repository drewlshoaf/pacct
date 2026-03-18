'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useNetworkDetail, useRuns } from '@/app/hooks/useDiscovery';
import { useNetworkState } from '@/app/hooks/useNetworkState';
import { RunStatus } from '@pacct/protocol-ts';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDuration(startMs: number, endMs?: number): string {
  const end = endMs ?? Date.now();
  const diff = end - startMs;
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hrs}h ${remainMins}m`;
}

function RunStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    initializing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    collecting: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
    computing: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    distributing: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    aborted: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-400',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

export default function RunsPage() {
  const params = useParams();
  const networkId = params.networkId as string;
  const { network, loading: netLoading } = useNetworkDetail(networkId);
  const { runs, loading: runsLoading } = useRuns(networkId);
  const computed = useNetworkState(network);
  const [cooldownDisplay, setCooldownDisplay] = useState('');

  useEffect(() => {
    if (computed.cooldownRemainingMs <= 0) {
      setCooldownDisplay('');
      return;
    }
    const update = () => {
      const remaining = computed.cooldownRemainingMs - (Date.now() - Date.now());
      if (remaining <= 0) {
        setCooldownDisplay('');
        return;
      }
      const hrs = Math.floor(remaining / 3_600_000);
      const mins = Math.floor((remaining % 3_600_000) / 60_000);
      setCooldownDisplay(`${hrs}h ${mins}m`);
    };
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [computed.cooldownRemainingMs]);

  const loading = netLoading || runsLoading;

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
        <div className="max-w-5xl mx-auto text-gray-500 dark:text-gray-400">Loading...</div>
      </main>
    );
  }

  if (!network) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
        <div className="max-w-5xl mx-auto">
          <Link href="/networks" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">&larr; Networks</Link>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Network not found.</p>
        </div>
      </main>
    );
  }

  const activeRuns = runs.filter(
    (r) => r.status !== RunStatus.Completed && r.status !== RunStatus.Aborted && r.status !== RunStatus.Failed,
  );
  const pastRuns = runs.filter(
    (r) => r.status === RunStatus.Completed || r.status === RunStatus.Aborted || r.status === RunStatus.Failed,
  );

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <Link href={`/networks/${networkId}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">&larr; {network.alias}</Link>

        {/* Tabs */}
        <nav className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
          <Link href={`/networks/${networkId}`} className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">Overview</Link>
          <Link href={`/networks/${networkId}/members`} className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">Members</Link>
          <Link href={`/networks/${networkId}/runs`} className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400">Runs</Link>
          <Link href={`/networks/${networkId}/settings`} className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">Settings</Link>
        </nav>

        {/* Run Controls */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Run Controls</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Budget: <strong>{computed.budgetUsed}</strong> of <strong>{computed.budgetMax}</strong> runs used this {computed.periodLengthDays}-day period
              </p>
            </div>
            <button
              disabled={!computed.canInitiateRunResult.allowed}
              onClick={() => alert('Mock: Initiating run for network ' + networkId)}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                computed.canInitiateRunResult.allowed
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              }`}
            >
              Initiate Run
            </button>
          </div>
          {!computed.canInitiateRunResult.allowed && computed.canInitiateRunResult.reason && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              {computed.canInitiateRunResult.reason}
            </p>
          )}
          {computed.cooldownRemainingMs > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-amber-500 h-2 rounded-full" style={{ width: '40%' }} />
              </div>
              <span className="text-xs text-amber-600 dark:text-amber-400 whitespace-nowrap">
                Cooldown: {cooldownDisplay || `${Math.ceil(computed.cooldownRemainingMs / 3_600_000)}h`}
              </span>
            </div>
          )}
        </div>

        {/* Active Runs */}
        {activeRuns.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-blue-200 dark:border-blue-900 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Active Run
            </h2>
            {activeRuns.map((run) => (
              <Link
                key={run.runId}
                href={`/networks/${networkId}/runs/${run.runId}`}
                className="block p-4 rounded-lg border border-blue-100 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <code className="text-sm font-mono text-gray-900 dark:text-white">{run.runId}</code>
                  <RunStatusBadge status={run.status} />
                </div>
                <div className="flex flex-wrap gap-x-4 text-xs text-gray-500 dark:text-gray-400">
                  <span>Initiator: {run.initiatorNodeId.slice(0, 12)}...</span>
                  <span>Started: {formatDate(run.startedAt)}</span>
                  <span>Duration: {formatDuration(run.startedAt)}</span>
                  <span>Participants: {run.participantNodeIds.length}</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Run History */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Run History <span className="text-sm font-normal text-gray-400">({pastRuns.length})</span>
          </h2>
          {pastRuns.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No completed runs yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                    <th className="pb-2 pr-4">Run ID</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4">Initiator</th>
                    <th className="pb-2 pr-4">Started</th>
                    <th className="pb-2 pr-4">Duration</th>
                    <th className="pb-2">Participants</th>
                  </tr>
                </thead>
                <tbody>
                  {pastRuns.map((run) => (
                    <tr key={run.runId} className="border-b border-gray-50 dark:border-gray-800 last:border-0">
                      <td className="py-3 pr-4">
                        <Link
                          href={`/networks/${networkId}/runs/${run.runId}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline font-mono text-xs"
                        >
                          {run.runId}
                        </Link>
                      </td>
                      <td className="py-3 pr-4"><RunStatusBadge status={run.status} /></td>
                      <td className="py-3 pr-4 text-xs font-mono text-gray-500 dark:text-gray-400">{run.initiatorNodeId.slice(0, 12)}...</td>
                      <td className="py-3 pr-4 text-xs text-gray-500 dark:text-gray-400">{formatDate(run.startedAt)}</td>
                      <td className="py-3 pr-4 text-xs text-gray-500 dark:text-gray-400">
                        {formatDuration(run.startedAt, run.completedAt ?? run.abortedAt)}
                      </td>
                      <td className="py-3 text-xs text-gray-500 dark:text-gray-400">{run.participantNodeIds.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
