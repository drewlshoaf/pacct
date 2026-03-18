import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PeerConnection } from '../peer-connection';
import type { IRTCPeerConnection, IRTCDataChannel } from '../peer-connection';
import type { NodeId } from '@pacct/protocol-ts';

function createMockDataChannel(readyState = 'open'): IRTCDataChannel {
  return {
    send: vi.fn(),
    close: vi.fn(),
    readyState,
    onmessage: null,
    onclose: null,
  };
}

function createMockRTCConnection(): IRTCPeerConnection {
  return {
    close: vi.fn(),
    connectionState: 'connected',
  };
}

describe('PeerConnection', () => {
  const peerId = 'peer-node-1' as NodeId;
  let dc: IRTCDataChannel;
  let rtc: IRTCPeerConnection;
  let conn: PeerConnection;

  beforeEach(() => {
    dc = createMockDataChannel();
    rtc = createMockRTCConnection();
    conn = new PeerConnection(peerId, rtc, dc);
  });

  it('isOpen returns true when data channel is open', () => {
    expect(conn.isOpen).toBe(true);
  });

  it('isOpen returns false when data channel is not open', () => {
    const closedDc = createMockDataChannel('closed');
    const c = new PeerConnection(peerId, rtc, closedDc);
    expect(c.isOpen).toBe(false);
  });

  it('send calls dataChannel.send', () => {
    conn.send('hello');
    expect(dc.send).toHaveBeenCalledWith('hello');
  });

  it('send with ArrayBuffer', () => {
    const buf = new ArrayBuffer(4);
    conn.send(buf);
    expect(dc.send).toHaveBeenCalledWith(buf);
  });

  it('send throws when channel is not open', () => {
    const closedDc = createMockDataChannel('closed');
    const c = new PeerConnection(peerId, rtc, closedDc);
    expect(() => c.send('nope')).toThrow('not open');
  });

  it('close closes both data channel and RTC connection', () => {
    conn.close();
    expect(dc.close).toHaveBeenCalled();
    expect(rtc.close).toHaveBeenCalled();
  });

  it('onMessage receives messages from data channel', () => {
    const handler = vi.fn();
    conn.onMessage(handler);

    // Simulate message from data channel
    dc.onmessage!({ data: 'incoming' });

    expect(handler).toHaveBeenCalledWith('incoming');
  });

  it('onMessage supports multiple handlers', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    conn.onMessage(h1);
    conn.onMessage(h2);

    dc.onmessage!({ data: 'msg' });

    expect(h1).toHaveBeenCalledWith('msg');
    expect(h2).toHaveBeenCalledWith('msg');
  });

  it('onClose fires when data channel closes', () => {
    const handler = vi.fn();
    conn.onClose(handler);

    dc.onclose!();

    expect(handler).toHaveBeenCalled();
  });

  it('peerId returns the peer node id', () => {
    expect(conn.peerId).toBe(peerId);
  });
});
