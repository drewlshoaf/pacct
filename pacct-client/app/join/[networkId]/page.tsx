'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useDiscoverableNetworkDetail } from '@/app/hooks/useDiscovery';
import { getMockSpecs } from '@/lib/mock/mock-data';
import { ApplicantStatus } from '@pacct/protocol-ts';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function JoinNetworkPage() {
  const params = useParams();
  const networkId = params.networkId as string;
  const { network, loading } = useDiscoverableNetworkDetail(networkId);
  const [applied, setApplied] = useState(false);
  const specs = getMockSpecs();

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
        <div className="max-w-4xl mx-auto text-gray-500 dark:text-gray-400">Loading...</div>
      </main>
    );
  }

  if (!network) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
        <div className="max-w-4xl mx-auto">
          <Link href="/join" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">&larr; Browse Networks</Link>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Network not found.</p>
        </div>
      </main>
    );
  }

  const isApplied = applied || network.alreadyApplied;
  const isPendingApproval = network.applicationStatus === ApplicantStatus.PendingApproval;
  const isApprovedPending = network.applicationStatus === ApplicantStatus.ApprovedPendingAcceptance;

  // Visibility rendering
  function renderSpecsByVisibility() {
    if (network!.visibilityMode === 'full') {
      return (
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Full Spec Details</h3>
          {specs.map((spec) => (
            <div key={spec.specType} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white capitalize mb-1">{spec.specType}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{spec.summary}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-1">Hash: {spec.hash}</p>
            </div>
          ))}
        </div>
      );
    }

    if (network!.visibilityMode === 'partial') {
      return (
        <div className="space-y-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Partial Spec Details</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Some spec sections are restricted before approval.</p>
          {specs.map((spec) => {
            const isVisible = spec.specType === 'governance' || spec.specType === 'economic';
            return (
              <div key={spec.specType} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-700">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white capitalize mb-1">
                  {spec.specType}
                  {!isVisible && (
                    <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">(summary only)</span>
                  )}
                </h4>
                {isVisible ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400">{spec.summary}</p>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                    Details available after approval. Type: {spec.specType}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // None
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-100 dark:border-gray-700 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          This network has restricted visibility. Spec details are only available after approval.
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          Visibility mode: none — Join requires approval from existing members.
        </p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link href="/join" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">&larr; Browse Networks</Link>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{network.alias}</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-1">{network.networkId}</p>
        </div>

        {/* Network Meta */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Network Information</h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Status</dt>
              <dd className="text-gray-900 dark:text-white mt-0.5">
                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                  {network.status}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Members</dt>
              <dd className="text-gray-900 dark:text-white mt-0.5">{network.memberCount}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Created</dt>
              <dd className="text-gray-900 dark:text-white mt-0.5">{formatDate(network.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Visibility</dt>
              <dd className="text-gray-900 dark:text-white mt-0.5 capitalize">{network.visibilityMode}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Creator</dt>
              <dd className="text-gray-900 dark:text-white mt-0.5 font-mono text-xs">{network.creatorNodeId.slice(0, 16)}...</dd>
            </div>
          </dl>
        </div>

        {/* Spec Visibility */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          {renderSpecsByVisibility()}
        </div>

        {/* Application Status or Form */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          {isApprovedPending ? (
            <div>
              <h2 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-3">Application Approved</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Your application has been approved. Review the full contract below and accept to join the network.
              </p>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800 mb-4">
                <h3 className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">Full Contract Reveal</h3>
                {specs.map((spec) => (
                  <div key={spec.specType} className="mb-2">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize">{spec.specType}:</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400 ml-1">{spec.summary}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => alert('Mock: Accepted contract and joined network ' + networkId)}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Accept & Join
              </button>
            </div>
          ) : isApplied || isPendingApproval ? (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Application Submitted</h2>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                  {network.applicationStatus?.replace(/_/g, ' ') ?? 'pending approval'}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Your application is being reviewed by the network members. You will be notified when a decision is made.
              </p>
            </div>
          ) : (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Apply to Join</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Submit an application to join this network. Existing members will vote on your application.
              </p>
              <button
                onClick={() => {
                  setApplied(true);
                  alert('Mock: Application submitted for network ' + networkId);
                }}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Submit Application
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
