import { notFound } from 'next/navigation';
import { getNetworkRepo, getMemberRepo, getApplicantRepo, getManifestRepo, getPresenceRepo, getEventRepo } from '@/lib/db/instance';
import { StatusBadge } from '@/app/components/StatusBadge';
import { AvailabilityBadge } from '@/app/components/AvailabilityBadge';
import { ApplicantList } from '@/app/components/ApplicantList';
import { EventLog } from '@/app/components/EventLog';
import { PresenceDetail } from './PresenceDetail';

export const dynamic = 'force-dynamic';

export default async function NetworkDetailPage({ params }: { params: Promise<{ networkId: string }> }) {
  const { networkId } = await params;
  const network = await getNetworkRepo().getNetwork(networkId);

  if (!network) {
    notFound();
  }

  const members = await getMemberRepo().getMembers(networkId);
  const applicants = await getApplicantRepo().getApplicants(networkId);
  const specManifests = await getManifestRepo().getSpecManifests(networkId);
  const networkManifest = await getManifestRepo().getNetworkManifest(networkId);
  const presence = await getPresenceRepo().getNetworkPresence(networkId);
  const events = await getEventRepo().getEvents(networkId, 20);

  const presenceMap = new Map(presence.map((p) => [p.node_id, p]));
  const now = Date.now();

  function getAvailability(nodeId: string): 'online' | 'stale' | 'offline' | 'unknown' {
    const p = presenceMap.get(nodeId);
    if (!p) return 'unknown';
    if (p.lease_expires_at < now) return 'offline';
    if (p.lease_expires_at - now < 10_000) return 'stale';
    return 'online';
  }

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
        {/* Members with presence */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--pacct-text)' }}>
            Members
            <span className="ml-2 text-sm font-normal" style={{ color: 'var(--pacct-text-muted)' }}>({members.length})</span>
          </h3>
          {members.length === 0 ? (
            <p className="text-sm italic" style={{ color: 'var(--pacct-text-muted)' }}>No members</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-ds">
                <thead>
                  <tr>
                    <th>Node ID</th>
                    <th>Status</th>
                    <th>Availability</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m, i) => {
                    const p = presenceMap.get(m.node_id);
                    const availability = getAvailability(m.node_id);
                    return (
                      <tr key={m.node_id} className={i % 2 === 1 ? 'bg-[var(--pacct-bg-raised)]/30' : ''}>
                        <td>
                          <code className="text-xs font-mono" style={{ color: 'var(--pacct-text-secondary)' }}>{m.node_id}</code>
                        </td>
                        <td><StatusBadge status={m.status} /></td>
                        <td><AvailabilityBadge availability={availability} /></td>
                        <td className="text-sm" style={{ color: 'var(--pacct-text-muted)' }}>{new Date(m.joined_at).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Applicants */}
        <div className="card">
          <ApplicantList applicants={applicants} />
        </div>
      </div>

      {/* Presence detail (client component for live updates) */}
      <div className="card mt-6">
        <PresenceDetail
          presence={presence.map((p) => ({
            node_id: p.node_id,
            last_heartbeat_at: p.last_heartbeat_at,
            lease_expires_at: p.lease_expires_at,
            instance_id: p.instance_id,
          }))}
        />
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
