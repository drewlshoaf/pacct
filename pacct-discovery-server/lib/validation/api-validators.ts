import { z } from 'zod';

// Network creation
export const createNetworkSchema = z.object({
  id: z.string().min(1),
  alias: z.string().min(1),
  creatorNodeId: z.string().min(1),
  visibilityMode: z.enum(['full', 'partial', 'none']).optional(),
  visibilityConfig: z.record(z.string()).optional(),
  minActiveMembers: z.number().int().min(1).optional(),
  preActivationTimeoutMs: z.number().int().positive().optional(),
  postActivationInactivityTimeoutMs: z.number().int().positive().optional(),
  manifests: z.object({
    specManifests: z.array(z.object({
      specType: z.enum(['schema', 'computation', 'governance', 'economic']),
      specId: z.string().min(1),
      hash: z.string().min(1),
      version: z.string().min(1),
    })).optional(),
    networkManifest: z.object({
      schemaHash: z.string().min(1),
      computationHash: z.string().min(1),
      governanceHash: z.string().min(1),
      economicHash: z.string().min(1),
      signature: z.string().optional(),
    }).optional(),
  }).optional(),
});

export type CreateNetworkInput = z.infer<typeof createNetworkSchema>;

// Network status update
export const updateNetworkStatusSchema = z.object({
  status: z.enum(['draft', 'pending', 'active', 'degraded', 'dissolved', 'archived']),
});

export type UpdateNetworkStatusInput = z.infer<typeof updateNetworkStatusSchema>;

// Add member
export const addMemberSchema = z.object({
  nodeId: z.string().min(1),
  status: z.enum(['active', 'left', 'expelled', 'offline', 'pending_reack']).optional(),
});

export type AddMemberInput = z.infer<typeof addMemberSchema>;

// Update member status
export const updateMemberStatusSchema = z.object({
  status: z.enum(['active', 'left', 'expelled', 'offline', 'pending_reack']),
});

export type UpdateMemberStatusInput = z.infer<typeof updateMemberStatusSchema>;

// Submit application
export const submitApplicationSchema = z.object({
  nodeId: z.string().min(1),
});

export type SubmitApplicationInput = z.infer<typeof submitApplicationSchema>;

// Update applicant status
export const updateApplicantStatusSchema = z.object({
  status: z.enum([
    'draft', 'submitted', 'pending_approval', 'approved_pending_acceptance',
    'active', 'rejected', 'withdrawn', 'expired_pending_approval', 'expired_pending_acceptance',
  ]),
});

export type UpdateApplicantStatusInput = z.infer<typeof updateApplicantStatusSchema>;

// Cast vote
export const castVoteSchema = z.object({
  voterNodeId: z.string().min(1),
  vote: z.enum(['approve', 'reject']),
  signature: z.string().optional(),
});

export type CastVoteInput = z.infer<typeof castVoteSchema>;

// Presence update
export const updatePresenceSchema = z.object({
  nodeId: z.string().min(1),
  online: z.boolean(),
});

export type UpdatePresenceInput = z.infer<typeof updatePresenceSchema>;

// Pagination
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
