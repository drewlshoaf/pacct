import { describe, it, expect } from 'vitest';
import { createNetworkSnapshot } from '../snapshot';
import {
  SpecLifecycle,
  ComputationType,
  EconomicMode,
  VisibilityMode,
  RunInitiationMode,
  DisconnectBehavior,
} from '@pacct/protocol-ts';
import type { SpecId, NetworkId, NodeId } from '@pacct/protocol-ts';
import type { SchemaSpec } from '../schema';
import type { ComputationSpec } from '../computation';
import type { GovernanceSpec } from '../governance';
import type { EconomicSpec } from '../economic';

const now = Date.now();

function makeSchemaSpec(): SchemaSpec {
  return {
    specId: 'schema-1' as SpecId,
    lifecycle: SpecLifecycle.Draft,
    version: '1.0.0',
    name: 'Test Schema',
    fields: [
      { name: 'user_id', type: 'string_id', required: true },
      { name: 'age', type: 'integer', required: true },
      { name: 'score', type: 'float', required: true },
    ],
    identifierFieldName: 'user_id',
    createdAt: now,
    updatedAt: now,
  };
}

function makeComputationSpec(): ComputationSpec {
  return {
    specId: 'comp-1' as SpecId,
    lifecycle: SpecLifecycle.Draft,
    version: '1.0.0',
    name: 'Test Computation',
    computationType: ComputationType.Regression,
    featureFields: ['age'],
    targetField: 'score',
    outputConfig: { revealMode: 'coefficients', normalize: true },
    createdAt: now,
    updatedAt: now,
  };
}

function makeGovernanceSpec(): GovernanceSpec {
  return {
    specId: 'gov-1' as SpecId,
    lifecycle: SpecLifecycle.Draft,
    version: '1.0.0',
    name: 'Test Governance',
    membershipPolicy: { minActiveMembers: 3 },
    visibilityPolicy: { mode: VisibilityMode.Full },
    joinPolicy: { approvalTimeoutMs: 86400000, acceptanceTimeoutMs: 86400000 },
    consensusPolicy: {
      admissionSchedule: [{ memberCountMin: 1, memberCountMax: 10, threshold: 1.0 }],
      dissolutionThreshold: 0.75,
    },
    runPolicy: {
      initiationMode: RunInitiationMode.RestrictedManual,
      allowedInitiators: 'any_member',
      minimumIntervalMs: 3600000,
      maxRunsPerPeriod: 10,
      periodLengthDays: 30,
      requireCostEstimate: false,
      allMembersOnlineRequired: true,
      midRunDisconnectBehavior: DisconnectBehavior.Abort,
    },
    dissolutionPolicy: {
      preActivationTimeoutMs: 604800000,
      postActivationInactivityTimeoutMs: 2592000000,
    },
    createdAt: now,
    updatedAt: now,
  };
}

function makeEconomicSpec(): EconomicSpec {
  return {
    specId: 'econ-1' as SpecId,
    lifecycle: SpecLifecycle.Draft,
    version: '1.0.0',
    name: 'Test Economic',
    economicMode: EconomicMode.Progressive,
    costAllocation: { fixedCostPerRun: 0, variableCostEnabled: false },
    summary: 'Equal sharing',
    createdAt: now,
    updatedAt: now,
  };
}

describe('createNetworkSnapshot', () => {
  const networkId = 'network-1' as NetworkId;
  const creatorNodeId = 'node-1' as NodeId;

  it('should create a valid network snapshot', async () => {
    const snapshot = await createNetworkSnapshot(
      makeSchemaSpec(),
      makeComputationSpec(),
      makeGovernanceSpec(),
      makeEconomicSpec(),
      networkId,
      creatorNodeId,
    );

    expect(snapshot.networkId).toBe(networkId);
    expect(snapshot.networkManifest.creatorNodeId).toBe(creatorNodeId);
    expect(snapshot.specManifests.schema).toBeDefined();
    expect(snapshot.specManifests.computation).toBeDefined();
    expect(snapshot.specManifests.governance).toBeDefined();
    expect(snapshot.specManifests.economic).toBeDefined();
  });

  it('should set lifecycle to network_snapshot on all specs', async () => {
    const snapshot = await createNetworkSnapshot(
      makeSchemaSpec(),
      makeComputationSpec(),
      makeGovernanceSpec(),
      makeEconomicSpec(),
      networkId,
      creatorNodeId,
    );

    expect(snapshot.schemaSpec.lifecycle).toBe(SpecLifecycle.NetworkSnapshot);
    expect(snapshot.computationSpec.lifecycle).toBe(SpecLifecycle.NetworkSnapshot);
    expect(snapshot.governanceSpec.lifecycle).toBe(SpecLifecycle.NetworkSnapshot);
    expect(snapshot.economicSpec.lifecycle).toBe(SpecLifecycle.NetworkSnapshot);
  });

  it('should produce deterministic hashes for same input', async () => {
    const schema = makeSchemaSpec();
    const comp = makeComputationSpec();
    const gov = makeGovernanceSpec();
    const econ = makeEconomicSpec();

    const snapshot1 = await createNetworkSnapshot(schema, comp, gov, econ, networkId, creatorNodeId);
    const snapshot2 = await createNetworkSnapshot(schema, comp, gov, econ, networkId, creatorNodeId);

    expect(snapshot1.specManifests.schema.hash).toBe(snapshot2.specManifests.schema.hash);
    expect(snapshot1.specManifests.computation.hash).toBe(snapshot2.specManifests.computation.hash);
    expect(snapshot1.specManifests.governance.hash).toBe(snapshot2.specManifests.governance.hash);
    expect(snapshot1.specManifests.economic.hash).toBe(snapshot2.specManifests.economic.hash);
  });

  it('should produce valid manifest hashes (64 char hex)', async () => {
    const snapshot = await createNetworkSnapshot(
      makeSchemaSpec(),
      makeComputationSpec(),
      makeGovernanceSpec(),
      makeEconomicSpec(),
      networkId,
      creatorNodeId,
    );

    const hexRegex = /^[0-9a-f]{64}$/;
    expect(snapshot.specManifests.schema.hash).toMatch(hexRegex);
    expect(snapshot.specManifests.computation.hash).toMatch(hexRegex);
    expect(snapshot.specManifests.governance.hash).toMatch(hexRegex);
    expect(snapshot.specManifests.economic.hash).toMatch(hexRegex);
  });

  it('should produce different hashes for different specs', async () => {
    const snapshot = await createNetworkSnapshot(
      makeSchemaSpec(),
      makeComputationSpec(),
      makeGovernanceSpec(),
      makeEconomicSpec(),
      networkId,
      creatorNodeId,
    );

    const hashes = new Set([
      snapshot.specManifests.schema.hash,
      snapshot.specManifests.computation.hash,
      snapshot.specManifests.governance.hash,
      snapshot.specManifests.economic.hash,
    ]);
    expect(hashes.size).toBe(4);
  });

  it('should set correct spec types in manifests', async () => {
    const snapshot = await createNetworkSnapshot(
      makeSchemaSpec(),
      makeComputationSpec(),
      makeGovernanceSpec(),
      makeEconomicSpec(),
      networkId,
      creatorNodeId,
    );

    expect(snapshot.specManifests.schema.specType).toBe('schema');
    expect(snapshot.specManifests.computation.specType).toBe('computation');
    expect(snapshot.specManifests.governance.specType).toBe('governance');
    expect(snapshot.specManifests.economic.specType).toBe('economic');
  });
});
