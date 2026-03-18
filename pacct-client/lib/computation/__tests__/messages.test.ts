import { describe, it, expect } from 'vitest';
import {
  ComputationMessageType,
  isComputationMessage,
  parseComputationMessage,
  type RunStartMessage,
  type ReadyAckMessage,
  type LocalSummaryMessage,
  type AggregatedResultMessage,
  type RunCompleteMessage,
  type RunAbortMessage,
} from '../messages';

describe('ComputationMessages', () => {
  describe('message construction', () => {
    it('constructs a RunStartMessage', () => {
      const msg: RunStartMessage = {
        type: ComputationMessageType.RUN_START,
        runId: 'run-1',
        networkId: 'net-1',
        initiatorNodeId: 'node-a',
        featureFields: ['x1', 'x2'],
        targetField: 'y',
        config: {
          revealMode: 'both',
          clipMin: 0,
          clipMax: 100,
          normalize: true,
        },
        timestamp: 1000,
      };
      expect(msg.type).toBe(ComputationMessageType.RUN_START);
      expect(msg.featureFields).toEqual(['x1', 'x2']);
    });

    it('constructs a ReadyAckMessage', () => {
      const msg: ReadyAckMessage = {
        type: ComputationMessageType.READY_ACK,
        runId: 'run-1',
        nodeId: 'node-b',
        timestamp: 1001,
      };
      expect(msg.type).toBe(ComputationMessageType.READY_ACK);
      expect(msg.nodeId).toBe('node-b');
    });

    it('constructs a LocalSummaryMessage', () => {
      const msg: LocalSummaryMessage = {
        type: ComputationMessageType.LOCAL_SUMMARY,
        runId: 'run-1',
        nodeId: 'node-b',
        summary: {
          xtx: [[4, 10], [10, 30]],
          xty: [14, 40],
          n: 4,
          sumY: 14,
          sumY2: 84,
          featureFields: ['x'],
          targetField: 'y',
        },
        timestamp: 1002,
      };
      expect(msg.type).toBe(ComputationMessageType.LOCAL_SUMMARY);
      expect(msg.summary.n).toBe(4);
    });

    it('constructs an AggregatedResultMessage', () => {
      const msg: AggregatedResultMessage = {
        type: ComputationMessageType.AGGREGATED_RESULT,
        runId: 'run-1',
        result: {
          coefficients: { x: 2 },
          intercept: 1,
          rSquared: 0.99,
          totalN: 8,
          contributorCount: 2,
          featureFields: ['x'],
          targetField: 'y',
        },
        timestamp: 1003,
      };
      expect(msg.type).toBe(ComputationMessageType.AGGREGATED_RESULT);
      expect(msg.result.coefficients.x).toBe(2);
    });

    it('constructs a RunCompleteMessage', () => {
      const msg: RunCompleteMessage = {
        type: ComputationMessageType.RUN_COMPLETE,
        runId: 'run-1',
        timestamp: 1004,
      };
      expect(msg.type).toBe(ComputationMessageType.RUN_COMPLETE);
    });

    it('constructs a RunAbortMessage', () => {
      const msg: RunAbortMessage = {
        type: ComputationMessageType.RUN_ABORT,
        runId: 'run-1',
        reason: 'peer disconnected',
        timestamp: 1005,
      };
      expect(msg.type).toBe(ComputationMessageType.RUN_ABORT);
      expect(msg.reason).toBe('peer disconnected');
    });
  });

  describe('serialization', () => {
    it('round-trips through JSON', () => {
      const msg: RunStartMessage = {
        type: ComputationMessageType.RUN_START,
        runId: 'run-1',
        networkId: 'net-1',
        initiatorNodeId: 'node-a',
        featureFields: ['x'],
        targetField: 'y',
        config: { revealMode: 'coefficients', normalize: false },
        timestamp: 1000,
      };

      const serialized = JSON.stringify(msg);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.type).toBe(ComputationMessageType.RUN_START);
      expect(deserialized.runId).toBe('run-1');
      expect(deserialized.config.revealMode).toBe('coefficients');
    });

    it('parses valid computation messages', () => {
      const msg: ReadyAckMessage = {
        type: ComputationMessageType.READY_ACK,
        runId: 'run-1',
        nodeId: 'node-b',
        timestamp: 1001,
      };

      const parsed = parseComputationMessage(JSON.stringify(msg));
      expect(parsed).not.toBeNull();
      expect(parsed!.type).toBe(ComputationMessageType.READY_ACK);
    });

    it('returns null for non-computation messages', () => {
      expect(parseComputationMessage('{"type":"other:thing"}')).toBeNull();
    });

    it('returns null for invalid JSON', () => {
      expect(parseComputationMessage('not-json')).toBeNull();
    });

    it('returns null for non-object values', () => {
      expect(parseComputationMessage('"just a string"')).toBeNull();
      expect(parseComputationMessage('42')).toBeNull();
    });
  });

  describe('type discriminant', () => {
    it('isComputationMessage identifies valid messages', () => {
      expect(
        isComputationMessage({ type: ComputationMessageType.RUN_START }),
      ).toBe(true);
      expect(
        isComputationMessage({ type: ComputationMessageType.LOCAL_SUMMARY }),
      ).toBe(true);
      expect(
        isComputationMessage({ type: ComputationMessageType.AGGREGATED_RESULT }),
      ).toBe(true);
      expect(
        isComputationMessage({ type: ComputationMessageType.RUN_COMPLETE }),
      ).toBe(true);
      expect(
        isComputationMessage({ type: ComputationMessageType.RUN_ABORT }),
      ).toBe(true);
      expect(
        isComputationMessage({ type: ComputationMessageType.READY_ACK }),
      ).toBe(true);
    });

    it('isComputationMessage rejects invalid types', () => {
      expect(isComputationMessage({ type: 'unknown:type' })).toBe(false);
      expect(isComputationMessage(null)).toBe(false);
      expect(isComputationMessage(undefined)).toBe(false);
      expect(isComputationMessage({})).toBe(false);
      expect(isComputationMessage('string')).toBe(false);
    });
  });
});
