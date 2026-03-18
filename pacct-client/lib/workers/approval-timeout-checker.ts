import type { ApplicantInfo } from '@pacct/protocol-ts';
import { ApplicantStatus } from '@pacct/protocol-ts';

export class ApprovalTimeoutChecker {
  private intervalId?: ReturnType<typeof setInterval>;

  constructor(
    private approvalTimeoutMs: number,
    private acceptanceTimeoutMs: number,
    private checkIntervalMs: number,
  ) {}

  start(
    getApplicants: () => ApplicantInfo[],
    onApprovalExpired: (nodeId: string) => void,
    onAcceptanceExpired: (nodeId: string) => void,
  ): void {
    this.stop();
    this.intervalId = setInterval(() => {
      const applicants = getApplicants();
      const now = Date.now();

      for (const applicant of applicants) {
        const result = this.checkApplicant(applicant, now);
        if (result === 'approval_expired') {
          onApprovalExpired(applicant.nodeId as string);
        } else if (result === 'acceptance_expired') {
          onAcceptanceExpired(applicant.nodeId as string);
        }
      }
    }, this.checkIntervalMs);
  }

  stop(): void {
    if (this.intervalId !== undefined) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  checkApplicant(
    applicant: ApplicantInfo,
    now: number,
  ): 'approval_expired' | 'acceptance_expired' | 'ok' {
    if (applicant.status === ApplicantStatus.PendingApproval) {
      if (now - applicant.appliedAt >= this.approvalTimeoutMs) {
        return 'approval_expired';
      }
    }

    if (applicant.status === ApplicantStatus.ApprovedPendingAcceptance) {
      const referenceTime = applicant.approvedAt ?? applicant.appliedAt;
      if (now - referenceTime >= this.acceptanceTimeoutMs) {
        return 'acceptance_expired';
      }
    }

    return 'ok';
  }
}
