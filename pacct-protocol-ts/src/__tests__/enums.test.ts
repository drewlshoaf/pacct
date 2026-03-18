import { describe, it, expect } from 'vitest';
import {
  NetworkStatus,
  MemberStatus,
  ApplicantStatus,
  RunStatus,
  SpecLifecycle,
  ComputationType,
  EconomicMode,
  RunInitiationMode,
  VisibilityMode,
  SectionVisibility,
  DisconnectBehavior,
} from '../index';

describe('NetworkStatus', () => {
  it('has all expected values', () => {
    expect(NetworkStatus.Draft).toBe('draft');
    expect(NetworkStatus.Pending).toBe('pending');
    expect(NetworkStatus.Active).toBe('active');
    expect(NetworkStatus.Degraded).toBe('degraded');
    expect(NetworkStatus.Dissolved).toBe('dissolved');
    expect(NetworkStatus.Archived).toBe('archived');
  });

  it('has exactly 6 members', () => {
    const values = Object.values(NetworkStatus);
    expect(values).toHaveLength(6);
    expect(new Set(values).size).toBe(6);
  });
});

describe('MemberStatus', () => {
  it('has all expected values', () => {
    expect(MemberStatus.Active).toBe('active');
    expect(MemberStatus.Left).toBe('left');
    expect(MemberStatus.Expelled).toBe('expelled');
    expect(MemberStatus.Offline).toBe('offline');
    expect(MemberStatus.PendingReAck).toBe('pending_reack');
  });

  it('has exactly 5 members', () => {
    const values = Object.values(MemberStatus);
    expect(values).toHaveLength(5);
    expect(new Set(values).size).toBe(5);
  });
});

describe('ApplicantStatus', () => {
  it('has all expected values', () => {
    expect(ApplicantStatus.Draft).toBe('draft');
    expect(ApplicantStatus.Submitted).toBe('submitted');
    expect(ApplicantStatus.PendingApproval).toBe('pending_approval');
    expect(ApplicantStatus.ApprovedPendingAcceptance).toBe('approved_pending_acceptance');
    expect(ApplicantStatus.Active).toBe('active');
    expect(ApplicantStatus.Rejected).toBe('rejected');
    expect(ApplicantStatus.Withdrawn).toBe('withdrawn');
    expect(ApplicantStatus.ExpiredPendingApproval).toBe('expired_pending_approval');
    expect(ApplicantStatus.ExpiredPendingAcceptance).toBe('expired_pending_acceptance');
  });

  it('has exactly 9 members', () => {
    const values = Object.values(ApplicantStatus);
    expect(values).toHaveLength(9);
    expect(new Set(values).size).toBe(9);
  });
});

describe('RunStatus', () => {
  it('has all expected values', () => {
    expect(RunStatus.Pending).toBe('pending');
    expect(RunStatus.Initializing).toBe('initializing');
    expect(RunStatus.Collecting).toBe('collecting');
    expect(RunStatus.Computing).toBe('computing');
    expect(RunStatus.Distributing).toBe('distributing');
    expect(RunStatus.Completed).toBe('completed');
    expect(RunStatus.Aborted).toBe('aborted');
    expect(RunStatus.Failed).toBe('failed');
  });

  it('has exactly 8 members', () => {
    const values = Object.values(RunStatus);
    expect(values).toHaveLength(8);
    expect(new Set(values).size).toBe(8);
  });
});

describe('SpecLifecycle', () => {
  it('has all expected values', () => {
    expect(SpecLifecycle.Template).toBe('template');
    expect(SpecLifecycle.Draft).toBe('draft');
    expect(SpecLifecycle.Published).toBe('published');
    expect(SpecLifecycle.NetworkSnapshot).toBe('network_snapshot');
  });

  it('has exactly 4 members', () => {
    const values = Object.values(SpecLifecycle);
    expect(values).toHaveLength(4);
    expect(new Set(values).size).toBe(4);
  });
});

describe('ComputationType', () => {
  it('has regression value', () => {
    expect(ComputationType.Regression).toBe('regression');
  });

  it('has exactly 1 member', () => {
    const values = Object.values(ComputationType);
    expect(values).toHaveLength(1);
  });
});

describe('EconomicMode', () => {
  it('has all expected values', () => {
    expect(EconomicMode.Capitalist).toBe('capitalist');
    expect(EconomicMode.Progressive).toBe('progressive');
    expect(EconomicMode.SocialistHybrid).toBe('socialist_hybrid');
  });

  it('has exactly 3 members', () => {
    const values = Object.values(EconomicMode);
    expect(values).toHaveLength(3);
    expect(new Set(values).size).toBe(3);
  });
});

describe('RunInitiationMode', () => {
  it('has restricted_manual value', () => {
    expect(RunInitiationMode.RestrictedManual).toBe('restricted_manual');
  });
});

describe('VisibilityMode', () => {
  it('has all expected values', () => {
    expect(VisibilityMode.Full).toBe('full');
    expect(VisibilityMode.Partial).toBe('partial');
    expect(VisibilityMode.None).toBe('none');
  });

  it('has exactly 3 members', () => {
    const values = Object.values(VisibilityMode);
    expect(values).toHaveLength(3);
    expect(new Set(values).size).toBe(3);
  });
});

describe('SectionVisibility', () => {
  it('has all expected values', () => {
    expect(SectionVisibility.Hidden).toBe('hidden');
    expect(SectionVisibility.SummaryOnly).toBe('summary_only');
    expect(SectionVisibility.Full).toBe('full');
  });

  it('has exactly 3 members', () => {
    const values = Object.values(SectionVisibility);
    expect(values).toHaveLength(3);
    expect(new Set(values).size).toBe(3);
  });
});

describe('DisconnectBehavior', () => {
  it('has abort value', () => {
    expect(DisconnectBehavior.Abort).toBe('abort');
  });
});
