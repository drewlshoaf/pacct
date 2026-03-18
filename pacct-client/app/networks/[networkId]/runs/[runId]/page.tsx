'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRunDetail, useNetworkDetail, usePresence } from '@/app/hooks/useDiscovery';
import { RunStatus } from '@pacct/protocol-ts';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(startMs: number, endMs?: number): string {
  const end = endMs ?? Date.now();
  const diff = end - startMs;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ${secs % 60}s`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

const RUN_STAGES = [
  RunStatus.Pending,
  RunStatus.Initializing,
  RunStatus.Collecting,
  RunStatus.Computing,
  RunStatus.Distributing,
  RunStatus.Completed,
] as const;

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

export default function RunDetailPage() {
  const params = useParams();
  const networkId = params.networkId as string;
  const runId = params.runId as string;
  const { run, loading: runLoading } = useRunDetail(networkId, runId);
  const { network, loading: netLoading } = useNetworkDetail(networkId);
  const { presence } = usePresence(networkId);

  const loading = runLoading || netLoading;

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
        <div className="max-w-5xl mx-auto text-gray-500 dark:text-gray-400">Loading run...</div>
      </main>
    );
  }

  if (!run || !network) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
        <div className="max-w-5xl mx-auto">
          <Link href={`/networks/${networkId}/runs`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">&larr; Runs</Link>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Run not found.</p>
        </div>
      </main>
    );
  }

  const presenceMap = new Map(presence.map((p) => [p.nodeId, p]));
  const isActive = run.status !== RunStatus.Completed && run.status !== RunStatus.Aborted && run.status !== RunStatus.Failed;
  const isTerminal = run.status === RunStatus.Aborted || run.status === RunStatus.Failed;

  // Find current stage index for timeline
  const currentStageIndex = isTerminal
    ? -1
    : RUN_STAGES.indexOf(run.status as typeof RUN_STAGES[number]);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <Link href={`/networks/${networkId}/runs`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          &larr; {network.alias} / Runs
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-mono">{run.runId}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">in {network.alias}</p>
          </div>
          <RunStatusBadge status={run.status} />
        </div>

        {/* Timeline */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Run Timeline</h2>
          <div className="flex items-center justify-between">
            {RUN_STAGES.map((stage, i) => {
              const isPast = currentStageIndex >= 0 && i < currentStageIndex;
              const isCurrent = i === currentStageIndex;
              const isFuture = currentStageIndex >= 0 && i > currentStageIndex;
              const isCompletedRun = run.status === RunStatus.Completed;

              let dotColor = 'bg-gray-300 dark:bg-gray-600';
              let textColor = 'text-gray-400 dark:text-gray-500';
              let lineColor = 'bg-gray-200 dark:bg-gray-700';

              if (isTerminal) {
                dotColor = 'bg-gray-300 dark:bg-gray-600';
                textColor = 'text-gray-400 dark:text-gray-500';
              } else if (isCompletedRun || isPast) {
                dotColor = 'bg-green-500';
                textColor = 'text-green-700 dark:text-green-400';
                lineColor = 'bg-green-500';
              } else if (isCurrent) {
                dotColor = 'bg-blue-500 ring-4 ring-blue-200 dark:ring-blue-800';
                textColor = 'text-blue-700 dark:text-blue-400 font-medium';
              }

              return (
                <div key={stage} className="flex flex-col items-center flex-1">
                  <div className="flex items-center w-full">
                    {i > 0 && (
                      <div className={`h-1 flex-1 ${isPast || isCompletedRun ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'} rounded-full`} />
                    )}
                    <div className={`w-4 h-4 rounded-full ${dotColor} flex-shrink-0`} />
                    {i < RUN_STAGES.length - 1 && (
                      <div className={`h-1 flex-1 ${(isPast && !isCurrent) || isCompletedRun ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'} rounded-full`} />
                    )}
                  </div>
                  <span className={`text-xs mt-2 ${textColor} capitalize`}>{stage}</span>
                </div>
              );
            })}
          </div>

          {isTerminal && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-400">
                <strong>Run {run.status}:</strong> Participant disconnected during collection phase
              </p>
            </div>
          )}
        </div>

        {/* Run Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Details</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Status</dt>
                <dd><RunStatusBadge status={run.status} /></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Initiator</dt>
                <dd className="text-gray-900 dark:text-white font-mono text-xs">{run.initiatorNodeId.slice(0, 16)}...</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Started</dt>
                <dd className="text-gray-900 dark:text-white">{formatDate(run.startedAt)}</dd>
              </div>
              {run.completedAt && (
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Completed</dt>
                  <dd className="text-gray-900 dark:text-white">{formatDate(run.completedAt)}</dd>
                </div>
              )}
              {run.abortedAt && (
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">{run.status === RunStatus.Failed ? 'Failed' : 'Aborted'} At</dt>
                  <dd className="text-gray-900 dark:text-white">{formatDate(run.abortedAt)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Duration</dt>
                <dd className="text-gray-900 dark:text-white">{formatDuration(run.startedAt, run.completedAt ?? run.abortedAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Participants</dt>
                <dd className="text-gray-900 dark:text-white">{run.participantNodeIds.length}</dd>
              </div>
            </dl>
          </div>

          {/* Participants */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Participants</h2>
            <div className="space-y-2">
              {run.participantNodeIds.map((nodeId) => {
                const p = presenceMap.get(nodeId);
                const isInitiator = nodeId === run.initiatorNodeId;
                return (
                  <div key={nodeId} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${p?.online ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                      <code className="text-xs font-mono text-gray-900 dark:text-white">{nodeId.slice(0, 16)}...</code>
                      {isInitiator && (
                        <span className="text-xs text-purple-600 dark:text-purple-400">(initiator)</span>
                      )}
                    </div>
                    <span className={`text-xs ${p?.online ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                      {p?.online ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Result Summary (placeholder for completed runs) */}
        {run.status === RunStatus.Completed && (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Result Summary</h2>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                Computation results will be displayed here once the result rendering engine is integrated.
                This run completed successfully with {run.participantNodeIds.length} participants over {formatDuration(run.startedAt, run.completedAt)}.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
