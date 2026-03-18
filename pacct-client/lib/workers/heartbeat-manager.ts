export interface HeartbeatConfig {
  intervalMs: number;
  staleThresholdMs: number;
}

export class HeartbeatManager {
  private intervalId?: ReturnType<typeof setInterval>;
  private peerLastSeen: Map<string, number> = new Map();
  private stalePeers: Set<string> = new Set();
  private onStaleHandler?: (nodeId: string) => void;
  private onRecoveredHandler?: (nodeId: string) => void;

  constructor(private config: HeartbeatConfig) {}

  start(sendHeartbeat: () => void): void {
    this.stop();
    this.intervalId = setInterval(() => {
      sendHeartbeat();
      this.checkStalePeers(Date.now());
    }, this.config.intervalMs);
  }

  stop(): void {
    if (this.intervalId !== undefined) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  recordHeartbeat(nodeId: string, timestamp: number): void {
    this.peerLastSeen.set(nodeId, timestamp);

    if (this.stalePeers.has(nodeId)) {
      this.stalePeers.delete(nodeId);
      if (this.onRecoveredHandler) {
        this.onRecoveredHandler(nodeId);
      }
    }
  }

  getStalePeers(now: number): string[] {
    const stale: string[] = [];
    for (const [nodeId, lastSeen] of this.peerLastSeen) {
      if (now - lastSeen >= this.config.staleThresholdMs) {
        stale.push(nodeId);
      }
    }
    return stale;
  }

  isPeerStale(nodeId: string, now: number): boolean {
    const lastSeen = this.peerLastSeen.get(nodeId);
    if (lastSeen === undefined) return true;
    return now - lastSeen >= this.config.staleThresholdMs;
  }

  onPeerBecameStale(handler: (nodeId: string) => void): void {
    this.onStaleHandler = handler;
  }

  onPeerRecoveredFromStale(handler: (nodeId: string) => void): void {
    this.onRecoveredHandler = handler;
  }

  private checkStalePeers(now: number): void {
    for (const [nodeId, lastSeen] of this.peerLastSeen) {
      const isStale = now - lastSeen >= this.config.staleThresholdMs;

      if (isStale && !this.stalePeers.has(nodeId)) {
        this.stalePeers.add(nodeId);
        if (this.onStaleHandler) {
          this.onStaleHandler(nodeId);
        }
      }
    }
  }
}
