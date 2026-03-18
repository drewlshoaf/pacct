# PACCT v1 — Product and Architecture Specification

## 1. Objective

Build PACCT v1: a privacy-preserving collaborative analytics framework in which multiple members define and participate in governed computation networks, contribute locally owned data, run constrained multi-party computation, and receive owner-scoped outputs without centralizing raw data or full network control.

## 2. Core concepts

### 2.1 PACCT
**Privacy Preserving Analytics via Collaborative Computation and Thresholding**.

### 2.2 Industry-agnostic scope
PACCT must not hardcode education or any other domain into the platform model. Domain examples can be provided through templates, sample specs, and documentation, but the architecture itself must remain generic.

### 2.3 Single-owner data, multi-party computation
Each record belongs to exactly one member. Computation happens collectively across participants.

### 2.4 Immutable governed network contract
A network is created from four immutable spec snapshots:

- Schema Spec
- Computation Spec
- Governance Spec
- Economic Spec

Once bound to a network, these snapshots are immutable for that network.

## 3. Repositories

### 3.1 `pacct-client`
Primary node application.

Stack:
- Next.js
- TypeScript
- React
- App Router

Modes:
- browser node mode
- server/node mode

Responsibilities:
- network creation wizard
- spec studio
- dataset import and validation
- join request workflow
- local persistence
- peer participation in signaling and computation
- results reconstruction and export
- diagnostics and status UI

### 3.2 `pacct-discovery-server`
Metadata-only discovery and coordination service.

Stack:
- Next.js
- TypeScript

Responsibilities:
- network registration and discovery
- invite/join coordination
- presence/heartbeat metadata
- join request metadata
- spec manifest metadata and hashes
- operator UI
- signaling/bootstrap support

Must **not** store:
- raw datasets
- full network specs
- record-level results
- model outputs

### 3.3 `pacct-protocol-ts`
Shared TypeScript package for:
- protocol message types
- lifecycle enums
- manifests
- network/member/run state types
- node identity primitives
- signature/hash contracts
- event payload contracts

### 3.4 `pacct-specs`
Shared TypeScript package for:
- schema spec definitions
- computation spec definitions
- governance spec definitions
- economic spec definitions
- validators
- example templates
- import/export helpers
- cross-spec compatibility checks

### 3.5 `pacct-design`
Create now.
Not part of the functional v1 build.
Will later receive style files, visual references, and design assets.

## 4. Discovery server responsibility boundary

The discovery server should remain intentionally light.

It should persist only:
- network IDs
- network aliases/names
- current status
- creator node ID
- current member IDs
- applicant states
- spec manifest hashes/IDs
- visibility policy summaries
- presence metadata
- operator events/logs
- timestamps

It should not persist:
- datasets
- full specs
- result payloads
- record-level information

## 5. Spec custody model

### 5.1 Local authoring
Specs are authored, templated, imported, and edited locally in clients.

### 5.2 Immutable binding
At network creation, the four bound specs become immutable network snapshots.

### 5.3 Client replication
Bound snapshots are replicated to participating clients.

### 5.4 Discovery server manifests
The discovery server stores only manifests and hashes for those bound specs, not the full documents.

## 6. No fork support
PACCT v1 does not support network forking.

If participants want a materially different network contract, they create a brand-new network.

## 7. Lifecycle model

Suggested network states:
- draft
- pending
- active
- degraded
- dissolved
- archived

Rules:
- a network may exist with fewer than 3 members
- it cannot run computations until minimum active membership is met
- if active acknowledged membership drops below minimum threshold, it dissolves
- dissolved networks do not reactivate
- any new configuration requires a new network

## 8. Membership behavior

### 8.1 Leave
Any active member may leave unilaterally.

Effects:
- current runs abort
- network enters degraded state
- remaining members are notified
- re-acknowledgement is required before further runs
- if active acknowledged membership drops below minimum threshold, the network dissolves

### 8.2 Offline is not leave
Offline is a temporary operational condition, not a membership change.

Offline:
- does not change membership
- blocks runs if required members are unavailable
- may recover normally if the node reconnects

### 8.3 Rejoin
A former member may reapply through the normal join process.
Treat rejoin as a new admission event.

### 8.4 Expulsion
PACCT v1 should support an optional governance-controlled expulsion capability.
If enabled:
- it must be explicit in the governance spec
- it must have its own approval threshold schedule
- it should require a reason
- expulsion should trigger the same degrade/re-ack behavior as voluntary leave

## 9. Inactivity and dissolution

Two inactivity timers are required:

### 9.1 Pre-activation timeout
If a network never becomes operational, it should auto-dissolve after the configured pre-activation window.

### 9.2 Post-activation inactivity timeout
If no successful run completes within the configured inactivity window, the network should auto-dissolve.

Dissolution is permanent for that network.

## 10. Key product rules locked for v1

- one computation spec per network
- one target field per computation spec
- regression only
- numeric outputs only
- no classification labels
- no enterprise auth
- no full spec storage on discovery server
- wizard-first authoring
- templates + import + direct advanced editing support

