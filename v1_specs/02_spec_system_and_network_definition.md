# PACCT v1 — Spec System and Network Definition

## 1. Overview

PACCT is a spec-driven system.

Every network is defined by four immutable spec snapshots:

- Schema Spec
- Computation Spec
- Governance Spec
- Economic Spec

The network creation wizard is the primary authoring UX, but under the hood the system is creating these spec artifacts.

## 2. Spec lifecycle

PACCT spec artifacts should support the following conceptual states:

- Template
- Draft
- Published Spec
- Network Snapshot

### 2.1 Template
A reusable starting point.
May be built-in or user-authored.
Editable and clonable.

### 2.2 Draft
A user-editable working copy.
Can be created:
- from scratch
- from a built-in template
- from an imported spec file

### 2.3 Published Spec
A validated immutable spec artifact.
Versioned and ready for network use.

### 2.4 Network Snapshot
The exact immutable copy bound to a specific network.
This is the operative contract, not the source template or draft.

## 3. Authoring modes

### 3.1 Wizard-first authoring
Primary v1 UX.
The creator walks through a guided flow. The system generates specs behind the scenes.

### 3.2 Start from template
Users may choose built-in templates by category, such as:
- education
- healthcare
- finance
- military
- generic

Templates should be cloned into editable drafts.

### 3.3 Import
Advanced users may import spec files.
Supported model:
- JSON canonical
- YAML optional import/export convenience

Imported specs must pass validation before use.

## 4. Schema Spec

The Schema Spec defines:
- field names
- field types
- required/optional status
- value ranges
- enum/category constraints
- identifier field rules
- owner record model constraints

### 4.1 V1 supported field types
- integer
- float
- boolean
- enum/category
- string identifier

Avoid free-text computational fields in v1.

### 4.2 Industry agnostic design
Schema specs must not assume specific vertical field names. The system should support generic bindings that later map to domain use cases.

## 5. Computation Spec

The Computation Spec defines:
- computation type
- required input roles
- feature field bindings
- target field binding
- output structure
- reveal rules
- optional clipping/normalization settings
- validation rules tying computation to schema types

### 5.1 V1 computation scope
- one computation per network
- one target field
- multiple feature fields allowed
- regression only
- numeric score outputs only

### 5.2 Declarative, not programmable
Users should not write arbitrary code.
Computation specs must be declarative and constrained to supported validated structures.

## 6. Governance Spec

The Governance Spec defines:
- membership rules
- join approval thresholds
- applicant visibility policy
- approval timeout
- acceptance timeout
- leave behavior
- re-acknowledgement requirement
- minimum active members
- dissolution rules
- inactivity timeouts
- run policy
- action-specific consensus schedules
- optional expulsion policy

### 6.1 Suggested governance sections
- Membership Policy
- Visibility Policy
- Run Policy
- Dissolution Policy
- Consensus Policy
- Optional Removal Policy

## 7. Economic Spec

The Economic Spec defines:
- economic mode
- cost allocation parameters
- fixed vs variable cost structure
- budget/cap settings
- explanatory summaries

### 7.1 Supported economic modes in v1
- capitalist
- progressive
- socialist/hybrid

### 7.2 Orthogonality requirement
Run policy must remain orthogonal to economic mode.
The system must allow combinations such as:
- capitalist + restricted manual
- progressive + restricted manual
- socialist/hybrid + restricted manual

## 8. Cross-spec validation

The platform must validate both structure and logical compatibility.

### 8.1 Structural validation
Checks:
- required fields present
- types valid
- syntax valid
- enums and ranges well-formed

### 8.2 Logical validation
Checks:
- computation references fields that exist
- feature and target types are compatible with computation type
- minimum active members satisfy computation/runtime assumptions
- budget/cooldown rules are internally coherent
- timeout values are valid
- visibility policy values are valid

### 8.3 Cross-spec compatibility
Checks:
- computation spec matches schema spec
- governance assumptions do not violate computation/runtime assumptions
- economic and run policy fields do not conflict structurally

## 9. Network creation wizard structure

### Step 1 — Basics
- network name
- description
- optional category/use-case tag

### Step 2 — Schema
- define fields
- types
- required/optional
- validation preview

### Step 3 — Computation
- choose computation type
- choose feature fields
- choose target field
- choose reveal/output mode
- validate compatibility

### Step 4 — Governance
- membership thresholds
- visibility policy
- join timeout rules
- minimum active members
- inactivity dissolve rules
- run policy
- optional expulsion settings

### Step 5 — Economics
- select economic mode
- configure cost parameters
- configure budget caps

### Step 6 — Review
- render human-readable summary
- render raw spec preview
- creator acknowledgement
- create immutable network snapshots
- register network with discovery server

## 10. Human-readable vs raw views

At review time, show both:

### 10.1 Human-readable summary
For normal operators.

### 10.2 Raw spec preview
For advanced users and reviewers.

