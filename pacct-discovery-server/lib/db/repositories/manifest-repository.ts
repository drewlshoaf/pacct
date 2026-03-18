import { Pool } from 'pg';

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

function toSpecManifestRow(row: any): SpecManifestRow {
  return {
    ...row,
    created_at: Number(row.created_at),
  };
}

function toNetworkManifestRow(row: any): NetworkManifestRow {
  return {
    ...row,
    created_at: Number(row.created_at),
  };
}

export class ManifestRepository {
  constructor(private pool: Pool) {}

  async storeSpecManifest(params: StoreSpecManifestParams): Promise<SpecManifestRow> {
    const now = Date.now();
    await this.pool.query(
      `INSERT INTO spec_manifests (network_id, spec_type, spec_id, hash, version, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (network_id, spec_type)
       DO UPDATE SET spec_id = EXCLUDED.spec_id, hash = EXCLUDED.hash, version = EXCLUDED.version, created_at = EXCLUDED.created_at`,
      [params.networkId, params.specType, params.specId, params.hash, params.version, now],
    );
    return (await this.getSpecManifest(params.networkId, params.specType))!;
  }

  async storeSpecManifests(manifests: StoreSpecManifestParams[]): Promise<SpecManifestRow[]> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const results: SpecManifestRow[] = [];
      for (const params of manifests) {
        const now = Date.now();
        await client.query(
          `INSERT INTO spec_manifests (network_id, spec_type, spec_id, hash, version, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (network_id, spec_type)
           DO UPDATE SET spec_id = EXCLUDED.spec_id, hash = EXCLUDED.hash, version = EXCLUDED.version, created_at = EXCLUDED.created_at`,
          [params.networkId, params.specType, params.specId, params.hash, params.version, now],
        );
        const result = await client.query(
          'SELECT * FROM spec_manifests WHERE network_id = $1 AND spec_type = $2',
          [params.networkId, params.specType],
        );
        if (result.rows[0]) {
          results.push(toSpecManifestRow(result.rows[0]));
        }
      }
      await client.query('COMMIT');
      return results;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getSpecManifest(networkId: string, specType: string): Promise<SpecManifestRow | undefined> {
    const result = await this.pool.query(
      'SELECT * FROM spec_manifests WHERE network_id = $1 AND spec_type = $2',
      [networkId, specType],
    );
    return result.rows[0] ? toSpecManifestRow(result.rows[0]) : undefined;
  }

  async getSpecManifests(networkId: string): Promise<SpecManifestRow[]> {
    const result = await this.pool.query(
      'SELECT * FROM spec_manifests WHERE network_id = $1 ORDER BY spec_type ASC',
      [networkId],
    );
    return result.rows.map(toSpecManifestRow);
  }

  async storeNetworkManifest(params: StoreNetworkManifestParams): Promise<NetworkManifestRow> {
    const now = Date.now();
    await this.pool.query(
      `INSERT INTO network_manifests (network_id, schema_hash, computation_hash, governance_hash, economic_hash, creator_node_id, signature, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (network_id)
       DO UPDATE SET schema_hash = EXCLUDED.schema_hash, computation_hash = EXCLUDED.computation_hash, governance_hash = EXCLUDED.governance_hash, economic_hash = EXCLUDED.economic_hash, creator_node_id = EXCLUDED.creator_node_id, signature = EXCLUDED.signature, created_at = EXCLUDED.created_at`,
      [
        params.networkId,
        params.schemaHash,
        params.computationHash,
        params.governanceHash,
        params.economicHash,
        params.creatorNodeId,
        params.signature ?? null,
        now,
      ],
    );
    return (await this.getNetworkManifest(params.networkId))!;
  }

  async getNetworkManifest(networkId: string): Promise<NetworkManifestRow | undefined> {
    const result = await this.pool.query(
      'SELECT * FROM network_manifests WHERE network_id = $1',
      [networkId],
    );
    return result.rows[0] ? toNetworkManifestRow(result.rows[0]) : undefined;
  }
}
