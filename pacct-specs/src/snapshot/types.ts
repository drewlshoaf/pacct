import type { NetworkId, Timestamp, SpecManifest, NetworkManifest } from '@pacct/protocol-ts';
import type { SchemaSpec } from '../schema/types';
import type { ComputationSpec } from '../computation/types';
import type { GovernanceSpec } from '../governance/types';
import type { EconomicSpec } from '../economic/types';

export interface NetworkSnapshot {
  networkId: NetworkId;
  schemaSpec: SchemaSpec;
  computationSpec: ComputationSpec;
  governanceSpec: GovernanceSpec;
  economicSpec: EconomicSpec;
  specManifests: {
    schema: SpecManifest;
    computation: SpecManifest;
    governance: SpecManifest;
    economic: SpecManifest;
  };
  networkManifest: NetworkManifest;
  createdAt: Timestamp;
}
