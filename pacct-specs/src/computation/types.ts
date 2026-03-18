import type { SpecId, Timestamp } from '@pacct/protocol-ts';
import type { SpecLifecycle, ComputationType } from '@pacct/protocol-ts';

export interface OutputConfig {
  revealMode: 'coefficients' | 'scores' | 'both';
  clipMin?: number;
  clipMax?: number;
  normalize: boolean;
}

export interface ComputationSpec {
  specId: SpecId;
  lifecycle: SpecLifecycle;
  version: string;
  name: string;
  description?: string;
  computationType: ComputationType;
  featureFields: string[];
  targetField: string;
  outputConfig: OutputConfig;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
