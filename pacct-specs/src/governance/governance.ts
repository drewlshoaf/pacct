import { z } from 'zod';
import {
  SpecLifecycle,
  VisibilityMode,
  SectionVisibility,
  RunInitiationMode,
  DisconnectBehavior,
} from '@pacct/protocol-ts';

const consensusScheduleEntrySchema = z.object({
  memberCountMin: z.number().int().min(1),
  memberCountMax: z.number().int().min(1),
  threshold: z.number().min(0).max(1),
}).refine(e => e.memberCountMin <= e.memberCountMax, {
  message: 'memberCountMin must be <= memberCountMax',
});

const sectionVisibilitySchema = z.object({
  schema: z.nativeEnum(SectionVisibility),
  computation: z.nativeEnum(SectionVisibility),
  governance: z.nativeEnum(SectionVisibility),
  economic: z.nativeEnum(SectionVisibility),
});

export const governanceSpecSchema = z.object({
  specId: z.string().min(1),
  lifecycle: z.nativeEnum(SpecLifecycle),
  version: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),

  membershipPolicy: z.object({
    minActiveMembers: z.number().int().min(3, 'minActiveMembers must be >= 3'),
    maxMembers: z.number().int().optional(),
  }).superRefine((policy, ctx) => {
    if (policy.maxMembers !== undefined && policy.maxMembers < policy.minActiveMembers) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'maxMembers must be >= minActiveMembers',
        path: ['maxMembers'],
      });
    }
  }),

  visibilityPolicy: z.object({
    mode: z.nativeEnum(VisibilityMode),
    sectionVisibility: sectionVisibilitySchema.optional(),
  }).superRefine((policy, ctx) => {
    if (policy.mode === VisibilityMode.Partial && !policy.sectionVisibility) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'sectionVisibility is required when visibility mode is partial',
        path: ['sectionVisibility'],
      });
    }
  }),

  joinPolicy: z.object({
    approvalTimeoutMs: z.number().int().positive('approvalTimeoutMs must be > 0'),
    acceptanceTimeoutMs: z.number().int().positive('acceptanceTimeoutMs must be > 0'),
  }),

  consensusPolicy: z.object({
    admissionSchedule: z.array(consensusScheduleEntrySchema).min(1),
    dissolutionThreshold: z.number().min(0).max(1),
    expulsionThreshold: z.number().min(0).max(1).optional(),
  }).superRefine((policy, ctx) => {
    // Validate admission schedule covers member counts from 1 upward without gaps
    const entries = [...policy.admissionSchedule].sort((a, b) => a.memberCountMin - b.memberCountMin);
    if (entries.length > 0 && entries[0].memberCountMin !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Admission schedule must start at memberCountMin = 1',
        path: ['admissionSchedule'],
      });
    }
    for (let i = 1; i < entries.length; i++) {
      if (entries[i].memberCountMin !== entries[i - 1].memberCountMax + 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Admission schedule has gap or overlap between entries ${i - 1} and ${i}`,
          path: ['admissionSchedule'],
        });
      }
    }
  }),

  runPolicy: z.object({
    initiationMode: z.nativeEnum(RunInitiationMode),
    allowedInitiators: z.enum(['any_member', 'creator_only']),
    minimumIntervalMs: z.number().int().min(0),
    maxRunsPerPeriod: z.number().int().positive('maxRunsPerPeriod must be > 0'),
    periodLengthDays: z.number().int().positive('periodLengthDays must be > 0'),
    requireCostEstimate: z.boolean(),
    allMembersOnlineRequired: z.boolean(),
    midRunDisconnectBehavior: z.nativeEnum(DisconnectBehavior),
  }),

  dissolutionPolicy: z.object({
    preActivationTimeoutMs: z.number().int().positive('preActivationTimeoutMs must be > 0'),
    postActivationInactivityTimeoutMs: z.number().int().positive('postActivationInactivityTimeoutMs must be > 0'),
    warnBeforeDissolveMs: z.number().int().positive().optional(),
  }),

  expulsionPolicy: z.object({
    enabled: z.boolean(),
    requireReason: z.boolean(),
  }).optional(),

  createdAt: z.number(),
  updatedAt: z.number(),
});
