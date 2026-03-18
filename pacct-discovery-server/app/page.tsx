import { getNetworkRepo, getMemberRepo } from '@/lib/db/instance';
import { NetworkCard } from './components/NetworkCard';
import { HealthIndicator } from './components/HealthIndicator';
import { checkDbHealth } from '@/lib/db/pool';
import { getInstanceId } from '@/lib/instance-id';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const networks = await getNetworkRepo().listNetworks();
  const memberRepo = getMemberRepo();
  const dbHealth = await checkDbHealth();
  const instanceId = getInstanceId();

  const networksWithMembers = await Promise.all(
    networks.map(async (n) => {
      const members = await memberRepo.getMembers(n.id);
      return { network: n, memberCount: members.length };
    }),
  );

  const healthStatus = dbHealth.connected ? 'healthy' : 'unhealthy';

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--pacct-text)' }}>
            Dashboard
          </h1>
          <HealthIndicator status={healthStatus} />
          <span className="badge badge-neutral text-xs font-mono" title="Instance ID">
            {instanceId.slice(0, 8)}
          </span>
        </div>
        <p className="text-sm" style={{ color: 'var(--pacct-text-muted)' }}>
          {networks.length} network{networks.length !== 1 ? 's' : ''} registered
        </p>
      </div>

      {/* Quick links */}
      <div className="flex gap-3 mb-6">
        <a
          href="/health"
          className="card flex items-center gap-2 py-3 px-4 no-underline transition-colors hover:border-coral-300 dark:hover:border-coral-700"
        >
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${dbHealth.connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm font-medium" style={{ color: 'var(--pacct-text-secondary)' }}>Service Health</span>
        </a>
        <a
          href="/presence"
          className="card flex items-center gap-2 py-3 px-4 no-underline transition-colors hover:border-coral-300 dark:hover:border-coral-700"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--pacct-text-muted)' }}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span className="text-sm font-medium" style={{ color: 'var(--pacct-text-secondary)' }}>Node Presence</span>
        </a>
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
          {networksWithMembers.map(({ network: n, memberCount }) => (
            <NetworkCard
              key={n.id}
              id={n.id}
              alias={n.alias}
              status={n.status}
              creator_node_id={n.creator_node_id}
              created_at={n.created_at}
              memberCount={memberCount}
            />
          ))}
        </div>
      )}
    </div>
  );
}
