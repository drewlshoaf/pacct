# PACCT v1 — Technical Preferences and Engineering Guidance

## 1. Core stack

### 1.1 `pacct-client`
Use:
- Next.js
- TypeScript
- React
- App Router

Rationale:
- one strong web stack for browser UI and server-mode operator experience
- easy shared TypeScript contracts
- strong ecosystem for forms, validation, and admin workflows

### 1.2 `pacct-discovery-server`
Also use:
- Next.js
- TypeScript

Rationale:
- shared team skillset
- easy operator UI
- route handlers are sufficient for v1 coordination APIs

This should be built as a lean coordination app, not a feature-heavy platform.

### 1.3 Shared packages
Use strict shared contracts through TypeScript packages.
Do not duplicate protocol or spec types across repos.

## 2. Runtime and transport

### 2.1 Peer communication
Use:
- WebRTC data channels

Rationale:
- supports browser nodes
- enables direct peer traffic
- keeps discovery server out of the data path

### 2.2 Signaling and presence
Use:
- WebSockets between client nodes and discovery server

Rationale:
- fit for signaling
- fit for presence/heartbeat state
- fit for join request and event updates

### 2.3 NAT traversal
Design for:
- STUN
- TURN compatibility later

The v1 architecture should not block future TURN support.

## 3. Persistence

### 3.1 Browser node mode
Use:
- IndexedDB for structured local persistence

Store:
- node metadata
- drafts
- accepted network snapshots
- join/application state
- lightweight local run metadata

Do not rely on localStorage except for trivial UI preferences.

### 3.2 Server node mode
Use:
- SQLite for structured local persistence
- filesystem-backed directories for datasets, exports, logs, and temp work

Configurable paths:
- data root
- imports
- exports
- temp/work
- logs

Rationale:
- operationally simple
- no external DB requirement for node operators
- good default backup and portability story

### 3.3 Discovery server persistence
Use:
- SQLite in v1

Store only coordination metadata.

## 4. Spec format and validation

### 4.1 Spec format
Use:
- JSON as canonical machine format
- YAML as optional import/export convenience

### 4.2 Validation
Use:
- Zod or equivalent TypeScript-first runtime validator

Use it for:
- spec validation
- cross-spec validation
- API payload validation
- wizard form validation

## 5. Forms and UI implementation

### 5.1 Forms
Use:
- React Hook Form
- Zod resolver integration

Rationale:
- excellent fit for wizard-based workflows
- strong form validation ergonomics
- low re-render overhead

### 5.2 UI approach
For v1:
- keep the UI simple
- minimal component abstraction
- optimize for clarity, workflow transparency, and debuggability

Do not overbuild a design system yet.
Styling will come later through `pacct-design`.

## 6. State management

Use:
- local React state for screen-local concerns
- TanStack Query for remote/distributed state where appropriate

Avoid a heavy global state framework unless a concrete need emerges.

## 7. Node identity and signing

Human/operator auth is out of scope in v1.

However, keep node-level cryptographic identity.

Each node should generate:
- keypair
- stable node ID derived from that identity

Use for:
- network creation signatures
- join approvals
- acceptance acknowledgements
- manifest/signature checks
- important protocol messages

Do not add in v1:
- username/password auth
- SSO
- enterprise IAM
- RBAC

## 8. Computation implementation guidance

V1 computation should remain narrow and deterministic.

Support:
- regression only
- one target field
- multiple feature fields
- numeric score outputs only

Implementation guidance:
- keep computation declarative
- no arbitrary user code execution
- no embedded scripting engine
- no dynamic compute plugins in v1

The computation engine should execute only supported validated computation specs.

## 9. Logging and observability

### 9.1 Client
Add:
- local event log
- join lifecycle log
- run lifecycle log
- peer connection diagnostics

### 9.2 Discovery server
Add:
- network event log
- join request log
- presence/heartbeat log
- operator-visible health indicators

Never log raw datasets or result contents.

## 10. API and protocol guidance

### 10.1 Internal API style
Use:
- typed JSON payloads
- shared contracts from `pacct-protocol-ts`

Keep APIs explicit and conservative.

### 10.2 Versioning
Version important contracts:
- protocol version
- spec version
- manifest version

## 11. Deployment guidance

### 11.1 Client
Support:
- browser-hosted usage
- Node/server-hosted usage

### 11.2 Discovery server
Deploy as:
- a straightforward web/service app
- simple enough for a single operator to run

Do not require Kubernetes, distributed buses, or complex infra in v1.

## 12. Shared package boundaries

### 12.1 `pacct-protocol-ts`
Should contain:
- message types
- manifests
- lifecycle enums
- event payload contracts
- identity/signature interfaces

### 12.2 `pacct-specs`
Should contain:
- spec definitions
- validators
- template structures
- import/export helpers
- cross-spec compatibility checks

Keep app/business logic in the application repos.
Do not overstuff shared packages.

