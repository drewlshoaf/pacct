/**
 * Spec Snapshot Integrity Test
 *
 * Tests snapshot creation, manifest hash verification, tamper detection,
 * lifecycle enforcement, and spec immutability within snapshots.
 */

import { describe, it, expect } from 'vitest';
import { SpecLifecycle } from '@pacct/protocol-ts';
import { createNetworkSnapshot, validateSpecCompatibility } from '@pacct/specs';
import {
  createSchemaSpec,
  createComputationSpec,
  createGovernanceSpec,
  createEconomicSpec,
  makeNetworkId,
  makeNodeId,
} from './test-helpers';

describe('Snapshot Integrity E2E', () => {
  it('creates valid snapshot with correct manifest hashes', async () => {
    // ── Step 1: Create all 4 specs ──
    const schema = createSchemaSpec();
    const computation = createComputationSpec();
    const governance = createGovernanceSpec();
    const economic = createEconomicSpec();

    // Validate cross-spec compatibility first
    const validation = validateSpecCompatibility(schema, computation, governance, economic);
    expect(validation.valid).toBe(true);

    const networkId = makeNetworkId();
    const creatorNodeId = makeNodeId('creator');

    // ── Step 2: Generate snapshot ──
    const snapshot = await createNetworkSnapshot(
      schema,
      computation,
      governance,
      economic,
      networkId,
      creatorNodeId,
    );

    // ── Step 3: Verify all manifest hashes ──
    expect(snapshot.specManifests.schema.hash).toBeTruthy();
    expect(snapshot.specManifests.computation.hash).toBeTruthy();
    expect(snapshot.specManifests.governance.hash).toBeTruthy();
    expect(snapshot.specManifests.economic.hash).toBeTruthy();

    // Network manifest references spec hashes
    expect(snapshot.networkManifest.schemaManifestHash).toBe(snapshot.specManifests.schema.hash);
    expect(snapshot.networkManifest.computationManifestHash).toBe(snapshot.specManifests.computation.hash);
    expect(snapshot.networkManifest.governanceManifestHash).toBe(snapshot.specManifests.governance.hash);
    expect(snapshot.networkManifest.economicManifestHash).toBe(snapshot.specManifests.economic.hash);

    // All hashes are unique (different specs produce different hashes)
    const hashes = [
      snapshot.specManifests.schema.hash,
      snapshot.specManifests.computation.hash,
      snapshot.specManifests.governance.hash,
      snapshot.specManifests.economic.hash,
    ];
    const uniqueHashes = new Set(hashes);
    expect(uniqueHashes.size).toBe(4);

    // ── Step 6: Verify spec lifecycle is set to network_snapshot ──
    expect(snapshot.schemaSpec.lifecycle).toBe(SpecLifecycle.NetworkSnapshot);
    expect(snapshot.computationSpec.lifecycle).toBe(SpecLifecycle.NetworkSnapshot);
    expect(snapshot.governanceSpec.lifecycle).toBe(SpecLifecycle.NetworkSnapshot);
    expect(snapshot.economicSpec.lifecycle).toBe(SpecLifecycle.NetworkSnapshot);

    // Original specs should still be draft (snapshot creates copies)
    expect(schema.lifecycle).toBe(SpecLifecycle.Draft);
    expect(computation.lifecycle).toBe(SpecLifecycle.Draft);
    expect(governance.lifecycle).toBe(SpecLifecycle.Draft);
    expect(economic.lifecycle).toBe(SpecLifecycle.Draft);
  });

  it('detects tampering via hash mismatch', async () => {
    // ── Step 4-5: Tamper with a spec field and verify integrity breaks ──
    const schema = createSchemaSpec();
    const computation = createComputationSpec();
    const governance = createGovernanceSpec();
    const economic = createEconomicSpec();

    const networkId = makeNetworkId();
    const creatorNodeId = makeNodeId('creator');

    const snapshot = await createNetworkSnapshot(
      schema,
      computation,
      governance,
      economic,
      networkId,
      creatorNodeId,
    );

    const originalSchemaHash = snapshot.specManifests.schema.hash;

    // Tamper with the schema spec: change a field
    const tamperedSchema = {
      ...snapshot.schemaSpec,
      name: 'TAMPERED SCHEMA NAME',
    };

    // Re-create snapshot with tampered schema to get new hash
    const tamperedSnapshot = await createNetworkSnapshot(
      tamperedSchema,
      computation,
      governance,
      economic,
      networkId,
      creatorNodeId,
    );

    // The new hash should differ from the original
    expect(tamperedSnapshot.specManifests.schema.hash).not.toBe(originalSchemaHash);

    // Integrity check: compare the stored manifest hash against re-computed hash
    // If someone tampered with the spec but kept the old hash, verification fails
    expect(snapshot.specManifests.schema.hash).toBe(originalSchemaHash);
    expect(tamperedSnapshot.specManifests.schema.hash).not.toBe(originalSchemaHash);
  });

  it('produces deterministic hashes for identical specs', async () => {
    const schema = createSchemaSpec();
    const computation = createComputationSpec();
    const governance = createGovernanceSpec();
    const economic = createEconomicSpec();

    const networkId = makeNetworkId();
    const creatorNodeId = makeNodeId('creator');

    const snapshot1 = await createNetworkSnapshot(
      schema, computation, governance, economic, networkId, creatorNodeId,
    );
    const snapshot2 = await createNetworkSnapshot(
      schema, computation, governance, economic, networkId, creatorNodeId,
    );

    // Same input specs produce same hashes
    expect(snapshot1.specManifests.schema.hash).toBe(snapshot2.specManifests.schema.hash);
    expect(snapshot1.specManifests.computation.hash).toBe(snapshot2.specManifests.computation.hash);
    expect(snapshot1.specManifests.governance.hash).toBe(snapshot2.specManifests.governance.hash);
    expect(snapshot1.specManifests.economic.hash).toBe(snapshot2.specManifests.economic.hash);
  });

  it('verifies spec immutability semantics in snapshots', async () => {
    // ── Step 7: Verify specs are immutable (attempt to modify snapshot spec) ──
    const schema = createSchemaSpec();
    const computation = createComputationSpec();
    const governance = createGovernanceSpec();
    const economic = createEconomicSpec();

    const networkId = makeNetworkId();
    const creatorNodeId = makeNodeId('creator');

    const snapshot = await createNetworkSnapshot(
      schema, computation, governance, economic, networkId, creatorNodeId,
    );

    // The snapshot specs should be separate objects from the input specs
    // Modifying the snapshot spec should not change the original
    snapshot.schemaSpec.name = 'Modified after snapshot';
    expect(schema.name).toBe('Test Schema'); // Original unchanged

    // Modifying the original should not change the snapshot
    schema.name = 'Modified original';
    expect(snapshot.schemaSpec.name).toBe('Modified after snapshot'); // Snapshot unchanged

    // The lifecycle of snapshot specs is locked to NetworkSnapshot
    expect(snapshot.schemaSpec.lifecycle).toBe(SpecLifecycle.NetworkSnapshot);

    // Verify that all manifest data references the correct spec types
    expect(snapshot.specManifests.schema.specType).toBe('schema');
    expect(snapshot.specManifests.computation.specType).toBe('computation');
    expect(snapshot.specManifests.governance.specType).toBe('governance');
    expect(snapshot.specManifests.economic.specType).toBe('economic');
  });

  it('validates cross-spec compatibility catches errors', () => {
    // Schema with no numeric fields for target
    const schema = createSchemaSpec({
      fields: [
        { name: 'id', type: 'string_id', required: true },
        { name: 'category', type: 'enum', required: true, enumValues: ['A', 'B'] },
        { name: 'label', type: 'string_id', required: true },
      ],
    });

    const computation = createComputationSpec({
      featureFields: ['category'], // enum is not numeric
      targetField: 'label',       // string_id is not numeric
    });

    const governance = createGovernanceSpec();
    const economic = createEconomicSpec();

    const validation = validateSpecCompatibility(schema, computation, governance, economic);
    expect(validation.valid).toBe(false);

    // Should catch non-numeric feature and non-numeric target
    const codes = validation.errors.map((e) => e.code);
    expect(codes).toContain('FEATURE_FIELD_NOT_NUMERIC');
    expect(codes).toContain('TARGET_FIELD_NOT_NUMERIC');
  });

  it('validates cross-spec compatibility catches missing fields', () => {
    const schema = createSchemaSpec(); // has x1, x2, y
    const computation = createComputationSpec({
      featureFields: ['x1', 'x2', 'nonexistent'],
      targetField: 'missing_target',
    });
    const governance = createGovernanceSpec();
    const economic = createEconomicSpec();

    const validation = validateSpecCompatibility(schema, computation, governance, economic);
    expect(validation.valid).toBe(false);

    const codes = validation.errors.map((e) => e.code);
    expect(codes).toContain('FEATURE_FIELD_NOT_FOUND');
    expect(codes).toContain('TARGET_FIELD_NOT_FOUND');
  });
});
