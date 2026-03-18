import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApprovalTimeoutChecker } from '../approval-timeout-checker';
import { ApplicantStatus } from '@pacct/protocol-ts';
import type { ApplicantInfo } from '@pacct/protocol-ts';

function makeApplicant(overrides?: Partial<ApplicantInfo>): ApplicantInfo {
  return {
    nodeId: 'node-app' as any,
    status: ApplicantStatus.PendingApproval,
    appliedAt: 1000,
    votes: [],
    ...overrides,
  };
}

describe('ApprovalTimeoutChecker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('detects approval timeout for pending_approval applicant', () => {
    const checker = new ApprovalTimeoutChecker(10000, 20000, 1000);
    const applicant = makeApplicant({
      status: ApplicantStatus.PendingApproval,
      appliedAt: 1000,
    });

    const result = checker.checkApplicant(applicant, 12000);
    expect(result).toBe('approval_expired');
  });

  it('detects acceptance timeout for approved_pending_acceptance applicant', () => {
    const checker = new ApprovalTimeoutChecker(10000, 20000, 1000);
    const applicant = makeApplicant({
      status: ApplicantStatus.ApprovedPendingAcceptance,
      appliedAt: 1000,
      approvedAt: 5000,
    });

    const result = checker.checkApplicant(applicant, 26000);
    expect(result).toBe('acceptance_expired');
  });

  it('returns ok for fresh pending_approval application', () => {
    const checker = new ApprovalTimeoutChecker(10000, 20000, 1000);
    const applicant = makeApplicant({
      status: ApplicantStatus.PendingApproval,
      appliedAt: 1000,
    });

    const result = checker.checkApplicant(applicant, 5000);
    expect(result).toBe('ok');
  });

  it('returns ok for fresh approved_pending_acceptance application', () => {
    const checker = new ApprovalTimeoutChecker(10000, 20000, 1000);
    const applicant = makeApplicant({
      status: ApplicantStatus.ApprovedPendingAcceptance,
      appliedAt: 1000,
      approvedAt: 5000,
    });

    const result = checker.checkApplicant(applicant, 10000);
    expect(result).toBe('ok');
  });

  it('ignores non-pending applicants (rejected)', () => {
    const checker = new ApprovalTimeoutChecker(10000, 20000, 1000);
    const applicant = makeApplicant({
      status: ApplicantStatus.Rejected,
      appliedAt: 1000,
    });

    const result = checker.checkApplicant(applicant, 100000);
    expect(result).toBe('ok');
  });

  it('ignores withdrawn applicants', () => {
    const checker = new ApprovalTimeoutChecker(10000, 20000, 1000);
    const applicant = makeApplicant({
      status: ApplicantStatus.Withdrawn,
      appliedAt: 1000,
    });

    const result = checker.checkApplicant(applicant, 100000);
    expect(result).toBe('ok');
  });

  it('ignores already-expired applicants', () => {
    const checker = new ApprovalTimeoutChecker(10000, 20000, 1000);
    const applicant = makeApplicant({
      status: ApplicantStatus.ExpiredPendingApproval,
      appliedAt: 1000,
    });

    const result = checker.checkApplicant(applicant, 100000);
    expect(result).toBe('ok');
  });

  it('ignores active applicants', () => {
    const checker = new ApprovalTimeoutChecker(10000, 20000, 1000);
    const applicant = makeApplicant({
      status: ApplicantStatus.Active,
      appliedAt: 1000,
    });

    const result = checker.checkApplicant(applicant, 100000);
    expect(result).toBe('ok');
  });

  it('start calls callbacks on interval', () => {
    const checker = new ApprovalTimeoutChecker(100, 200, 50);
    const approvalExpired: string[] = [];
    const acceptanceExpired: string[] = [];

    vi.setSystemTime(500);

    const applicants: ApplicantInfo[] = [
      makeApplicant({
        nodeId: 'node-1' as any,
        status: ApplicantStatus.PendingApproval,
        appliedAt: 0,
      }),
      makeApplicant({
        nodeId: 'node-2' as any,
        status: ApplicantStatus.ApprovedPendingAcceptance,
        appliedAt: 0,
        approvedAt: 100,
      }),
    ];

    checker.start(
      () => applicants,
      (nodeId) => approvalExpired.push(nodeId),
      (nodeId) => acceptanceExpired.push(nodeId),
    );

    vi.advanceTimersByTime(50);

    expect(approvalExpired).toContain('node-1');
    expect(acceptanceExpired).toContain('node-2');

    checker.stop();
  });

  it('stop prevents further checks', () => {
    const checker = new ApprovalTimeoutChecker(100, 200, 50);
    const expired: string[] = [];

    vi.setSystemTime(500);

    checker.start(
      () => [
        makeApplicant({
          nodeId: 'node-1' as any,
          status: ApplicantStatus.PendingApproval,
          appliedAt: 0,
        }),
      ],
      (nodeId) => expired.push(nodeId),
      () => {},
    );

    vi.advanceTimersByTime(50);
    const count = expired.length;

    checker.stop();
    vi.advanceTimersByTime(200);

    expect(expired.length).toBe(count);
  });
});
