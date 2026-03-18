import type { SpecId, Timestamp } from '@pacct/protocol-ts';
import type {
  SpecLifecycle,
  VisibilityMode,
  SectionVisibility,
  RunInitiationMode,
  DisconnectBehavior,
} from '@pacct/protocol-ts';

export interface ConsensusScheduleEntry {
  memberCountMin: number;
  memberCountMax: number;
  threshold: number;
}

export interface GovernanceSpec {
  specId: SpecId;
  lifecycle: SpecLifecycle;
  version: string;
  name: string;
  description?: string;

  membershipPolicy: {
    minActiveMembers: number;
    maxMembers?: number;
  };

  visibilityPolicy: {
    mode: VisibilityMode;
    sectionVisibility?: {
      schema: SectionVisibility;
      computation: SectionVisibility;
      governance: SectionVisibility;
      economic: SectionVisibility;
    };
  };

  joinPolicy: {
    approvalTimeoutMs: number;
    acceptanceTimeoutMs: number;
  };

  consensusPolicy: {
    admissionSchedule: ConsensusScheduleEntry[];
    dissolutionThreshold: number;
    expulsionThreshold?: number;
  };

  runPolicy: {
    initiationMode: RunInitiationMode;
    allowedInitiators: 'any_member' | 'creator_only';
    minimumIntervalMs: number;
    maxRunsPerPeriod: number;
    periodLengthDays: number;
    requireCostEstimate: boolean;
    allMembersOnlineRequired: boolean;
    midRunDisconnectBehavior: DisconnectBehavior;
  };

  dissolutionPolicy: {
    preActivationTimeoutMs: number;
    postActivationInactivityTimeoutMs: number;
    warnBeforeDissolveMs?: number;
  };

  expulsionPolicy?: {
    enabled: boolean;
    requireReason: boolean;
  };

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
