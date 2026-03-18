PACCT

Privacy Preserving Analytics via Collaborative Computation and Thresholding

PACCT is an industry-agnostic framework for collaborative analytics in environments where organizations have strong incentive to collaborate analytically, but raw data cannot be freely shared because of privacy, legal, fiduciary, ethical, or operational constraints.

> *Useful collaboration should not require surrendering raw data.*

Read the full [Manifesto: Knowledge Without Exposure](MANIFESTO.md) to understand why PACCT exists and the principles that guide its design.

---

How It Works

PACCT enables multiple institutions to participate in shared computation while each retains local custody of its own records. No raw data is pooled. Instead, computation is coordinated across participants under an explicit, immutable network contract.

Every network is defined by four spec snapshots:

| Spec | Purpose |
|------|---------|
| Schema | Defines field names, types, constraints, and validation rules |
| Computation | Defines what analytical operation runs (regression in v1), feature/target bindings, output rules |
| Governance | Defines membership, join approval, consensus thresholds, run policy, dissolution rules |
| Economic | Defines cost allocation mode and budget constraints |

Members join with informed consent. They review the specs, accept the terms, and participate in governed computation runs. The discovery layer coordinates membership and presence but never holds raw data, full specs, or computation results.

---

Architecture

```
                    ┌─────────────────────────┐
                    │   Discovery Server(s)   │
                    │  (metadata + signaling)  │
                    │      PostgreSQL DB       │
                    └────┬──────────┬─────────┘
                         │ REST/WS  │
              ┌──────────┘          └──────────┐
              ▼                                ▼
     ┌─────────────┐                  ┌─────────────┐
     │   Client A   │◄── WebRTC ────►│   Client B   │
     │ (owns data)  │   data channel  │ (owns data)  │
     └─────────────┘                  └─────────────┘
              ▲                                ▲
              │            WebRTC              │
              └────────────┬───────────────────┘
                           ▼
                  ┌─────────────┐
                  │   Client C   │
                  │ (owns data)  │
                  └─────────────┘
```

- Clients hold data locally, run local computation, exchange only aggregate statistics via WebRTC
- Discovery handles network registration, join coordination, presence, and signaling — stores only metadata and manifest hashes
- Computation uses federated regression: each node computes local summary statistics (X^T X, X^T y), the coordinator aggregates and solves — mathematically equivalent to computing on the combined dataset

---

Repository Structure

```
pacct/
├── pacct-protocol-ts/      Shared types, enums, messages, manifests
├── pacct-specs/             Spec definitions, validators, templates, import/export
├── pacct-client/            Next.js client application
├── pacct-discovery-server/  Next.js discovery/coordination service
├── pacct-design/            Design system reference (not part of v1 build)
└── v1_specs/                Original specification documents
```

#`pacct-protocol-ts`

Shared TypeScript package consumed by all other packages.

- Lifecycle enums: `NetworkStatus`, `MemberStatus`, `ApplicantStatus`, `RunStatus`
- Protocol message types with discriminated unions
- Manifest and snapshot types
- Node identity and signature interfaces
- Presence lease and health types
- Event payload contracts

#`pacct-specs`

Spec definition and validation engine.

- Zod validators for all four spec types
- Cross-spec compatibility validation
- Immutable network snapshot generation with SHA-256 hashing
- Templates: generic, education, healthcare
- JSON/YAML import and export

#`pacct-client`

Primary node application (Next.js + TypeScript + React).

- Domain engines — pure state machines for network lifecycle, membership, admission/consensus, run policy, expulsion, dissolution
- Computation engine — matrix operations, OLS regression, federated protocol (local summaries, aggregation, result distribution)
- Network orchestration — WebRTC-based run coordination with disconnect handling
- Persistence — `StorageAdapter` interface with IndexedDB (browser), SQLite (server), and memory backends
- Identity — Ed25519 keypair generation, signing, verification
- Transport — WebRTC peer manager, WebSocket signaling client, discovery HTTP client
- Dataset management — CSV/JSON parser, schema validation, type inference
- UI — 6-step network creation wizard, spec studio, network dashboard, join workflow, run management, settings
- Design system — Tailwind CSS with coral/stone/teal palette, dark mode, reusable UI components

#`pacct-discovery-server`

Metadata-only discovery and coordination service (Next.js + TypeScript + PostgreSQL).

- REST API — 14 route handlers for networks, members, applicants, votes, manifests, presence, events
- WebSocket signaling — presence heartbeats, join notifications, WebRTC relay
- PostgreSQL persistence — 8 tables with indexes, connection pooling, async repositories
- Lease-based presence — heartbeat-driven online/offline/stale detection, survives instance restarts
- Multi-instance support — stateless app design, shared DB, instance ID tracking
- Operator UI — network dashboard, member/applicant views, presence monitoring, health status, event log
- Migration tool — SQLite to PostgreSQL migration script

---

Quick Start

#Prerequisites

- Node.js >= 18
- pnpm
- PostgreSQL (for discovery server)

#Install

```bash
git clone <repo-url> pacct
cd pacct
pnpm install
```

#Build

```bash
pnpm build
```

#Test

```bash
pnpm test
```

#Set Up the Discovery Server Database

```bash
Start PostgreSQL (macOS with Homebrew)
brew services start postgresql

Create the database
createdb pacct_discovery

The schema is applied automatically on first server start
```

#Run

```bash
Terminal 1 — Discovery Server
cd pacct-discovery-server
pnpm dev -p 3001

Terminal 2 — Client
cd pacct-client
NEXT_PUBLIC_DISCOVERY_URL=http://localhost:3001 pnpm dev
```

- Client: http://localhost:3000
- Discovery Server: http://localhost:3001
- Discovery Operator UI: http://localhost:3001
- Health Check: http://localhost:3001/api/health

The client falls back to mock data if the discovery server is unreachable.

---

Discovery Server Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `DATABASE_URL` | `postgresql://localhost:5432/pacct_discovery` | PostgreSQL connection string |
| `DB_POOL_MAX` | `20` | Maximum connections in the pool |
| `LEASE_TIMEOUT_MS` | `90000` | How long a presence lease lasts (90s) |
| `LEASE_SWEEP_INTERVAL_MS` | `15000` | How often to sweep expired leases (15s) |
| `STALE_THRESHOLD_MS` | `60000` | Time before a node is marked stale (60s) |
| `INSTANCE_ID` | Auto-generated UUID | Identifier for this discovery instance |

#Multi-Instance Deployment

The discovery server is designed for multi-instance deployment behind a load balancer:

```
           ┌──────────────┐
           │ Load Balancer │
           └──┬───────┬───┘
              │       │
     ┌────────▼┐   ┌──▼───────┐
     │ Instance │   │ Instance │
     │    A     │   │    B     │
     └────┬────┘   └────┬─────┘
          │              │
          └──────┬───────┘
           ┌─────▼─────┐
           │ PostgreSQL │
           └───────────┘
```

All coordination state lives in PostgreSQL. Instances are stateless and interchangeable. Presence is lease-based — node heartbeats can hit any instance.

#Migrating from SQLite

If you have an existing SQLite-based discovery server:

```bash
cd pacct-discovery-server
npx tsx scripts/migrate.ts /path/to/old/discovery.db
```

---

Client Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `NEXT_PUBLIC_DISCOVERY_URL` | `http://localhost:3001` | Discovery server URL |

#Node Modes

The client supports two runtime modes:

- Browser mode — runs in the browser, uses IndexedDB for local persistence
- Server mode — runs as a Node.js process, uses SQLite for local persistence

Both modes keep data local. Raw records never leave the node.

---

Network Lifecycle

```
draft → pending → active → degraded → active (re-ack)
                    │          │
                    │          └→ dissolved (below minimum members)
                    │
                    └→ dissolved (unanimous vote or inactivity)
```

- A network requires minimum 3 active acknowledged members to run computation
- Leave is unilateral — triggers degraded state, remaining members must re-acknowledge
- Dissolution is permanent — a new network must be created
- Inactivity timers auto-dissolve stale networks (pre-activation and post-activation)

Join Flow

```
discover → apply → await approval → receive contract → verify hashes → accept → active member
```

Visibility before approval is configurable: full, partial (per-section), or none.

Run Lifecycle

```
pending → initializing → collecting → computing → distributing → completed
                                                                     │
                                                        (or) → aborted / failed
```

- Runs are restricted manual — explicitly initiated, no per-run voting
- Cooldown and budget caps enforced
- All required members must be online
- Mid-run disconnect aborts the run

---

Federated Computation

PACCT v1 implements federated linear regression via the normal equation:

1. Each node computes local summary statistics: X^T X, X^T y, n, sum(y), sum(y^2)
2. The coordinator aggregates summaries from all participants
3. The coordinator solves beta = (sum X^T X)^-1 (sum X^T y)
4. Global coefficients are distributed back to all participants

This is mathematically equivalent to computing on the combined dataset. Only aggregate statistics are exchanged — no individual records are revealed.

---

Testing

734 tests across 68 test files.

| Package | Tests | Coverage |
|---------|-------|----------|
| `pacct-protocol-ts` | 65 | Types, enums, messages, manifests, presence, health |
| `pacct-specs` | 83 | All validators, cross-spec, snapshots, templates, I/O |
| `pacct-client` | 473 | Engines, computation, persistence, identity, transport, datasets, integration, negative paths, workers |
| `pacct-discovery-server` | 113 | All repositories, lease engine, validators, health |

Test categories include:
- Unit tests for all high and medium priority logic
- Integration tests (full lifecycle, join flow, run policy, computation accuracy, governance)
- Negative-path tests (invalid specs, malformed messages, state violations, integrity, edge cases)
- Worker tests (inactivity, heartbeat, approval timeouts)

```bash
Run all tests
pnpm test

Run tests for a specific package
cd pacct-client && pnpm test

Watch mode
cd pacct-client && pnpm test:watch
```

---

API Reference

#Discovery Server REST API

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/networks` | Register a new network |
| `GET` | `/api/networks` | List networks (optional `?status=` filter) |
| `GET` | `/api/networks/:id` | Get network details |
| `PATCH` | `/api/networks/:id/status` | Update network status |
| `GET` | `/api/networks/:id/members` | List members |
| `POST` | `/api/networks/:id/members` | Add member |
| `PATCH` | `/api/networks/:id/members/:nodeId` | Update member status |
| `POST` | `/api/networks/:id/applicants` | Submit application |
| `GET` | `/api/networks/:id/applicants` | List applicants |
| `GET` | `/api/networks/:id/applicants/:nodeId` | Get applicant |
| `PATCH` | `/api/networks/:id/applicants/:nodeId` | Update applicant |
| `POST` | `/api/networks/:id/applicants/:nodeId/votes` | Cast approval vote |
| `GET` | `/api/networks/:id/applicants/:nodeId/votes` | Get votes |
| `GET` | `/api/networks/:id/manifests` | Get manifest hashes |
| `POST` | `/api/networks/:id/presence` | Send heartbeat |
| `GET` | `/api/networks/:id/presence` | Get presence with availability |
| `GET` | `/api/networks/:id/events` | Get event log (paginated) |
| `GET` | `/api/health` | Service health check |

All inputs are validated with Zod. All responses are typed JSON.

---

Privacy Boundary

This boundary is fundamental and non-negotiable.

The discovery server stores only:
- Network IDs, aliases, status
- Member and applicant node IDs and states
- Spec manifest hashes (not full specs)
- Visibility policy summaries
- Presence lease metadata
- Event log metadata

The discovery server never stores:
- Raw datasets
- Full spec documents
- Computation outputs or results
- Record-level values
- Model coefficients or predictions

Data custody remains with the clients. Always.

---

Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript (strict mode) |
| Client Framework | Next.js 14, React 18, App Router |
| Discovery Framework | Next.js 15, React 19, App Router |
| Validation | Zod |
| Forms | React Hook Form |
| Styling | Tailwind CSS |
| Client Persistence | IndexedDB (browser), SQLite (server) |
| Discovery Persistence | PostgreSQL |
| Peer Communication | WebRTC data channels |
| Signaling | WebSockets |
| Cryptography | Ed25519 (Web Crypto API) |
| Build | tsup (libraries), Next.js (apps) |
| Testing | Vitest |
| Package Manager | pnpm workspaces |

---

v1 Scope

Included:
- Wizard-driven network creation with spec-backed definitions
- Metadata-only discovery server with operator UI and multi-instance support
- Local draft/template/import spec workflows
- Immutable network snapshots with SHA-256 manifest verification
- Consensus-based join approval with configurable visibility
- Post-approval contract reveal and acceptance
- Dynamic membership with unilateral leave
- Degrade/re-acknowledge/dissolve lifecycle
- Restricted-manual runs with cooldown and budget caps
- Federated regression computation
- Browser and server node modes
- Dataset import, validation, and management
- Heartbeat/lease-based presence
- 734 tests covering all high and medium priority paths

Not included in v1:
- Enterprise identity/authentication
- Classification labels or multiple computation types
- Network forking
- Arbitrary user-authored compute scripts
- Full public template registry
- Discovery federation across independent authorities

---

License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
