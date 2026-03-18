'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useNodeIdentity } from '@/app/hooks/useNodeIdentity';
import { useNetworks } from '@/app/hooks/useDiscovery';
import { useEvents } from '@/app/hooks/useDiscovery';
import { NetworkStatus, RunStatus, PacctEventType } from '@pacct/protocol-ts';
import type { PacctEvent } from '@pacct/protocol-ts';
import { getMyNodeId } from '@/lib/mock/mock-data';

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function eventLabel(event: PacctEvent): string {
  switch (event.eventType) {
    case PacctEventType.NetworkCreated: return 'Network created';
    case PacctEventType.NetworkActivated: return 'Network activated';
    case PacctEventType.NetworkDegraded: return 'Network degraded';
    case PacctEventType.NetworkDissolved: return 'Network dissolved';
    case PacctEventType.MemberJoined: return 'Member joined';
    case PacctEventType.MemberLeft: return 'Member left';
    case PacctEventType.MemberExpelled: return 'Member expelled';
    case PacctEventType.MemberReAcknowledged: return 'Member re-acknowledged';
    case PacctEventType.ApplicantSubmitted: return 'New application';
    case PacctEventType.ApplicantApproved: return 'Applicant approved';
    case PacctEventType.ApplicantRejected: return 'Applicant rejected';
    case PacctEventType.ApplicantAccepted: return 'Applicant accepted';
    case PacctEventType.ApplicantWithdrawn: return 'Application withdrawn';
    case PacctEventType.ApplicantExpired: return 'Application expired';
    case PacctEventType.RunStarted: return 'Run started';
    case PacctEventType.RunCompleted: return 'Run completed';
    case PacctEventType.RunAborted: return 'Run aborted';
    default: return 'Event';
  }
}

export default function Home() {
  const { nodeId, loading: idLoading } = useNodeIdentity();
  const { networks, loading: netLoading } = useNetworks();
  const { events, loading: evtLoading } = useEvents();

  const stats = useMemo(() => {
    const myNodeId = getMyNodeId();
    const totalNetworks = networks.length;
    const activeNetworks = networks.filter(
      (n) => n.status === NetworkStatus.Active || n.status === NetworkStatus.Degraded
    ).length;
    const pendingApplications = networks.reduce(
      (sum, n) => sum + n.applicants.filter((a) => a.status === 'pending_approval').length,
      0,
    );
    const totalRuns = networks.reduce((sum, n) => sum + n.runHistory.length, 0);
    return { totalNetworks, activeNetworks, pendingApplications, totalRuns };
  }, [networks]);

  const recentEvents = useMemo(() => {
    return [...events].sort((a, b) => b.timestamp - a.timestamp).slice(0, 8);
  }, [events]);

  const loading = idLoading || netLoading || evtLoading;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">PACCT Dashboard</h1>
          {nodeId && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Node: <code className="bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">{nodeId}</code>
            </p>
          )}
        </div>

        {loading ? (
          <div className="text-gray-500 dark:text-gray-400">Loading...</div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-900 rounded-lg p-5 border border-gray-200 dark:border-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Networks</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalNetworks}</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-lg p-5 border border-gray-200 dark:border-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Networks</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.activeNetworks}</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-lg p-5 border border-gray-200 dark:border-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending Applications</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{stats.pendingApplications}</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-lg p-5 border border-gray-200 dark:border-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Runs</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{stats.totalRuns}</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/networks/create"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Create Network
                </Link>
                <Link
                  href="/join"
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium border border-gray-200 dark:border-gray-700"
                >
                  Browse Networks
                </Link>
                <Link
                  href="/specs"
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium border border-gray-200 dark:border-gray-700"
                >
                  Spec Studio
                </Link>
                <Link
                  href="/settings"
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium border border-gray-200 dark:border-gray-700"
                >
                  Settings
                </Link>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
              {recentEvents.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No recent activity.</p>
              ) : (
                <div className="space-y-3">
                  {recentEvents.map((evt, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                      <div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {eventLabel(evt)}
                        </span>
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                          in{' '}
                          <Link href={`/networks/${evt.networkId}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                            {evt.networkId}
                          </Link>
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap ml-4">
                        {formatTimeAgo(evt.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* My Networks Summary */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">My Networks</h2>
                <Link href="/networks" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                  View all
                </Link>
              </div>
              <div className="space-y-2">
                {networks.slice(0, 4).map((net) => (
                  <Link
                    key={net.networkId}
                    href={`/networks/${net.networkId}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{net.alias}</span>
                      <StatusBadge status={net.status} />
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {net.members.length} members
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    degraded: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
    pending: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    dissolved: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    draft: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    archived: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
  };
  return (
    <span className={`ml-2 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}
