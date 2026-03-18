import { describe, it, expect } from 'vitest';
import { governanceSpecSchema } from '../governance';
import {
  SpecLifecycle,
  VisibilityMode,
  SectionVisibility,
  RunInitiationMode,
  DisconnectBehavior,
} from '@pacct/protocol-ts';
import type { SpecId } from '@pacct/protocol-ts';

function validGovernanceSpec() {
  return {
    specId: 'gov-1' as SpecId,
    lifecycle: SpecLifecycle.Draft,
    version: '1.0.0',
    name: 'Test Governance',
    membershipPolicy: {
      minActiveMembers: 3,
      maxMembers: 10,
    },
    visibilityPolicy: {
      mode: VisibilityMode.Full,
    },
    joinPolicy: {
      approvalTimeoutMs: 86400000,
      acceptanceTimeoutMs: 86400000,
    },
    consensusPolicy: {
      admissionSchedule: [
        { memberCountMin: 1, memberCountMax: 10, threshold: 1.0 },
      ],
      dissolutionThreshold: 0.75,
    },
    runPolicy: {
      initiationMode: RunInitiationMode.RestrictedManual,
      allowedInitiators: 'any_member' as const,
      minimumIntervalMs: 3600000,
      maxRunsPerPeriod: 10,
      periodLengthDays: 30,
      requireCostEstimate: false,
      allMembersOnlineRequired: true,
      midRunDisconnectBehavior: DisconnectBehavior.Abort,
    },
    dissolutionPolicy: {
      preActivationTimeoutMs: 604800000,
      postActivationInactivityTimeoutMs: 2592000000,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

describe('governanceSpecSchema', () => {
  it('should accept a valid governance spec', () => {
    const result = governanceSpecSchema.safeParse(validGovernanceSpec());
    expect(result.success).toBe(true);
  });

  it('should reject minActiveMembers < 3', () => {
    const spec = validGovernanceSpec();
    spec.membershipPolicy.minActiveMembers = 2;
    const result = governanceSpecSchema.safeParse(spec);
    expect(result.success).toBe(false);
  });

  it('should reject maxMembers < minActiveMembers', () => {
    const spec = validGovernanceSpec();
    spec.membershipPolicy.maxMembers = 2;
    const result = governanceSpecSchema.safeParse(spec);
    expect(result.success).toBe(false);
  });

  it('should reject dissolutionThreshold > 1', () => {
    const spec = validGovernanceSpec();
    spec.consensusPolicy.dissolutionThreshold = 1.5;
    const result = governanceSpecSchema.safeParse(spec);
    expect(result.success).toBe(false);
  });

  it('should reject dissolutionThreshold < 0', () => {
    const spec = validGovernanceSpec();
    spec.consensusPolicy.dissolutionThreshold = -0.1;
    const result = governanceSpecSchema.safeParse(spec);
    expect(result.success).toBe(false);
  });

  it('should reject expulsionThreshold out of range', () => {
    const spec = validGovernanceSpec();
    spec.consensusPolicy.expulsionThreshold = 2.0;
    const result = governanceSpecSchema.safeParse(spec);
    expect(result.success).toBe(false);
  });

  it('should require sectionVisibility when mode is partial', () => {
    const spec = validGovernanceSpec();
    spec.visibilityPolicy = {
      mode: VisibilityMode.Partial,
    };
    const result = governanceSpecSchema.safeParse(spec);
    expect(result.success).toBe(false);
  });

  it('should accept partial mode with sectionVisibility', () => {
    const spec = validGovernanceSpec();
    spec.visibilityPolicy = {
      mode: VisibilityMode.Partial,
      sectionVisibility: {
        schema: SectionVisibility.Full,
        computation: SectionVisibility.SummaryOnly,
        governance: SectionVisibility.Full,
        economic: SectionVisibility.Hidden,
      },
    };
    const result = governanceSpecSchema.safeParse(spec);
    expect(result.success).toBe(true);
  });

  it('should reject non-positive approvalTimeoutMs', () => {
    const spec = validGovernanceSpec();
    spec.joinPolicy.approvalTimeoutMs = 0;
    const result = governanceSpecSchema.safeParse(spec);
    expect(result.success).toBe(false);
  });

  it('should reject non-positive periodLengthDays', () => {
    const spec = validGovernanceSpec();
    spec.runPolicy.periodLengthDays = 0;
    const result = governanceSpecSchema.safeParse(spec);
    expect(result.success).toBe(false);
  });

  it('should reject non-positive maxRunsPerPeriod', () => {
    const spec = validGovernanceSpec();
    spec.runPolicy.maxRunsPerPeriod = 0;
    const result = governanceSpecSchema.safeParse(spec);
    expect(result.success).toBe(false);
  });

  it('should accept valid expulsionPolicy', () => {
    const spec = {
      ...validGovernanceSpec(),
      expulsionPolicy: { enabled: true, requireReason: true },
    };
    const result = governanceSpecSchema.safeParse(spec);
    expect(result.success).toBe(true);
  });
});
