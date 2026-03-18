'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useDiscoverableNetworks } from '@/app/hooks/useDiscovery';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function VisibilityBadge({ mode }: { mode: string }) {
  const colors: Record<string, string> = {
    full: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    partial: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
    none: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors[mode] ?? 'bg-gray-100 text-gray-600'}`}>
      {mode} visibility
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    pending: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

export default function JoinPage() {
  const { networks, loading, refresh } = useDiscoverableNetworks();
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return networks;
    const q = searchQuery.toLowerCase();
    return networks.filter(
      (n) =>
        n.alias.toLowerCase().includes(q) ||
        n.networkId.toLowerCase().includes(q),
    );
  }, [networks, searchQuery]);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-1 inline-block">&larr; Dashboard</Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Join a Network</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Browse available networks from the discovery server.</p>
          </div>
          <button
            onClick={refresh}
            className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
          >
            Refresh
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search networks by name or ID..."
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
          />
        </div>

        {loading ? (
          <div className="text-gray-500 dark:text-gray-400">Searching for networks...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No networks match your search.' : 'No networks available to join.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((net) => (
              <div
                key={net.networkId}
                className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">{net.alias}</h3>
                      <StatusBadge status={net.status} />
                      <VisibilityBadge mode={net.visibilityMode} />
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mb-2">{net.networkId}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                      <span>{net.memberCount} members</span>
                      <span>Created {formatDate(net.createdAt)}</span>
                      <span>Creator: {net.creatorNodeId.slice(0, 12)}...</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {net.alreadyApplied ? (
                      <div className="text-right">
                        <span className="inline-block px-3 py-1.5 text-sm bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 rounded-lg font-medium">
                          {net.applicationStatus?.replace(/_/g, ' ')}
                        </span>
                        <Link
                          href={`/join/${net.networkId}`}
                          className="block mt-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          View application
                        </Link>
                      </div>
                    ) : (
                      <Link
                        href={`/join/${net.networkId}`}
                        className="inline-block px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        Apply
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
