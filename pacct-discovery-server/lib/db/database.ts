import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS networks (
  id TEXT PRIMARY KEY,
  alias TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  creator_node_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  activated_at INTEGER,
  dissolved_at INTEGER,
  visibility_mode TEXT NOT NULL DEFAULT 'none',
  visibility_config TEXT,
  min_active_members INTEGER NOT NULL DEFAULT 3,
  pre_activation_timeout_ms INTEGER,
  post_activation_inactivity_timeout_ms INTEGER
);

CREATE TABLE IF NOT EXISTS members (
  network_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  joined_at INTEGER NOT NULL,
  left_at INTEGER,
  acknowledged_at INTEGER,
  PRIMARY KEY (network_id, node_id),
  FOREIGN KEY (network_id) REFERENCES networks(id)
);

CREATE TABLE IF NOT EXISTS applicants (
  network_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted',
  applied_at INTEGER NOT NULL,
  approved_at INTEGER,
  accepted_at INTEGER,
  rejected_at INTEGER,
  withdrawn_at INTEGER,
  expired_at INTEGER,
  PRIMARY KEY (network_id, node_id),
  FOREIGN KEY (network_id) REFERENCES networks(id)
);

CREATE TABLE IF NOT EXISTS approval_votes (
  network_id TEXT NOT NULL,
  applicant_node_id TEXT NOT NULL,
  voter_node_id TEXT NOT NULL,
  vote TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  signature TEXT,
  PRIMARY KEY (network_id, applicant_node_id, voter_node_id),
  FOREIGN KEY (network_id) REFERENCES networks(id)
);

CREATE TABLE IF NOT EXISTS spec_manifests (
  network_id TEXT NOT NULL,
  spec_type TEXT NOT NULL,
  spec_id TEXT NOT NULL,
  hash TEXT NOT NULL,
  version TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (network_id, spec_type),
  FOREIGN KEY (network_id) REFERENCES networks(id)
);

CREATE TABLE IF NOT EXISTS network_manifests (
  network_id TEXT PRIMARY KEY,
  schema_hash TEXT NOT NULL,
  computation_hash TEXT NOT NULL,
  governance_hash TEXT NOT NULL,
  economic_hash TEXT NOT NULL,
  creator_node_id TEXT NOT NULL,
  signature TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (network_id) REFERENCES networks(id)
);

CREATE TABLE IF NOT EXISTS presence (
  network_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  online INTEGER NOT NULL DEFAULT 0,
  last_seen INTEGER NOT NULL,
  PRIMARY KEY (network_id, node_id)
);

CREATE TABLE IF NOT EXISTS event_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  network_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  node_id TEXT,
  payload TEXT,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (network_id) REFERENCES networks(id)
);
`;

export class DiscoveryDatabase {
  public db: Database.Database;

  constructor(dbPath?: string) {
    this.db = new Database(dbPath ?? ':memory:');
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.init();
  }

  private init(): void {
    this.db.exec(SCHEMA_SQL);
  }

  close(): void {
    this.db.close();
  }
}
