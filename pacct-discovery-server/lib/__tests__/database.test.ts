import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DiscoveryDatabase } from '../db/database';

describe('DiscoveryDatabase', () => {
  let db: DiscoveryDatabase;

  beforeEach(() => {
    db = new DiscoveryDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('should create database with all tables', () => {
    const tables = db.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all() as { name: string }[];
    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain('networks');
    expect(tableNames).toContain('members');
    expect(tableNames).toContain('applicants');
    expect(tableNames).toContain('approval_votes');
    expect(tableNames).toContain('spec_manifests');
    expect(tableNames).toContain('network_manifests');
    expect(tableNames).toContain('presence');
    expect(tableNames).toContain('event_log');
  });

  it('should enable WAL journal mode (in-memory returns memory)', () => {
    const result = db.db.pragma('journal_mode') as { journal_mode: string }[];
    // WAL is set but in-memory databases report 'memory' as the journal mode
    expect(result[0].journal_mode).toBe('memory');
  });

  it('should enable foreign keys', () => {
    const result = db.db.pragma('foreign_keys') as { foreign_keys: number }[];
    expect(result[0].foreign_keys).toBe(1);
  });

  it('should allow inserting and querying networks', () => {
    const now = Date.now();
    db.db.prepare(
      'INSERT INTO networks (id, alias, status, creator_node_id, created_at, visibility_mode) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('net-1', 'Test Network', 'draft', 'node-1', now, 'none');

    const row = db.db.prepare('SELECT * FROM networks WHERE id = ?').get('net-1') as any;
    expect(row.alias).toBe('Test Network');
    expect(row.status).toBe('draft');
    expect(row.creator_node_id).toBe('node-1');
  });

  it('should allow inserting and querying members', () => {
    const now = Date.now();
    db.db.prepare(
      'INSERT INTO networks (id, alias, status, creator_node_id, created_at, visibility_mode) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('net-1', 'Test', 'draft', 'node-1', now, 'none');
    db.db.prepare(
      'INSERT INTO members (network_id, node_id, status, joined_at) VALUES (?, ?, ?, ?)'
    ).run('net-1', 'node-1', 'active', now);

    const rows = db.db.prepare('SELECT * FROM members WHERE network_id = ?').all('net-1') as any[];
    expect(rows).toHaveLength(1);
    expect(rows[0].node_id).toBe('node-1');
  });

  it('should allow inserting and querying applicants', () => {
    const now = Date.now();
    db.db.prepare(
      'INSERT INTO networks (id, alias, status, creator_node_id, created_at, visibility_mode) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('net-1', 'Test', 'draft', 'node-1', now, 'none');
    db.db.prepare(
      'INSERT INTO applicants (network_id, node_id, status, applied_at) VALUES (?, ?, ?, ?)'
    ).run('net-1', 'node-2', 'submitted', now);

    const row = db.db.prepare('SELECT * FROM applicants WHERE network_id = ? AND node_id = ?').get('net-1', 'node-2') as any;
    expect(row.status).toBe('submitted');
  });

  it('should allow inserting and querying approval votes', () => {
    const now = Date.now();
    db.db.prepare(
      'INSERT INTO networks (id, alias, status, creator_node_id, created_at, visibility_mode) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('net-1', 'Test', 'draft', 'node-1', now, 'none');
    db.db.prepare(
      'INSERT INTO approval_votes (network_id, applicant_node_id, voter_node_id, vote, timestamp) VALUES (?, ?, ?, ?, ?)'
    ).run('net-1', 'node-2', 'node-1', 'approve', now);

    const row = db.db.prepare('SELECT * FROM approval_votes WHERE network_id = ?').get('net-1') as any;
    expect(row.vote).toBe('approve');
  });

  it('should allow inserting and querying event log', () => {
    const now = Date.now();
    db.db.prepare(
      'INSERT INTO networks (id, alias, status, creator_node_id, created_at, visibility_mode) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('net-1', 'Test', 'draft', 'node-1', now, 'none');
    db.db.prepare(
      'INSERT INTO event_log (network_id, event_type, node_id, payload, timestamp) VALUES (?, ?, ?, ?, ?)'
    ).run('net-1', 'test_event', 'node-1', '{"key":"value"}', now);

    const rows = db.db.prepare('SELECT * FROM event_log WHERE network_id = ?').all('net-1') as any[];
    expect(rows).toHaveLength(1);
    expect(rows[0].event_type).toBe('test_event');
  });

  it('should allow inserting and querying presence', () => {
    db.db.prepare(
      'INSERT INTO presence (network_id, node_id, online, last_seen) VALUES (?, ?, ?, ?)'
    ).run('net-1', 'node-1', 1, Date.now());

    const row = db.db.prepare('SELECT * FROM presence WHERE network_id = ? AND node_id = ?').get('net-1', 'node-1') as any;
    expect(row.online).toBe(1);
  });

  it('should allow inserting and querying spec manifests', () => {
    const now = Date.now();
    db.db.prepare(
      'INSERT INTO networks (id, alias, status, creator_node_id, created_at, visibility_mode) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('net-1', 'Test', 'draft', 'node-1', now, 'none');
    db.db.prepare(
      'INSERT INTO spec_manifests (network_id, spec_type, spec_id, hash, version, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('net-1', 'schema', 'spec-1', 'abc123', '1.0.0', now);

    const row = db.db.prepare('SELECT * FROM spec_manifests WHERE network_id = ? AND spec_type = ?').get('net-1', 'schema') as any;
    expect(row.hash).toBe('abc123');
  });

  it('should allow inserting and querying network manifests', () => {
    const now = Date.now();
    db.db.prepare(
      'INSERT INTO networks (id, alias, status, creator_node_id, created_at, visibility_mode) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('net-1', 'Test', 'draft', 'node-1', now, 'none');
    db.db.prepare(
      'INSERT INTO network_manifests (network_id, schema_hash, computation_hash, governance_hash, economic_hash, creator_node_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run('net-1', 'sh1', 'ch1', 'gh1', 'eh1', 'node-1', now);

    const row = db.db.prepare('SELECT * FROM network_manifests WHERE network_id = ?').get('net-1') as any;
    expect(row.schema_hash).toBe('sh1');
  });
});
