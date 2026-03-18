/**
 * Message types exchanged between peers during a federated computation run.
 * All messages are serialized as JSON strings over WebRTC data channels.
 */

export enum ComputationMessageType {
  RUN_START = 'computation:run_start',
  LOCAL_SUMMARY = 'computation:local_summary',
  AGGREGATED_RESULT = 'computation:aggregated_result',
  RUN_COMPLETE = 'computation:run_complete',
  RUN_ABORT = 'computation:run_abort',
  READY_ACK = 'computation:ready_ack',
}

export interface RunStartMessage {
  type: ComputationMessageType.RUN_START;
  runId: string;
  networkId: string;
  initiatorNodeId: string;
  featureFields: string[];
  targetField: string;
  config: {
    revealMode: 'coefficients' | 'scores' | 'both';
    clipMin?: number;
    clipMax?: number;
    normalize: boolean;
  };
  timestamp: number;
}

export interface ReadyAckMessage {
  type: ComputationMessageType.READY_ACK;
  runId: string;
  nodeId: string;
  timestamp: number;
}

export interface LocalSummaryMessage {
  type: ComputationMessageType.LOCAL_SUMMARY;
  runId: string;
  nodeId: string;
  summary: {
    xtx: number[][];
    xty: number[];
    n: number;
    sumY: number;
    sumY2: number;
    featureFields: string[];
    targetField: string;
  };
  timestamp: number;
}

export interface AggregatedResultMessage {
  type: ComputationMessageType.AGGREGATED_RESULT;
  runId: string;
  result: {
    coefficients: Record<string, number>;
    intercept: number;
    rSquared: number;
    totalN: number;
    contributorCount: number;
    featureFields: string[];
    targetField: string;
  };
  timestamp: number;
}

export interface RunCompleteMessage {
  type: ComputationMessageType.RUN_COMPLETE;
  runId: string;
  timestamp: number;
}

export interface RunAbortMessage {
  type: ComputationMessageType.RUN_ABORT;
  runId: string;
  reason: string;
  timestamp: number;
}

export type ComputationMessage =
  | RunStartMessage
  | ReadyAckMessage
  | LocalSummaryMessage
  | AggregatedResultMessage
  | RunCompleteMessage
  | RunAbortMessage;

/**
 * Type guard: checks if a parsed JSON object is a computation message.
 */
export function isComputationMessage(obj: unknown): obj is ComputationMessage {
  if (typeof obj !== 'object' || obj === null) return false;
  const msg = obj as { type?: string };
  return (
    typeof msg.type === 'string' &&
    Object.values(ComputationMessageType).includes(msg.type as ComputationMessageType)
  );
}

/**
 * Parse a raw data channel string into a ComputationMessage, or return null.
 */
export function parseComputationMessage(data: string): ComputationMessage | null {
  try {
    const parsed = JSON.parse(data);
    if (isComputationMessage(parsed)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
