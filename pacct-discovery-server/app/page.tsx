import { getNetworkRepo, getMemberRepo } from '@/lib/db/instance';
import { NetworkCard } from './components/NetworkCard';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const networks = getNetworkRepo().listNetworks();
  const memberRepo = getMemberRepo();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--pacct-text)' }}>
          Dashboard
        </h1>
        <p className="text-sm" style={{ color: 'var(--pacct-text-muted)' }}>
          {networks.length} network{networks.length !== 1 ? 's' : ''} registered
        </p>
      </div>

      {networks.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-lg mb-2" style={{ color: 'var(--pacct-text-muted)' }}>No networks registered yet</p>
          <p className="text-sm" style={{ color: 'var(--pacct-text-muted)' }}>
            Networks will appear here when nodes register via the API.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {networks.map((n) => {
            const members = memberRepo.getMembers(n.id);
            return (
              <NetworkCard
                key={n.id}
                id={n.id}
                alias={n.alias}
                status={n.status}
                creator_node_id={n.creator_node_id}
                created_at={n.created_at}
                memberCount={members.length}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
