# PACCT — Welcome Letter to the Development Team

Team,

Welcome to the PACCT project.

**PACCT** stands for **Privacy Preserving Analytics via Collaborative Computation and Thresholding**.

PACCT is an industry-agnostic framework for collaborative analytics in environments where two conditions exist at the same time:

1. organizations have strong incentive to collaborate analytically, and
2. raw data cannot be freely shared because of privacy, legal, fiduciary, ethical, or operational constraints.

Examples include healthcare, finance, education, defense, and other sensitive domains. PACCT is not a vertical application. It is infrastructure for governed multi-party analytics over sensitive, locally held data.

The core principles are straightforward:

- each participant retains local custody of its own records
- records are single-owner
- computation is multi-party
- the network is governed by explicit immutable terms
- participants join only after review and acceptance of those terms
- the discovery layer remains lightweight and metadata-only
- full network contracts are not centrally owned by the discovery service

This first version should prioritize correctness, clarity, explicitness, and testability over polish or breadth.

## Immediate delivery philosophy

PACCT v1 should feel like governed distributed infrastructure, not a consumer product and not a generic analytics dashboard.

Please optimize for:

- rigorous workflow behavior
- deterministic state transitions
- strong validation
- operational clarity
- clear separation of responsibilities across repos
- high-confidence testing for high and medium priority paths

Please do **not** optimize for:

- polished final styling
- deep enterprise auth
- arbitrary extensibility at the expense of reliability
- premature infrastructure complexity

## Repository layout

Create and work within these repositories:

- `pacct-client`
- `pacct-discovery-server`
- `pacct-protocol-ts`
- `pacct-specs`
- `pacct-design`

### `pacct-design`
This repo should be created now, but it is **not part of the initial functional build**.

A sample Next.js design system, old style files, and related visual assets will be delivered later into `pacct-design`. Styling should therefore remain intentionally simple in v1. The goal of the first build is concept validation, QA, protocol validation, and architecture verification. Styling will be applied afterward as a separate task.

## Stack direction

Use:

- **Next.js + TypeScript** for `pacct-client`
- **Next.js + TypeScript** for `pacct-discovery-server`
- **TypeScript shared packages** for `pacct-protocol-ts` and `pacct-specs`

This is a deliberate choice to keep the team on one strong web stack and make shared contracts, forms, validation, and admin/operator UI faster to deliver.

## Scope of v1

PACCT v1 should include:

- wizard-driven network creation
- spec-backed network definition
- metadata-only discovery server with operator UI
- local draft/template/import spec workflows
- immutable network snapshots
- controlled applicant visibility before approval
- consensus-based join approval
- post-approval contract reveal and acceptance
- dynamic membership with unilateral leave
- degrade/re-acknowledge/dissolve lifecycle behavior
- restricted-manual runs with cooldown and budget caps
- regression-only computation path
- browser node mode and server node mode
- strong unit testing for all high and medium priority paths

PACCT v1 should not include:

- enterprise identity/authentication
- classification labels
- multiple computations per network
- network forking
- arbitrary user-authored executable compute scripts
- full public template registry
- final design/styling system

## Expectations for quality

Unit tests are required and should be thorough for all high and medium priority logic. That includes, at minimum:

- spec validation
- cross-spec validation
- join lifecycle state transitions
- consensus and approval logic
- visibility policy behavior
- network degradation/dissolution behavior
- run policy enforcement
- budget/cooldown logic
- persistence adapters
- protocol message validation
- manifest and hash verification

The first build should be reliable enough to let us test the concept rigorously before styling and broader expansion.

Please treat the attached specifications as the initial contract for PACCT v1.

— Drew
