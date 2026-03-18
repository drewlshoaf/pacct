'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useNodeIdentity } from '@/app/hooks/useNodeIdentity';

export default function SettingsPage() {
  const { identity, nodeId, loading, error, copyNodeId, regenerateKeypair } = useNodeIdentity();
  const [copied, setCopied] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [discoveryUrl, setDiscoveryUrl] = useState('http://localhost:3001');
  const [savedUrl, setSavedUrl] = useState(false);

  async function handleCopy() {
    await copyNodeId();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRegen() {
    await regenerateKeypair();
    setShowRegenConfirm(false);
  }

  function handleSaveUrl() {
    // In production, this would persist to storage
    setSavedUrl(true);
    setTimeout(() => setSavedUrl(false), 2000);
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link href="/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-1 inline-block">&larr; Dashboard</Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Node Settings</h1>
        </div>

        {loading ? (
          <div className="text-gray-500 dark:text-gray-400">Loading...</div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        ) : (
          <>
            {/* Node Identity */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Node Identity</h2>
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">Node ID</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg text-sm font-mono text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 overflow-x-auto">
                    {nodeId}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700 whitespace-nowrap"
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">Public Key</label>
                <code className="block mt-1 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg text-sm font-mono text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 overflow-x-auto">
                  {identity?.publicKey}
                </code>
              </div>
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400">Created</label>
                <p className="text-sm text-gray-900 dark:text-white mt-1">
                  {identity?.createdAt ? new Date(identity.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '-'}
                </p>
              </div>
            </div>

            {/* Keypair Management */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-red-200 dark:border-red-900 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Regenerate Keypair</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                This will create a new node identity. You will lose access to all networks associated with your current identity.
                This action cannot be undone.
              </p>
              {showRegenConfirm ? (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-700 dark:text-red-400 mb-3">
                    <strong>Warning:</strong> Regenerating your keypair will permanently change your node identity.
                    All existing network memberships will be invalidated.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleRegen}
                      className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                    >
                      Confirm Regenerate
                    </button>
                    <button
                      onClick={() => setShowRegenConfirm(false)}
                      className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowRegenConfirm(true)}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Regenerate Keypair
                </button>
              )}
            </div>

            {/* Storage Mode */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Storage</h2>
              <div className="flex items-center gap-3 mb-2">
                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                  Memory (In-Browser)
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Data is stored in memory and will be lost when you close the browser.
                IndexedDB and server-side SQLite adapters are available for persistent storage.
              </p>
            </div>

            {/* Discovery Server */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Discovery Server</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                URL of the PACCT discovery server used for network registration and member coordination.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={discoveryUrl}
                  onChange={(e) => setDiscoveryUrl(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                />
                <button
                  onClick={handleSaveUrl}
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  {savedUrl ? 'Saved' : 'Save'}
                </button>
              </div>
            </div>

            {/* Version Info */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">About</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">PACCT Client</dt>
                  <dd className="text-gray-900 dark:text-white">v0.1.0</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Protocol</dt>
                  <dd className="text-gray-900 dark:text-white">@pacct/protocol-ts</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Runtime</dt>
                  <dd className="text-gray-900 dark:text-white">Next.js 14 + React 18</dd>
                </div>
              </dl>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
