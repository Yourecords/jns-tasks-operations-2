import { initPostgresSchema, saveStateToPostgres, loadStateFromPostgres } from '../lib/pg';
import { getDb, resetToSeedData } from '../lib/db';

async function main() {
  console.log('--- JNS Production Railway PostgreSQL Migration & Seed ---');

  if (!process.env.DATABASE_URL) {
    console.log('Notice: DATABASE_URL is not defined in environment. Skipping PostgreSQL migration.');
    process.exit(0);
  }

  console.log('Connecting to PostgreSQL and creating schema tables...');
  const schemaReady = await initPostgresSchema();
  if (!schemaReady) {
    console.error('Migration failed: could not connect or apply schema.');
    process.exit(1);
  }
  console.log('✓ Schema tables created/verified successfully.');

  const existing = await loadStateFromPostgres();
  if (existing && existing.users && existing.users.length > 0) {
    console.log(`✓ PostgreSQL database already initialized with ${existing.users.length} users and ${existing.productions?.length || 0} productions.`);
  } else {
    console.log('Database is empty. Seeding initial JNS video production data...');
    const seed = resetToSeedData();
    const saved = await saveStateToPostgres(seed);
    if (saved) {
      console.log('✓ Successfully seeded initial database to PostgreSQL on Railway!');
    } else {
      console.error('✗ Failed to seed database to PostgreSQL.');
      process.exit(1);
    }
  }

  console.log('Migration completed successfully.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
