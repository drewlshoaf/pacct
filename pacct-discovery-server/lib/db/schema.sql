-- Networks
CREATE TABLE IF NOT EXISTS networks (
  id TEXT PRIMARY KEY,
  alias TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  creator_node_id TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  activated_at BIGINT,
  dissolved_at BIGINT,
  updated_at BIGINT,
  visibility_mode TEXT NOT NULL DEFAULT 'none',
  visibility_config JSONB,
  min_active_members INTEGER NOT NULL DEFAULT 3,
  pre_activation_timeout_ms BIGINT,
  post_activation_inactivity_timeout_ms BIGINT
);

-- Members
CREATE TABLE IF NOT EXISTS members (
  network_id TEXT NOT NULL REFERENCES networks(id),
  node_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  joined_at BIGINT NOT NULL,
  left_at BIGINT,
  acknowledged_at BIGINT,
  PRIMARY KEY (network_id, node_id)
);

-- Applicants
CREATE TABLE IF NOT EXISTS applicants (
  network_id TEXT NOT NULL REFERENCES networks(id),
  node_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted',
  applied_at BIGINT NOT NULL,
  approved_at BIGINT,
  accepted_at BIGINT,
  rejected_at BIGINT,
  withdrawn_at BIGINT,
  expired_at BIGINT,
  approval_due_at BIGINT,
  acceptance_due_at BIGINT,
  PRIMARY KEY (network_id, node_id)
);

-- Approval Votes
CREATE TABLE IF NOT EXISTS approval_votes (
  network_id TEXT NOT NULL REFERENCES networks(id),
  applicant_node_id TEXT NOT NULL,
  voter_node_id TEXT NOT NULL,
  vote TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  signature TEXT,
  PRIMARY KEY (network_id, applicant_node_id, voter_node_id)
);

-- Spec Manifests
CREATE TABLE IF NOT EXISTS spec_manifests (
  network_id TEXT NOT NULL REFERENCES networks(id),
  spec_type TEXT NOT NULL,
  spec_id TEXT NOT NULL,
  hash TEXT NOT NULL,
  version TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  PRIMARY KEY (network_id, spec_type)
);

-- Network Manifests
CREATE TABLE IF NOT EXISTS network_manifests (
  network_id TEXT PRIMARY KEY REFERENCES networks(id),
  schema_hash TEXT NOT NULL,
  computation_hash TEXT NOT NULL,
  governance_hash TEXT NOT NULL,
  economic_hash TEXT NOT NULL,
  creator_node_id TEXT NOT NULL,
  signature TEXT,
  created_at BIGINT NOT NULL
);

-- Presence Leases (heartbeat/lease based)
CREATE TABLE IF NOT EXISTS presence_leases (
  network_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  last_heartbeat_at BIGINT NOT NULL,
  lease_expires_at BIGINT NOT NULL,
  instance_id TEXT,
  PRIMARY KEY (network_id, node_id)
);

-- Event Log
CREATE TABLE IF NOT EXISTS event_log (
  id SERIAL PRIMARY KEY,
  network_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  node_id TEXT,
  payload JSONB,
  timestamp BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_event_log_network ON event_log(network_id);
CREATE INDEX IF NOT EXISTS idx_event_log_timestamp ON event_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_presence_leases_expires ON presence_leases(lease_expires_at);
CREATE INDEX IF NOT EXISTS idx_members_network ON members(network_id);
CREATE INDEX IF NOT EXISTS idx_applicants_network ON applicants(network_id);
