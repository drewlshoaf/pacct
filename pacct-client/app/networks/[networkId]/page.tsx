'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useNetworkDetail } from '@/app/hooks/useDiscovery';
import { useNetworkState } from '@/app/hooks/useNetworkState';
import { MemberStatus, RunStatus } from '@pacct/protocol-ts';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

export default function NetworkDetailPage() {
  const params = useParams();
  const networkId = params.networkId as string;
  const { network, loading } = useNetworkDetail(networkId);
  const computed = useNetworkState(network);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
        <div className="max-w-5xl mx-auto text-gray-500 dark:text-gray-400">Loading network...</div>
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

  const activeMemberCount = network.members.filter(
    (m) => m.status === MemberStatus.Active || m.status === MemberStatus.Offline || m.status === MemberStatus.PendingReAck,
  ).length;

  const completedRuns = network.runHistory.filter((r) => r.status === RunStatus.Completed).length;
  const pendingApplicants = network.applicants.filter((a) => a.status === 'pending_approval').length;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <Link href="/networks" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">&larr; Networks</Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{network.alias}</h1>
              <StatusBadge status={network.status} />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              <code className="bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">{network.networkId}</code>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {computed.isCreator && (
              <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 rounded-full font-medium">
                Creator
              </span>
            )}
            {computed.isMember && (
              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 rounded-full font-medium">
                Member
              </span>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
          <Link
            href={`/networks/${networkId}`}
            className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
          >
            Overview
          </Link>
          <Link
            href={`/networks/${networkId}/members`}
            className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Members ({activeMemberCount})
          </Link>
          <Link
            href={`/networks/${networkId}/runs`}
            className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Runs ({network.runHistory.length})
          </Link>
          <Link
            href={`/networks/${networkId}/settings`}
            className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Settings
          </Link>
        </nav>

        {/* Overview Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Network Info */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Network Info</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Status</dt>
                <dd><StatusBadge status={network.status} /></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Created</dt>
                <dd className="text-gray-900 dark:text-white">{formatDate(network.createdAt)}</dd>
              </div>
              {network.activatedAt && (
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Activated</dt>
                  <dd className="text-gray-900 dark:text-white">{formatDate(network.activatedAt)}</dd>
                </div>
              )}
              {network.dissolvedAt && (
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Dissolved</dt>
                  <dd className="text-gray-900 dark:text-white">{formatDate(network.dissolvedAt)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Creator</dt>
                <dd className="text-gray-900 dark:text-white font-mono text-xs">
                  {network.creatorNodeId.slice(0, 12)}...
                  {computed.isCreator && <span className="ml-1 text-purple-600 dark:text-purple-400">(you)</span>}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Active Members</dt>
                <dd className="text-gray-900 dark:text-white">{activeMemberCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Completed Runs</dt>
                <dd className="text-gray-900 dark:text-white">{completedRuns}</dd>
              </div>
            </dl>
          </div>

          {/* Manifest Hashes */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Spec Manifests</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Schema</dt>
                <dd className="text-gray-900 dark:text-white font-mono text-xs break-all mt-0.5">{network.manifest.schemaManifestHash}</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Computation</dt>
                <dd className="text-gray-900 dark:text-white font-mono text-xs break-all mt-0.5">{network.manifest.computationManifestHash}</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Governance</dt>
                <dd className="text-gray-900 dark:text-white font-mono text-xs break-all mt-0.5">{network.manifest.governanceManifestHash}</dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Economic</dt>
                <dd className="text-gray-900 dark:text-white font-mono text-xs break-all mt-0.5">{network.manifest.economicManifestHash}</dd>
              </div>
            </dl>
          </div>

          {/* Governance Summary */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Governance Summary</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Min Members</dt>
                <dd className="text-gray-900 dark:text-white">3</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Max Members</dt>
                <dd className="text-gray-900 dark:text-white">20</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Approval Threshold</dt>
                <dd className="text-gray-900 dark:text-white">Unanimous</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Run Policy</dt>
                <dd className="text-gray-900 dark:text-white">Any member can initiate</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Run Cooldown</dt>
                <dd className="text-gray-900 dark:text-white">24 hours</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Max Runs / Period</dt>
                <dd className="text-gray-900 dark:text-white">10 per 30 days</dd>
              </div>
            </dl>
          </div>

          {/* Quick Status */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Status</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">My Status</dt>
                <dd>
                  {computed.myMemberStatus ? (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      computed.myMemberStatus === 'active'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'
                    }`}>
                      {computed.myMemberStatus}
                    </span>
                  ) : (
                    <span className="text-gray-400">N/A</span>
                  )}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Pending Applicants</dt>
                <dd className="text-gray-900 dark:text-white">{pendingApplicants}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Active Run</dt>
                <dd className="text-gray-900 dark:text-white">
                  {computed.activeRun ? (
                    <Link
                      href={`/networks/${networkId}/runs/${computed.activeRun.runId}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {computed.activeRun.status} - {computed.activeRun.runId.slice(0, 16)}
                    </Link>
                  ) : (
                    'None'
                  )}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Budget Used</dt>
                <dd className="text-gray-900 dark:text-white">{computed.budgetUsed} / {computed.budgetMax} runs this period</dd>
              </div>
              {computed.cooldownRemainingMs > 0 && (
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Cooldown</dt>
                  <dd className="text-amber-600 dark:text-amber-400">
                    {Math.ceil(computed.cooldownRemainingMs / 3_600_000)}h remaining
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </main>
  );
}
