export enum DiscoveryHealthStatus {
  Healthy = 'healthy',
  Degraded = 'degraded',
  Unhealthy = 'unhealthy',
}

export interface DiscoveryInstanceHealth {
  instanceId: string;
  status: DiscoveryHealthStatus;
  uptime: number;           // ms since start
  startedAt: number;
  dbConnected: boolean;
  dbLatencyMs?: number;
  activeWebSockets: number;
  lastHeartbeatProcessedAt?: number;
  version: string;
}

export interface DiscoveryServiceHealth {
  overallStatus: DiscoveryHealthStatus;
  instances: DiscoveryInstanceHealth[];
  dbStatus: {
    connected: boolean;
    latencyMs?: number;
    poolSize?: number;
    activeConnections?: number;
  };
  presenceStats: {
    totalLeases: number;
    onlineNodes: number;
    offlineNodes: number;
    staleNodes: number;
  };
  checkedAt: number;
}
