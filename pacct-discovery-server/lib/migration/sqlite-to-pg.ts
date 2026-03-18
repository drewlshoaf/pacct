import Database from 'better-sqlite3';
import { Pool } from 'pg';

export interface MigrationResult {
  networks: number;
  members: number;
  applicants: number;
  votes: number;
  specManifests: number;
  networkManifests: number;
  events: number;
  errors: string[];
}

export async function migrateSqliteToPostgres(
  sqlitePath: string,
  pgPool: Pool,
): Promise<MigrationResult> {
  const db = new Database(sqlitePath, { readonly: true });
  const result: MigrationResult = {
    networks: 0,
    members: 0,
    applicants: 0,
    votes: 0,
    specManifests: 0,
    networkManifests: 0,
    events: 0,
    errors: [],
  };

  try {
    // Migrate networks
    const networks = db.prepare('SELECT * FROM networks').all() as any[];
    for (const n of networks) {
      try {
        await pgPool.query(
          `INSERT INTO networks (id, alias, status, creator_node_id, created_at, activated_at, dissolved_at, visibility_mode, visibility_config, min_active_members, pre_activation_timeout_ms, post_activation_inactivity_timeout_ms)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (id) DO NOTHING`,
          [n.id, n.alias, n.status, n.creator_node_id, n.created_at, n.activated_at, n.dissolved_at, n.visibility_mode, n.visibility_config, n.min_active_members, n.pre_activation_timeout_ms, n.post_activation_inactivity_timeout_ms],
        );
        result.networks++;
      } catch (err) {
        result.errors.push(`Network ${n.id}: ${err}`);
      }
    }

    // Migrate members
    const members = db.prepare('SELECT * FROM members').all() as any[];
    for (const m of members) {
      try {
        await pgPool.query(
          `INSERT INTO members (network_id, node_id, status, joined_at, left_at, acknowledged_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (network_id, node_id) DO NOTHING`,
          [m.network_id, m.node_id, m.status, m.joined_at, m.left_at, m.acknowledged_at],
        );
        result.members++;
      } catch (err) {
        result.errors.push(`Member ${m.network_id}/${m.node_id}: ${err}`);
      }
    }

    // Migrate applicants
    const applicants = db.prepare('SELECT * FROM applicants').all() as any[];
    for (const a of applicants) {
      try {
        await pgPool.query(
          `INSERT INTO applicants (network_id, node_id, status, applied_at, approved_at, accepted_at, rejected_at, withdrawn_at, expired_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (network_id, node_id) DO NOTHING`,
          [a.network_id, a.node_id, a.status, a.applied_at, a.approved_at, a.accepted_at, a.rejected_at, a.withdrawn_at, a.expired_at],
        );
        result.applicants++;
      } catch (err) {
        result.errors.push(`Applicant ${a.network_id}/${a.node_id}: ${err}`);
      }
    }

    // Migrate votes
    const votes = db.prepare('SELECT * FROM approval_votes').all() as any[];
    for (const v of votes) {
      try {
        await pgPool.query(
          `INSERT INTO approval_votes (network_id, applicant_node_id, voter_node_id, vote, timestamp, signature)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (network_id, applicant_node_id, voter_node_id) DO NOTHING`,
          [v.network_id, v.applicant_node_id, v.voter_node_id, v.vote, v.timestamp, v.signature],
        );
        result.votes++;
      } catch (err) {
        result.errors.push(`Vote: ${err}`);
      }
    }

    // Migrate spec manifests
    const specManifests = db.prepare('SELECT * FROM spec_manifests').all() as any[];
    for (const sm of specManifests) {
      try {
        await pgPool.query(
          `INSERT INTO spec_manifests (network_id, spec_type, spec_id, hash, version, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (network_id, spec_type) DO NOTHING`,
          [sm.network_id, sm.spec_type, sm.spec_id, sm.hash, sm.version, sm.created_at],
        );
        result.specManifests++;
      } catch (err) {
        result.errors.push(`SpecManifest: ${err}`);
      }
    }

    // Migrate network manifests
    const networkManifests = db.prepare('SELECT * FROM network_manifests').all() as any[];
    for (const nm of networkManifests) {
      try {
        await pgPool.query(
          `INSERT INTO network_manifests (network_id, schema_hash, computation_hash, governance_hash, economic_hash, creator_node_id, signature, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (network_id) DO NOTHING`,
          [nm.network_id, nm.schema_hash, nm.computation_hash, nm.governance_hash, nm.economic_hash, nm.creator_node_id, nm.signature, nm.created_at],
        );
        result.networkManifests++;
      } catch (err) {
        result.errors.push(`NetworkManifest: ${err}`);
      }
    }

    // Migrate event log
    const events = db.prepare('SELECT * FROM event_log').all() as any[];
    for (const e of events) {
      try {
        // SQLite stores payload as a JSON string; parse it for PostgreSQL JSONB
        let payload = null;
        if (e.payload) {
          try {
            payload = JSON.parse(e.payload);
          } catch {
            payload = e.payload;
          }
        }
        await pgPool.query(
          `INSERT INTO event_log (network_id, event_type, node_id, payload, timestamp)
           VALUES ($1, $2, $3, $4, $5)`,
          [e.network_id, e.event_type, e.node_id, payload ? JSON.stringify(payload) : null, e.timestamp],
        );
        result.events++;
      } catch (err) {
        result.errors.push(`Event: ${err}`);
      }
    }

    // Note: presence data is NOT migrated since the old table used simple online/offline
    // and the new model uses lease-based presence. Nodes will simply re-heartbeat.
  } finally {
    db.close();
  }

  return result;
}
