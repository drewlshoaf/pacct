import type { DiscoveryDatabase } from '../database';

export interface SpecManifestRow {
  network_id: string;
  spec_type: string;
  spec_id: string;
  hash: string;
  version: string;
  created_at: number;
}

export interface NetworkManifestRow {
  network_id: string;
  schema_hash: string;
  computation_hash: string;
  governance_hash: string;
  economic_hash: string;
  creator_node_id: string;
  signature: string | null;
  created_at: number;
}

export interface StoreSpecManifestParams {
  networkId: string;
  specType: string;
  specId: string;
  hash: string;
  version: string;
}

export interface StoreNetworkManifestParams {
  networkId: string;
  schemaHash: string;
  computationHash: string;
  governanceHash: string;
  economicHash: string;
  creatorNodeId: string;
  signature?: string;
}

export class ManifestRepository {
  constructor(private database: DiscoveryDatabase) {}

  storeSpecManifest(params: StoreSpecManifestParams): SpecManifestRow {
    const now = Date.now();
    const stmt = this.database.db.prepare(`
      INSERT OR REPLACE INTO spec_manifests (network_id, spec_type, spec_id, hash, version, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(params.networkId, params.specType, params.specId, params.hash, params.version, now);
    return this.getSpecManifest(params.networkId, params.specType)!;
  }

  storeSpecManifests(manifests: StoreSpecManifestParams[]): SpecManifestRow[] {
    const results: SpecManifestRow[] = [];
    const insertMany = this.database.db.transaction((items: StoreSpecManifestParams[]) => {
      for (const params of items) {
        results.push(this.storeSpecManifest(params));
      }
    });
    insertMany(manifests);
    return results;
  }

  getSpecManifest(networkId: string, specType: string): SpecManifestRow | undefined {
    const stmt = this.database.db.prepare('SELECT * FROM spec_manifests WHERE network_id = ? AND spec_type = ?');
    return stmt.get(networkId, specType) as SpecManifestRow | undefined;
  }

  getSpecManifests(networkId: string): SpecManifestRow[] {
    const stmt = this.database.db.prepare('SELECT * FROM spec_manifests WHERE network_id = ? ORDER BY spec_type ASC');
    return stmt.all(networkId) as SpecManifestRow[];
  }

  storeNetworkManifest(params: StoreNetworkManifestParams): NetworkManifestRow {
    const now = Date.now();
    const stmt = this.database.db.prepare(`
      INSERT OR REPLACE INTO network_manifests (network_id, schema_hash, computation_hash, governance_hash, economic_hash, creator_node_id, signature, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      params.networkId,
      params.schemaHash,
      params.computationHash,
      params.governanceHash,
      params.economicHash,
      params.creatorNodeId,
      params.signature ?? null,
      now,
    );
    return this.getNetworkManifest(params.networkId)!;
  }

  getNetworkManifest(networkId: string): NetworkManifestRow | undefined {
    const stmt = this.database.db.prepare('SELECT * FROM network_manifests WHERE network_id = ?');
    return stmt.get(networkId) as NetworkManifestRow | undefined;
  }
}
