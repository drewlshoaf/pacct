import { StatusBadge } from './StatusBadge';
import { PresenceIndicator } from './PresenceIndicator';

interface Member {
  node_id: string;
  status: string;
  joined_at: number;
}

interface PresenceInfo {
  node_id: string;
  last_heartbeat_at: number;
  lease_expires_at: number;
}

interface MemberListProps {
  members: Member[];
  presence?: PresenceInfo[];
}

export function MemberList({ members, presence = [] }: MemberListProps) {
  const presenceMap = new Map(presence.map((p) => [p.node_id, p]));

  return (
    <div>
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
                <th>Presence</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => {
                const p = presenceMap.get(m.node_id);
                return (
                  <tr key={m.node_id} className={i % 2 === 1 ? 'bg-[var(--pacct-bg-raised)]/30' : ''}>
                    <td>
                      <code className="text-xs font-mono" style={{ color: 'var(--pacct-text-secondary)' }}>{m.node_id}</code>
                    </td>
                    <td><StatusBadge status={m.status} /></td>
                    <td><PresenceIndicator online={!!p && p.lease_expires_at >= Date.now()} /></td>
                    <td className="text-sm" style={{ color: 'var(--pacct-text-muted)' }}>{new Date(m.joined_at).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
