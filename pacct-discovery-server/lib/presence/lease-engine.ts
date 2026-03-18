import { Pool } from 'pg';
import { PresenceRepository } from '../db/repositories/presence-repository';
import { EventRepository } from '../db/repositories/event-repository';
import { getInstanceId } from '../instance-id';

export interface LeaseEngineConfig {
  leaseTimeoutMs: number;        // how long a lease lasts (e.g., 90000 = 90s)
  sweepIntervalMs: number;       // how often to sweep expired leases (e.g., 15000 = 15s)
  staleThresholdMs?: number;     // optional: mark as stale before fully offline (e.g., 60000)
}

export class LeaseEngine {
  private sweepInterval?: ReturnType<typeof setInterval>;
  private presenceRepo: PresenceRepository;
  private eventRepo: EventRepository;
  private config: LeaseEngineConfig;

  constructor(pool: Pool, config: LeaseEngineConfig) {
    this.presenceRepo = new PresenceRepository(pool);
    this.eventRepo = new EventRepository(pool);
    this.config = config;
  }

  // Process a heartbeat from a node
  async processHeartbeat(networkId: string, nodeId: string): Promise<{
    leaseExpiresAt: number;
    instanceId: string;
  }> {
    const now = Date.now();
    const leaseExpiresAt = now + this.config.leaseTimeoutMs;
    const instanceId = getInstanceId();

    // Check if this is a new lease or renewal
    const existing = await this.presenceRepo.getPresence(networkId, nodeId);
    const wasOffline = !existing || existing.lease_expires_at < now;

    // Upsert presence lease
    await this.presenceRepo.upsertPresence(networkId, nodeId, now, leaseExpiresAt, instanceId);

    // Log event if coming online
    if (wasOffline) {
      await this.eventRepo.logEvent({
        networkId,
        eventType: 'presence:node_online',
        nodeId,
        payload: { instanceId, leaseExpiresAt },
      });
    }

    return { leaseExpiresAt, instanceId };
  }

  // Start periodic sweep for expired leases
  startSweep(): void {
    this.sweepInterval = setInterval(() => this.sweepExpired(), this.config.sweepIntervalMs);
  }

  stopSweep(): void {
    if (this.sweepInterval) {
      clearInterval(this.sweepInterval);
      this.sweepInterval = undefined;
    }
  }

  // Sweep expired leases and mark nodes offline
  async sweepExpired(): Promise<string[]> {
    const now = Date.now();
    // Only sweep leases that are actually expired (lease_expires_at > 0 means they haven't been swept yet)
    const expired = await this.presenceRepo.getExpiredLeases(now);
    const offlineNodeIds: string[] = [];

    for (const lease of expired) {
      // Skip already-swept leases (lease_expires_at === 0)
      if (lease.lease_expires_at === 0) continue;

      // Mark offline by setting lease_expires_at to 0
      await this.presenceRepo.setOffline(lease.network_id, lease.node_id);

      // Log offline event
      await this.eventRepo.logEvent({
        networkId: lease.network_id,
        eventType: 'presence:node_offline',
        nodeId: lease.node_id,
        payload: { reason: 'lease_expired', lastHeartbeatAt: lease.last_heartbeat_at },
      });

      offlineNodeIds.push(lease.node_id);
    }

    return offlineNodeIds;
  }

  // Get computed availability for a node
  async getNodeAvailability(networkId: string, nodeId: string): Promise<'online' | 'stale' | 'offline' | 'unknown'> {
    const lease = await this.presenceRepo.getPresence(networkId, nodeId);
    if (!lease) return 'unknown';

    const now = Date.now();
    if (lease.lease_expires_at < now) return 'offline';

    if (this.config.staleThresholdMs) {
      const timeSinceHeartbeat = now - lease.last_heartbeat_at;
      if (timeSinceHeartbeat > this.config.staleThresholdMs) return 'stale';
    }

    return 'online';
  }

  // Get all presence for a network with computed availability
  async getNetworkPresenceWithAvailability(networkId: string): Promise<Array<{
    nodeId: string;
    availability: string;
    lastHeartbeatAt: number;
    leaseExpiresAt: number;
    instanceId?: string;
  }>> {
    const leases = await this.presenceRepo.getNetworkPresence(networkId);
    const now = Date.now();

    return leases.map(lease => {
      let availability: string = 'online';
      if (lease.lease_expires_at < now) {
        availability = 'offline';
      } else if (this.config.staleThresholdMs && (now - lease.last_heartbeat_at) > this.config.staleThresholdMs) {
        availability = 'stale';
      }

      return {
        nodeId: lease.node_id,
        availability,
        lastHeartbeatAt: lease.last_heartbeat_at,
        leaseExpiresAt: lease.lease_expires_at,
        instanceId: lease.instance_id ?? undefined,
      };
    });
  }
}
