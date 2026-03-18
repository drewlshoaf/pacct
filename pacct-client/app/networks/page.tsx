'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useNetworks } from '@/app/hooks/useDiscovery';
import { NetworkStatus, MemberStatus } from '@pacct/protocol-ts';
import { getMyNodeId } from '@/lib/mock/mock-data';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

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
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

export default function NetworksPage() {
  const { networks, loading, refresh } = useNetworks();
  const myNodeId = getMyNodeId();

  const { created, memberOf, appliedTo } = useMemo(() => {
    const created = networks.filter((n) => n.creatorNodeId === myNodeId);
    const memberOf = networks.filter(
      (n) =>
        n.creatorNodeId !== myNodeId &&
        n.members.some(
          (m) => m.nodeId === myNodeId && m.status !== MemberStatus.Left && m.status !== MemberStatus.Expelled,
        ),
    );
    const appliedTo = networks.filter((n) =>
      n.applicants.some((a) => a.nodeId === myNodeId),
    );
    return { created, memberOf, appliedTo };
  }, [networks, myNodeId]);

  function getMyRole(net: typeof networks[0]): string {
    if (net.creatorNodeId === myNodeId) return 'creator';
    const member = net.members.find((m) => m.nodeId === myNodeId);
    if (member) return member.status;
    const applicant = net.applicants.find((a) => a.nodeId === myNodeId);
    if (applicant) return `applicant (${applicant.status})`;
    return 'none';
  }

  function getLastActivity(net: typeof networks[0]): number {
    const runDates = net.runHistory.map((r) => r.completedAt ?? r.abortedAt ?? r.startedAt);
    const allDates = [net.createdAt, net.activatedAt ?? 0, net.dissolvedAt ?? 0, ...runDates];
    return Math.max(...allDates);
  }

  function getActiveMemberCount(net: typeof networks[0]): number {
    return net.members.filter(
      (m) => m.status === MemberStatus.Active || m.status === MemberStatus.Offline || m.status === MemberStatus.PendingReAck,
    ).length;
  }

  function NetworkRow({ net }: { net: typeof networks[0] }) {
    return (
      <Link
        href={`/networks/${net.networkId}`}
        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border border-gray-100 dark:border-gray-800"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{net.alias}</span>
            <StatusBadge status={net.status} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            <span>{getActiveMemberCount(net)} active members</span>
            <span>Role: {getMyRole(net)}</span>
            <span>Created {formatDate(net.createdAt)}</span>
          </div>
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500 mt-2 sm:mt-0 sm:ml-4 whitespace-nowrap">
          Last activity: {formatTimeAgo(getLastActivity(net))}
        </div>
      </Link>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link href="/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-1 inline-block">
              &larr; Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Networks</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={refresh}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
            >
              Refresh
            </button>
            <Link
              href="/networks/create"
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Create Network
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="text-gray-500 dark:text-gray-400">Loading networks...</div>
        ) : networks.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-4">You are not part of any networks yet.</p>
            <div className="flex justify-center gap-3">
              <Link href="/networks/create" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                Create Network
              </Link>
              <Link href="/join" className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-medium border border-gray-200 dark:border-gray-700">
                Browse Networks
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Networks I Created */}
            {created.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Networks I Created <span className="text-sm font-normal text-gray-400">({created.length})</span>
                </h2>
                <div className="space-y-2">
                  {created.map((net) => (
                    <NetworkRow key={net.networkId} net={net} />
                  ))}
                </div>
              </section>
            )}

            {/* Networks I'm a Member Of */}
            {memberOf.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Networks I Joined <span className="text-sm font-normal text-gray-400">({memberOf.length})</span>
                </h2>
                <div className="space-y-2">
                  {memberOf.map((net) => (
                    <NetworkRow key={net.networkId} net={net} />
                  ))}
                </div>
              </section>
            )}

            {/* Networks I Applied To (if separate from above) */}
            {appliedTo.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Applied To <span className="text-sm font-normal text-gray-400">({appliedTo.length})</span>
                </h2>
                <div className="space-y-2">
                  {appliedTo.map((net) => (
                    <NetworkRow key={net.networkId} net={net} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
