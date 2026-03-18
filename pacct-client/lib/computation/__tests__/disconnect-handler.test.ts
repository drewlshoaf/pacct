import { describe, it, expect, vi } from 'vitest';
import { RunDisconnectHandler } from '../disconnect-handler';

function createMockPeerManager() {
  const handlers: ((peerNodeId: string) => void)[] = [];
  return {
    onPeerDisconnected(handler: (peerNodeId: string) => void) {
      handlers.push(handler);
    },
    simulateDisconnect(peerId: string) {
      for (const h of handlers) h(peerId);
    },
  };
}

describe('RunDisconnectHandler', () => {
  it('calls onDisconnect when a required peer disconnects', () => {
    const pm = createMockPeerManager();
    const onDisconnect = vi.fn();

    const handler = new RunDisconnectHandler(pm, ['peer-a', 'peer-b'], onDisconnect);
    handler.startMonitoring();

    pm.simulateDisconnect('peer-a');
    expect(onDisconnect).toHaveBeenCalledWith('peer-a');
    expect(onDisconnect).toHaveBeenCalledTimes(1);
  });

  it('ignores disconnects of non-required peers', () => {
    const pm = createMockPeerManager();
    const onDisconnect = vi.fn();

    const handler = new RunDisconnectHandler(pm, ['peer-a'], onDisconnect);
    handler.startMonitoring();

    pm.simulateDisconnect('peer-z');
    expect(onDisconnect).not.toHaveBeenCalled();
  });

  it('does not call onDisconnect after stopMonitoring', () => {
    const pm = createMockPeerManager();
    const onDisconnect = vi.fn();

    const handler = new RunDisconnectHandler(pm, ['peer-a'], onDisconnect);
    handler.startMonitoring();
    handler.stopMonitoring();

    pm.simulateDisconnect('peer-a');
    expect(onDisconnect).not.toHaveBeenCalled();
  });

  it('handles multiple required peers', () => {
    const pm = createMockPeerManager();
    const onDisconnect = vi.fn();

    const handler = new RunDisconnectHandler(pm, ['peer-a', 'peer-b', 'peer-c'], onDisconnect);
    handler.startMonitoring();

    pm.simulateDisconnect('peer-b');
    expect(onDisconnect).toHaveBeenCalledWith('peer-b');

    pm.simulateDisconnect('peer-c');
    expect(onDisconnect).toHaveBeenCalledWith('peer-c');
    expect(onDisconnect).toHaveBeenCalledTimes(2);
  });

  it('startMonitoring is idempotent', () => {
    const pm = createMockPeerManager();
    const onDisconnect = vi.fn();

    const handler = new RunDisconnectHandler(pm, ['peer-a'], onDisconnect);
    handler.startMonitoring();
    handler.startMonitoring(); // should not double-register

    pm.simulateDisconnect('peer-a');
    // Should only be called once, not twice
    expect(onDisconnect).toHaveBeenCalledTimes(1);
  });
});
