import { migrateSqliteToPostgres } from '../lib/migration/sqlite-to-pg';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

async function main() {
  const sqlitePath = process.argv[2];
  if (!sqlitePath) {
    console.error('Usage: npx tsx scripts/migrate.ts <path-to-sqlite-db>');
    process.exit(1);
  }

  if (!fs.existsSync(sqlitePath)) {
    console.error(`SQLite database not found: ${sqlitePath}`);
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/pacct_discovery',
  });

  try {
    // Run schema first
    const schemaPath = path.join(__dirname, '../lib/db/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    await pool.query(schema);

    console.log('Migrating from SQLite to PostgreSQL...');
    const result = await migrateSqliteToPostgres(sqlitePath, pool);

    console.log('Migration complete:');
    console.log(`  Networks: ${result.networks}`);
    console.log(`  Members: ${result.members}`);
    console.log(`  Applicants: ${result.applicants}`);
    console.log(`  Votes: ${result.votes}`);
    console.log(`  Spec Manifests: ${result.specManifests}`);
    console.log(`  Network Manifests: ${result.networkManifests}`);
    console.log(`  Events: ${result.events}`);

    if (result.errors.length > 0) {
      console.error(`  Errors: ${result.errors.length}`);
      result.errors.forEach(e => console.error(`    - ${e}`));
    }
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
