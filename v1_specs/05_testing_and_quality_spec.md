# PACCT v1 — Testing and Quality Specification

## 1. Testing philosophy

PACCT is infrastructure. v1 quality should be measured by correctness of rules, flows, and state transitions rather than visual polish.

Unit testing must be thorough for all **high-priority** and **medium-priority** behaviors.

## 2. Testing requirement

At minimum, the implementation must include strong unit coverage for:

- spec validation
- cross-spec validation
- wizard step validation behavior
- immutable snapshot generation
- discovery manifest generation and verification
- applicant visibility policy enforcement
- admission state transitions
- approval timeout behavior
- acceptance timeout behavior
- applicant withdrawal behavior
- leave and re-acknowledgement behavior
- degraded state transitions
- dissolution rules
- inactivity expiration rules
- run cooldown enforcement
- compute budget cap enforcement
- all-members-online requirement
- mid-run disconnect abort behavior
- optional expulsion behavior if enabled
- persistence adapters
- protocol message validation
- signature/hash verification logic

## 3. Priority guidance

### 3.1 High-priority test areas
These should be comprehensive and treated as release-blocking:

- spec schema validation
- cross-spec compatibility validation
- network creation snapshot integrity
- join lifecycle logic
- consensus/approval logic
- membership change behavior
- degraded/dissolve logic
- run policy enforcement
- budget/cooldown enforcement
- manifest/hash verification

### 3.2 Medium-priority test areas
These should still be thorough, though less release-critical than the core contract flows:

- UI wizard progression rules
- template cloning and draft behavior
- import/export validation behavior
- operator UI metadata rendering helpers
- local persistence serialization logic
- non-sensitive event logging behavior

## 4. Suggested testing layers

### 4.1 Unit tests
Primary requirement for v1.
Cover business logic exhaustively.

### 4.2 Integration tests
Add for critical seams where feasible, especially:
- client ↔ spec validation boundary
- client ↔ discovery manifest boundary
- join flow progression
- persistence adapter behavior

### 4.3 End-to-end tests
Useful later, but not the primary quality gate for the first implementation. Logic-heavy unit coverage matters more right now.

## 5. State-machine testing

Where possible, model and test state transitions explicitly.

Examples:
- applicant lifecycle
- network lifecycle
- run lifecycle
- degraded/re-ack/dissolve lifecycle

These should be deterministic and verified with focused tests.

## 6. Negative-path testing

The project should include substantial negative-path testing.
Examples:
- invalid spec imports
- incompatible schema/computation pairings
- invalid visibility policy combinations
- timeout expiry
- malformed manifests
- bad signature or hash mismatch
- run initiation during cooldown
- run initiation above budget cap
- run initiation while required member offline

## 7. Testability preferences

The implementation should be structured to make business logic easy to test.

Recommendations:
- isolate pure validation logic
- isolate policy engines
- isolate state transition logic
- keep transport and storage thin around testable domain functions
- avoid burying critical logic inside UI components

## 8. Definition of done for v1 quality

A feature is not done until:
- happy path works
- relevant high/medium priority unit tests exist
- negative-path behavior is validated where important
- state transitions are deterministic and verified
- no sensitive data is unnecessarily logged or centralized

