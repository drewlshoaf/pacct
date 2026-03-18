import { describe, it, expect } from 'vitest';
import { ApplicantStatus, MemberStatus } from '@pacct/protocol-ts';
import {
  submitApplication,
  castApprovalVote,
  checkApprovalConsensus,
  approveApplicant,
  acceptContract,
  withdrawApplication,
  checkApprovalTimeout,
  checkAcceptanceTimeout,
  expireApplication,
  rejectApplicant,
} from '../admission';
import type { ConsensusScheduleEntry } from '../types';
import {
  createTestNetworkState,
  createTestMember,
  createTestApplicant,
  testNodeId,
} from './helpers';

const defaultSchedule: ConsensusScheduleEntry[] = [
  { memberCountMin: 1, memberCountMax: 5, threshold: 1.0 },
  { memberCountMin: 6, memberCountMax: 20, threshold: 0.75 },
  { memberCountMin: 21, memberCountMax: Infinity, threshold: 0.67 },
];

describe('submitApplication', () => {
  it('adds an applicant with PendingApproval status', () => {
    const state = createTestNetworkState();
    const result = submitApplication(state, testNodeId('applicant-1'), 5000);
    expect(result.applicants).toHaveLength(1);
    expect(result.applicants[0].status).toBe(ApplicantStatus.PendingApproval);
    expect(result.applicants[0].appliedAt).toBe(5000);
  });
});

describe('castApprovalVote', () => {
  it('adds a vote to the applicant', () => {
    const state = createTestNetworkState({
      applicants: [createTestApplicant('applicant-1')],
    });
    const result = castApprovalVote(
      state,
      testNodeId('applicant-1'),
      testNodeId('node-creator'),
      'approve',
      5000,
      'sig-1',
    );
    expect(result.applicants[0].votes).toHaveLength(1);
    expect(result.applicants[0].votes[0].vote).toBe('approve');
  });

  it('prevents duplicate votes from same voter', () => {
    const state = createTestNetworkState({
      applicants: [
        createTestApplicant('applicant-1', {
          votes: [
            {
              voterNodeId: testNodeId('node-creator'),
              vote: 'approve',
              timestamp: 4000,
              signature: 'sig-1',
            },
          ],
        }),
      ],
    });
    const result = castApprovalVote(
      state,
      testNodeId('applicant-1'),
      testNodeId('node-creator'),
      'reject',
      5000,
      'sig-2',
    );
    expect(result.applicants[0].votes).toHaveLength(1);
  });
});

describe('checkApprovalConsensus', () => {
  it('returns approved when threshold met', () => {
    const state = createTestNetworkState({
      members: [
        createTestMember('node-1'),
        createTestMember('node-2'),
      ],
      applicants: [
        createTestApplicant('applicant-1', {
          votes: [
            { voterNodeId: testNodeId('node-1'), vote: 'approve', timestamp: 5000, signature: 'sig' },
            { voterNodeId: testNodeId('node-2'), vote: 'approve', timestamp: 5001, signature: 'sig' },
          ],
        }),
      ],
    });
    expect(
      checkApprovalConsensus(state, testNodeId('applicant-1'), defaultSchedule),
    ).toBe('approved');
  });

  it('returns rejected when all voted and threshold not met', () => {
    const state = createTestNetworkState({
      members: [
        createTestMember('node-1'),
        createTestMember('node-2'),
      ],
      applicants: [
        createTestApplicant('applicant-1', {
          votes: [
            { voterNodeId: testNodeId('node-1'), vote: 'approve', timestamp: 5000, signature: 'sig' },
            { voterNodeId: testNodeId('node-2'), vote: 'reject', timestamp: 5001, signature: 'sig' },
          ],
        }),
      ],
    });
    // Threshold is 1.0 for 2 members, only 50% approved
    expect(
      checkApprovalConsensus(state, testNodeId('applicant-1'), defaultSchedule),
    ).toBe('rejected');
  });

  it('returns pending when not enough votes', () => {
    const state = createTestNetworkState({
      members: [
        createTestMember('node-1'),
        createTestMember('node-2'),
      ],
      applicants: [
        createTestApplicant('applicant-1', {
          votes: [
            { voterNodeId: testNodeId('node-1'), vote: 'approve', timestamp: 5000, signature: 'sig' },
          ],
        }),
      ],
    });
    expect(
      checkApprovalConsensus(state, testNodeId('applicant-1'), defaultSchedule),
    ).toBe('pending');
  });

  it('uses correct schedule entry for larger networks', () => {
    const members = Array.from({ length: 8 }, (_, i) =>
      createTestMember(`node-${i}`),
    );
    // 6 out of 8 approve = 75% = meets threshold
    const votes = members.slice(0, 6).map((m) => ({
      voterNodeId: m.nodeId,
      vote: 'approve' as const,
      timestamp: 5000,
      signature: 'sig',
    }));
    const state = createTestNetworkState({
      members,
      applicants: [createTestApplicant('applicant-1', { votes })],
    });
    expect(
      checkApprovalConsensus(state, testNodeId('applicant-1'), defaultSchedule),
    ).toBe('approved');
  });
});

describe('approveApplicant', () => {
  it('sets status to ApprovedPendingAcceptance', () => {
    const state = createTestNetworkState({
      applicants: [createTestApplicant('applicant-1')],
    });
    const result = approveApplicant(state, testNodeId('applicant-1'), 5000);
    expect(result.applicants[0].status).toBe(
      ApplicantStatus.ApprovedPendingAcceptance,
    );
    expect(result.applicants[0].approvedAt).toBe(5000);
  });
});

describe('acceptContract', () => {
  it('moves applicant to Active and adds as member', () => {
    const state = createTestNetworkState({
      members: [createTestMember('node-1')],
      applicants: [
        createTestApplicant('applicant-1', {
          status: ApplicantStatus.ApprovedPendingAcceptance,
          approvedAt: 4000,
        }),
      ],
    });
    const result = acceptContract(state, testNodeId('applicant-1'), 5000);
    expect(result.applicants[0].status).toBe(ApplicantStatus.Active);
    expect(result.applicants[0].acceptedAt).toBe(5000);
    expect(result.members).toHaveLength(2);
    expect(result.members[1].nodeId).toBe(testNodeId('applicant-1'));
  });
});

describe('withdrawApplication', () => {
  it('sets status to Withdrawn', () => {
    const state = createTestNetworkState({
      applicants: [createTestApplicant('applicant-1')],
    });
    const result = withdrawApplication(state, testNodeId('applicant-1'), 5000);
    expect(result.applicants[0].status).toBe(ApplicantStatus.Withdrawn);
    expect(result.applicants[0].withdrawnAt).toBe(5000);
  });
});

describe('checkApprovalTimeout', () => {
  it('returns true when timeout elapsed for pending_approval', () => {
    const state = createTestNetworkState({
      applicants: [createTestApplicant('applicant-1', { appliedAt: 1000 })],
    });
    expect(
      checkApprovalTimeout(state, testNodeId('applicant-1'), 11000, 10000),
    ).toBe(true);
  });

  it('returns false when not enough time has elapsed', () => {
    const state = createTestNetworkState({
      applicants: [createTestApplicant('applicant-1', { appliedAt: 1000 })],
    });
    expect(
      checkApprovalTimeout(state, testNodeId('applicant-1'), 5000, 10000),
    ).toBe(false);
  });
});

describe('checkAcceptanceTimeout', () => {
  it('returns true when timeout elapsed for approved_pending_acceptance', () => {
    const state = createTestNetworkState({
      applicants: [
        createTestApplicant('applicant-1', {
          status: ApplicantStatus.ApprovedPendingAcceptance,
          approvedAt: 1000,
        }),
      ],
    });
    expect(
      checkAcceptanceTimeout(state, testNodeId('applicant-1'), 11000, 10000),
    ).toBe(true);
  });
});

describe('expireApplication', () => {
  it('sets approval_timeout expired status', () => {
    const state = createTestNetworkState({
      applicants: [createTestApplicant('applicant-1')],
    });
    const result = expireApplication(
      state,
      testNodeId('applicant-1'),
      'approval_timeout',
      5000,
    );
    expect(result.applicants[0].status).toBe(
      ApplicantStatus.ExpiredPendingApproval,
    );
  });

  it('sets acceptance_timeout expired status', () => {
    const state = createTestNetworkState({
      applicants: [
        createTestApplicant('applicant-1', {
          status: ApplicantStatus.ApprovedPendingAcceptance,
        }),
      ],
    });
    const result = expireApplication(
      state,
      testNodeId('applicant-1'),
      'acceptance_timeout',
      5000,
    );
    expect(result.applicants[0].status).toBe(
      ApplicantStatus.ExpiredPendingAcceptance,
    );
  });
});

describe('rejectApplicant', () => {
  it('sets status to Rejected', () => {
    const state = createTestNetworkState({
      applicants: [createTestApplicant('applicant-1')],
    });
    const result = rejectApplicant(state, testNodeId('applicant-1'), 5000);
    expect(result.applicants[0].status).toBe(ApplicantStatus.Rejected);
    expect(result.applicants[0].rejectedAt).toBe(5000);
  });
});

describe('full happy path', () => {
  it('takes applicant from submission to membership', () => {
    let state = createTestNetworkState({
      members: [createTestMember('node-1')],
      applicants: [],
    });

    // Submit
    state = submitApplication(state, testNodeId('applicant-1'), 1000);
    expect(state.applicants[0].status).toBe(ApplicantStatus.PendingApproval);

    // Vote
    state = castApprovalVote(
      state,
      testNodeId('applicant-1'),
      testNodeId('node-1'),
      'approve',
      2000,
      'sig',
    );

    // Check consensus (1 member, 1 approve = 100% >= threshold)
    const consensus = checkApprovalConsensus(
      state,
      testNodeId('applicant-1'),
      defaultSchedule,
    );
    expect(consensus).toBe('approved');

    // Approve
    state = approveApplicant(state, testNodeId('applicant-1'), 3000);
    expect(state.applicants[0].status).toBe(
      ApplicantStatus.ApprovedPendingAcceptance,
    );

    // Accept
    state = acceptContract(state, testNodeId('applicant-1'), 4000);
    expect(state.applicants[0].status).toBe(ApplicantStatus.Active);
    expect(state.members).toHaveLength(2);
    expect(state.members[1].nodeId).toBe(testNodeId('applicant-1'));
  });
});
