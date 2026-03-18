/**
 * Monitors peer connections during a computation run and triggers
 * a callback if a required peer disconnects.
 */

export interface DisconnectMonitorablePeerManager {
  onPeerDisconnected(handler: (peerNodeId: string) => void): void;
}

export class RunDisconnectHandler {
  private active = false;

  constructor(
    private peerManager: DisconnectMonitorablePeerManager,
    private requiredPeers: string[],
    private onDisconnect: (peerNodeId: string) => void,
  ) {}

  startMonitoring(): void {
    if (this.active) return;
    this.active = true;

    this.peerManager.onPeerDisconnected((peerNodeId: string) => {
      if (!this.active) return;
      if (this.requiredPeers.includes(peerNodeId)) {
        this.onDisconnect(peerNodeId);
      }
    });
  }

  stopMonitoring(): void {
    this.active = false;
  }
}
