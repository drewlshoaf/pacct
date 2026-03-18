'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useNetworkDetail } from '@/app/hooks/useDiscovery';
import { getMockSpecs, type MockSpecDetail } from '@/lib/mock/mock-data';

export default function SettingsPage() {
  const params = useParams();
  const networkId = params.networkId as string;
  const { network, loading } = useNetworkDetail(networkId);
  const [showRawJson, setShowRawJson] = useState<Record<string, boolean>>({});
  const specs = getMockSpecs();

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

  function toggleRaw(specType: string) {
    setShowRawJson((prev) => ({ ...prev, [specType]: !prev[specType] }));
  }

  function handleExport() {
    const exportData = {
      networkId: network!.networkId,
      alias: network!.alias,
      manifest: network!.manifest,
      specs: specs.map((s) => ({ specType: s.specType, hash: s.hash, raw: s.raw })),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${network!.networkId}-specs.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <Link href={`/networks/${networkId}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">&larr; {network.alias}</Link>

        {/* Tabs */}
        <nav className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
          <Link href={`/networks/${networkId}`} className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">Overview</Link>
          <Link href={`/networks/${networkId}/members`} className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">Members</Link>
          <Link href={`/networks/${networkId}/runs`} className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">Runs</Link>
          <Link href={`/networks/${networkId}/settings`} className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400">Settings</Link>
        </nav>

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Network Specs</h1>
          <button
            onClick={handleExport}
            className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
          >
            Export Specs
          </button>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          These specs are immutable once the network is created. They define the contract all members agree to.
        </p>

        {/* Spec Cards */}
        {specs.map((spec) => (
          <div key={spec.specType} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">{spec.specType} Spec</h2>
                <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">{spec.hash}</p>
              </div>
              <button
                onClick={() => toggleRaw(spec.specType)}
                className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
              >
                {showRawJson[spec.specType] ? 'Show Summary' : 'Show Raw JSON'}
              </button>
            </div>

            {showRawJson[spec.specType] ? (
              <pre className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-xs font-mono text-gray-700 dark:text-gray-300 overflow-x-auto border border-gray-100 dark:border-gray-700">
                {JSON.stringify(spec.raw, null, 2)}
              </pre>
            ) : (
              <p className="text-sm text-gray-700 dark:text-gray-300">{spec.summary}</p>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
