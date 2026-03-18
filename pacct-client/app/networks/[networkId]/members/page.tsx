'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useNetworkDetail, usePresence, useApplicants } from '@/app/hooks/useDiscovery';
import { useNetworkState } from '@/app/hooks/useNetworkState';
import { MemberStatus, ApplicantStatus } from '@pacct/protocol-ts';

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

function MemberStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    offline: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    pending_reack: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
    left: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-400',
    expelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

export default function MembersPage() {
  const params = useParams();
  const networkId = params.networkId as string;
  const { network, loading } = useNetworkDetail(networkId);
  const computed = useNetworkState(network);
  const { presence } = usePresence(networkId);
  const { applicants } = useApplicants(networkId);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

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

  const presenceMap = new Map(presence.map((p) => [p.nodeId, p]));

  const activeMembers = network.members.filter(
    (m) => m.status !== MemberStatus.Left && m.status !== MemberStatus.Expelled,
  );
  const formerMembers = network.members.filter(
    (m) => m.status === MemberStatus.Left || m.status === MemberStatus.Expelled,
  );
  const pendingApplicants = applicants.filter(
    (a) => a.status === ApplicantStatus.PendingApproval || a.status === ApplicantStatus.Submitted,
  );

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <Link href={`/networks/${networkId}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">&larr; {network.alias}</Link>

        {/* Tabs */}
        <nav className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
          <Link href={`/networks/${networkId}`} className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">Overview</Link>
          <Link href={`/networks/${networkId}/members`} className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400">Members</Link>
          <Link href={`/networks/${networkId}/runs`} className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">Runs</Link>
          <Link href={`/networks/${networkId}/settings`} className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">Settings</Link>
        </nav>

        {/* Active Members */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Active Members <span className="text-sm font-normal text-gray-400">({activeMembers.length})</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                  <th className="pb-2 pr-4">Node ID</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Presence</th>
                  <th className="pb-2 pr-4">Joined</th>
                  <th className="pb-2">Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {activeMembers.map((m) => {
                  const p = presenceMap.get(m.nodeId);
                  return (
                    <tr key={m.nodeId} className="border-b border-gray-50 dark:border-gray-800 last:border-0">
                      <td className="py-3 pr-4">
                        <code className="text-xs font-mono text-gray-900 dark:text-white">{m.nodeId.slice(0, 16)}...</code>
                        {m.nodeId === network.creatorNodeId && (
                          <span className="ml-1 text-xs text-purple-600 dark:text-purple-400">(creator)</span>
                        )}
                        {m.nodeId === computed.myMemberStatus && (
                          <span className="ml-1 text-xs text-blue-600 dark:text-blue-400">(you)</span>
                        )}
                      </td>
                      <td className="py-3 pr-4"><MemberStatusBadge status={m.status} /></td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs ${p?.online ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                          <span className={`w-2 h-2 rounded-full ${p?.online ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                          {p?.online ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-gray-500 dark:text-gray-400 text-xs">{formatDate(m.joinedAt)}</td>
                      <td className="py-3 text-gray-500 dark:text-gray-400 text-xs">{p ? formatTimeAgo(p.lastSeen) : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Applicants (for creator) */}
        {computed.isCreator && pendingApplicants.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Pending Applicants <span className="text-sm font-normal text-gray-400">({pendingApplicants.length})</span>
            </h2>
            <div className="space-y-3">
              {pendingApplicants.map((a) => (
                <div key={a.nodeId} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                  <div>
                    <code className="text-xs font-mono text-gray-900 dark:text-white">{a.nodeId.slice(0, 16)}...</code>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Applied {formatDate(a.appliedAt)} — {a.votes.length} vote(s) cast
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => alert('Mock: Vote to approve ' + a.nodeId.slice(0, 8))}
                      className="px-3 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => alert('Mock: Vote to reject ' + a.nodeId.slice(0, 8))}
                      className="px-3 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Former Members */}
        {formerMembers.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Former Members <span className="text-sm font-normal text-gray-400">({formerMembers.length})</span>
            </h2>
            <div className="space-y-2">
              {formerMembers.map((m) => (
                <div key={m.nodeId} className="flex items-center justify-between py-2 text-sm">
                  <code className="text-xs font-mono text-gray-500 dark:text-gray-400">{m.nodeId.slice(0, 16)}...</code>
                  <div className="flex items-center gap-3">
                    <MemberStatusBadge status={m.status} />
                    {m.leftAt && <span className="text-xs text-gray-400">{formatDate(m.leftAt)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leave Network */}
        {computed.canLeave && (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-red-200 dark:border-red-900 p-6">
            {showLeaveConfirm ? (
              <div>
                <p className="text-sm text-gray-900 dark:text-white mb-3">
                  Are you sure you want to leave <strong>{network.alias}</strong>? This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => alert('Mock: Left network ' + networkId)}
                    className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    Confirm Leave
                  </button>
                  <button
                    onClick={() => setShowLeaveConfirm(false)}
                    className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-400">Leave Network</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Permanently leave this network.</p>
                </div>
                <button
                  onClick={() => setShowLeaveConfirm(true)}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Leave Network
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
