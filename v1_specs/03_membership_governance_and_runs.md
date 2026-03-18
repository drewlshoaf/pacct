# PACCT v1 — Membership, Governance, Visibility, and Run Policy

## 1. Admission model

PACCT v1 uses a multi-stage admission pipeline.

### 1.1 Join flow
1. discover network
2. view whatever pre-approval visibility policy allows
3. submit application
4. await approval under governance threshold
5. if approved, receive full immutable network bundle from participating members
6. verify hashes against discovery-server manifest
7. review full terms
8. explicitly accept
9. become active member

## 2. Applicant visibility policy

Visibility before approval is configurable in the Governance Spec.

### 2.1 Supported high-level modes
- full pre-approval visibility
- partial pre-approval visibility
- no pre-approval visibility

### 2.2 Partial visibility levels
For each major section, support:
- hidden
- summary_only
- full

Sections:
- schema
- computation
- governance
- economic

### 2.3 Minimum always-visible metadata
Always expose at least:
- network alias/name
- network status
- join requires approval
- visibility mode

## 3. Join states

Applicants should move through states such as:
- draft
- submitted
- pending_approval
- approved_pending_acceptance
- active
- rejected
- withdrawn
- expired_pending_approval
- expired_pending_acceptance

## 4. Timeouts

Two separate timeouts are required.

### 4.1 Approval timeout
If members never vote or consensus never develops, the application expires.
Status becomes `expired_pending_approval`.

### 4.2 Acceptance timeout
If an approved applicant never accepts the revealed terms, the approval lapses.
Status becomes `expired_pending_acceptance`.

### 4.3 Applicant withdrawal
Applicants may withdraw at any time before activation.
Withdrawal clears the pending application state.
If they later want in, they must submit a new request.

## 5. Join acceptance record

When an applicant accepts the network contract, the acceptance record should include:
- member/node ID
- network ID
- spec manifest hashes
- timestamp
- signature

## 6. Membership change behavior

### 6.1 Leave
Any member may leave unilaterally.

Effects:
- active runs abort
- network enters degraded state
- remaining members are notified
- each remaining member must explicitly re-acknowledge continued participation
- if active acknowledged membership drops below minimum threshold, the network dissolves

### 6.2 Degraded state
A network in degraded state:
- cannot start new runs
- must wait for re-acknowledgements from remaining members
- may dissolve if re-acknowledgements fail or membership minimums are not met

### 6.3 Dissolution threshold
For v1, computation-capable networks require at least 3 active acknowledged members.
If acknowledged membership drops below 3, the network dissolves.

### 6.4 Dissolution permanence
Dissolved networks do not reactivate.
Any continuation requires a brand-new network.

## 7. Consensus policy

Consensus should be scale-aware and action-specific.

Do not rely on one flat threshold for every action.

### 7.1 Actions likely requiring distinct schedules
- admit member
- approve rejoin
- expel member
- dissolve network

### 7.2 Bootstrap phase
A network may exist with:
- only creator
- creator + second member

But it is not run-capable until the minimum active member threshold is satisfied.

### 7.3 Example default structure
Admission:
- creator alone may approve second member
- two-member phase may have its own threshold
- 3+ members may use simple majority or configured schedule

Dissolution:
- unanimous among current active members

Expulsion:
- high threshold if enabled

## 8. Expulsion

PACCT v1 may support optional expulsion.

If enabled:
- it must be explicit in the governance spec
- it must have its own threshold schedule
- it should require a reason
- it should trigger the same degrade/re-ack consequences as a leave event

Expulsion should be positioned as a network integrity mechanism, not a casual disagreement tool.

## 9. Run policy

### 9.1 V1 active mode
Use only:
- `restricted_manual`

Future-compatible modes may be modeled in the spec system, but v1 implementation should focus on restricted manual.

### 9.2 Restricted manual behavior
- runs are explicitly initiated
- no per-run consensus vote
- all required active members must be online
- minimum interval between runs is enforced
- compute budget cap is enforced
- mid-run disconnect aborts the run

### 9.3 Why no per-run vote
Per-run consensus introduces too much operational friction and allows one member to stall the network. Instead, members consent up front to the run policy as part of the network contract.

### 9.4 Why not pure auto-run
Online presence is not the same as intent to incur compute cost. Runs must remain intentional.

## 10. Run policy fields

Suggested fields:
- `initiation_mode`
- `allowed_initiators`
- `minimum_interval_between_runs`
- `max_runs_per_period`
- `period_length_days`
- `require_cost_estimate_before_start`
- `all_members_online_required`
- `mid_run_disconnect_behavior`

## 11. Compute budget cap

V1 must include a budget cap in the governance/economic configuration.

Recommended simple v1 model:
- max runs per period

Budget policy is distinct from economic mode.
Economic mode answers how cost is allocated.
Run policy answers how runs are allowed.

## 12. Inactivity timers

Support two timers:

### 12.1 Pre-activation expiry
For networks that are created but never become active.

### 12.2 Post-activation inactivity dissolve
For networks that were once active but then become dormant.

Optional warnings before auto-dissolve are recommended.

