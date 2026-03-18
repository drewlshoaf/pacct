import { notFound } from 'next/navigation';
import { getNetworkRepo, getMemberRepo, getApplicantRepo, getManifestRepo, getPresenceRepo, getEventRepo } from '@/lib/db/instance';
import { StatusBadge } from '@/app/components/StatusBadge';
import { MemberList } from '@/app/components/MemberList';
import { ApplicantList } from '@/app/components/ApplicantList';
import { EventLog } from '@/app/components/EventLog';

export const dynamic = 'force-dynamic';

export default async function NetworkDetailPage({ params }: { params: Promise<{ networkId: string }> }) {
  const { networkId } = await params;
  const network = getNetworkRepo().getNetwork(networkId);

  if (!network) {
    notFound();
  }

  const members = getMemberRepo().getMembers(networkId);
  const applicants = getApplicantRepo().getApplicants(networkId);
  const specManifests = getManifestRepo().getSpecManifests(networkId);
  const networkManifest = getManifestRepo().getNetworkManifest(networkId);
  const presence = getPresenceRepo().getNetworkPresence(networkId);
  const events = getEventRepo().getEvents(networkId, 20);

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6">
        <a href="/" className="text-sm hover:underline" style={{ color: 'var(--pacct-text-muted)' }}>
          &larr; Dashboard
        </a>
      </div>

      {/* Network header */}
      <div className="card mb-6">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--pacct-text)' }}>{network.alias}</h1>
          <StatusBadge status={network.status} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="block text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--pacct-text-muted)' }}>Network ID</span>
            <code className="text-xs font-mono break-all" style={{ color: 'var(--pacct-text-secondary)' }}>{network.id}</code>
          </div>
          <div>
            <span className="block text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--pacct-text-muted)' }}>Creator</span>
            <code className="text-xs font-mono break-all" style={{ color: 'var(--pacct-text-secondary)' }}>{network.creator_node_id}</code>
          </div>
          <div>
            <span className="block text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--pacct-text-muted)' }}>Created</span>
            <span style={{ color: 'var(--pacct-text-secondary)' }}>{new Date(network.created_at).toLocaleString()}</span>
          </div>
          <div>
            <span className="block text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--pacct-text-muted)' }}>Config</span>
            <div className="space-y-0.5" style={{ color: 'var(--pacct-text-secondary)' }}>
              <div>Visibility: {network.visibility_mode}</div>
              <div>Min Active: {network.min_active_members}</div>
              {network.activated_at && <div>Activated: {new Date(network.activated_at).toLocaleString()}</div>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Members */}
        <div className="card">
          <MemberList members={members} presence={presence} />
        </div>

        {/* Applicants */}
        <div className="card">
          <ApplicantList applicants={applicants} />
        </div>
      </div>

      {/* Manifests */}
      <div className="card mt-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--pacct-text)' }}>Manifest Hashes</h3>
        {networkManifest ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(['schema_hash', 'computation_hash', 'governance_hash', 'economic_hash'] as const).map((key) => (
              <div key={key} className="p-3 rounded-lg" style={{ background: 'var(--pacct-bg-raised)', border: '1px solid var(--pacct-border)' }}>
                <span className="block text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--pacct-text-muted)' }}>
                  {key.replace('_hash', '').replace('_', ' ')}
                </span>
                <code className="text-xs font-mono break-all" style={{ color: 'var(--pacct-text-secondary)' }}>
                  {networkManifest[key]}
                </code>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm italic" style={{ color: 'var(--pacct-text-muted)' }}>No network manifest</p>
        )}
        {specManifests.length > 0 && (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--pacct-border)' }}>
            <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--pacct-text-secondary)' }}>Spec Manifests</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {specManifests.map((sm) => (
                <div key={sm.spec_type} className="flex items-center justify-between p-2 rounded" style={{ background: 'var(--pacct-bg-raised)' }}>
                  <span className="text-sm font-medium" style={{ color: 'var(--pacct-text)' }}>{sm.spec_type}</span>
                  <span className="flex items-center gap-2">
                    <code className="text-xs font-mono" style={{ color: 'var(--pacct-text-muted)' }}>{sm.hash}</code>
                    <span className="badge badge-neutral text-xs">v{sm.version}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Events */}
      <div className="card mt-6">
        <EventLog events={events} />
      </div>
    </div>
  );
}
