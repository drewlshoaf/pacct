import type { NodeId } from '@pacct/protocol-ts';

// Interface wrappers for RTCPeerConnection/RTCDataChannel so code can be
// mocked/swapped without depending on browser globals at import time.

export interface IRTCPeerConnection {
  close(): void;
  readonly connectionState: string;
}

export interface IRTCDataChannel {
  send(data: string | ArrayBuffer): void;
  close(): void;
  readonly readyState: string;
  onmessage: ((event: { data: string | ArrayBuffer }) => void) | null;
  onclose: (() => void) | null;
}

type DataHandler = (data: string | ArrayBuffer) => void;
type CloseHandler = () => void;

export class PeerConnection {
  private messageHandlers: DataHandler[] = [];
  private closeHandlers: CloseHandler[] = [];

  constructor(
    private peerNodeId: NodeId,
    private rtcConnection: IRTCPeerConnection,
    private dataChannel: IRTCDataChannel,
  ) {
    this.dataChannel.onmessage = (event) => {
      for (const handler of this.messageHandlers) {
        handler(event.data);
      }
    };

    this.dataChannel.onclose = () => {
      for (const handler of this.closeHandlers) {
        handler();
      }
    };
  }

  send(data: string | ArrayBuffer): void {
    if (!this.isOpen) {
      throw new Error(`Data channel to ${this.peerNodeId} is not open`);
    }
    this.dataChannel.send(data);
  }

  close(): void {
    this.dataChannel.close();
    this.rtcConnection.close();
  }

  get isOpen(): boolean {
    return this.dataChannel.readyState === 'open';
  }

  get peerId(): NodeId {
    return this.peerNodeId;
  }

  onMessage(handler: DataHandler): void {
    this.messageHandlers.push(handler);
  }

  onClose(handler: CloseHandler): void {
    this.closeHandlers.push(handler);
  }
}
