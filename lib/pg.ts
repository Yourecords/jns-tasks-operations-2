import { Pool } from 'pg';
import type { DatabaseSchema } from './db';

let pool: Pool | null = null;

export function getPgPool(): Pool | null {
  if (!process.env.DATABASE_URL) {
    return null;
  }
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pool;
}

export const INIT_SCHEMA_SQL = `
-- JNS Operations PostgreSQL Schema for Railway

CREATE TABLE IF NOT EXISTS system_metadata (
  key VARCHAR(64) PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(128) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(64) NOT NULL,
  job_function VARCHAR(64),
  position_display VARCHAR(128),
  is_active BOOLEAN DEFAULT true,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS shows (
  id VARCHAR(128) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  hosts VARCHAR(255),
  producer_id VARCHAR(128),
  recording_day VARCHAR(64),
  publication_day VARCHAR(64),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS productions (
  id VARCHAR(128) PRIMARY KEY,
  show_id VARCHAR(128),
  episode_number VARCHAR(64),
  title TEXT,
  type VARCHAR(64) NOT NULL,
  status VARCHAR(64) NOT NULL,
  current_stage VARCHAR(64) NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comments (
  id VARCHAR(128) PRIMARY KEY,
  production_id VARCHAR(128),
  author_id VARCHAR(128),
  author_name VARCHAR(255),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(128) PRIMARY KEY,
  production_id VARCHAR(128),
  user_id VARCHAR(128),
  user_name VARCHAR(255),
  action VARCHAR(128) NOT NULL,
  details TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS meetings (
  id VARCHAR(128) PRIMARY KEY,
  date DATE,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS improvements (
  id VARCHAR(128) PRIMARY KEY,
  title TEXT NOT NULL,
  status VARCHAR(64),
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS problem_reports (
  id VARCHAR(128) PRIMARY KEY,
  title TEXT NOT NULL,
  status VARCHAR(64),
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS show_ideas (
  id VARCHAR(128) PRIMARY KEY,
  title TEXT NOT NULL,
  status VARCHAR(64),
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS equipment_requests (
  id VARCHAR(128) PRIMARY KEY,
  item_name VARCHAR(255) NOT NULL,
  urgency VARCHAR(64),
  status VARCHAR(64),
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gear_inventory (
  id VARCHAR(128) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(64),
  status VARCHAR(64),
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gear_checkouts (
  id VARCHAR(128) PRIMARY KEY,
  gear_id VARCHAR(128),
  user_id VARCHAR(128),
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_settings (
  id VARCHAR(64) PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(128),
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Full State Store Table for snapshot consistency & lightning fast serialization
CREATE TABLE IF NOT EXISTS jns_app_state (
  key VARCHAR(64) PRIMARY KEY,
  state JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
`;

/**
 * Initializes tables in PostgreSQL if not already present.
 */
export async function initPostgresSchema(): Promise<boolean> {
  const p = getPgPool();
  if (!p) return false;

  try {
    const client = await p.connect();
    try {
      await client.query(INIT_SCHEMA_SQL);
      return true;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Failed to initialize PostgreSQL schema:', err);
    return false;
  }
}

/**
 * Loads entire DatabaseSchema from PostgreSQL if available.
 */
export async function loadStateFromPostgres(): Promise<DatabaseSchema | null> {
  const p = getPgPool();
  if (!p) return null;

  try {
    const res = await p.query('SELECT state FROM jns_app_state WHERE key = $1', ['current']);
    if (res.rows.length > 0 && res.rows[0].state) {
      return res.rows[0].state as DatabaseSchema;
    }
    return null;
  } catch (err) {
    console.error('Failed to load state from PostgreSQL:', err);
    return null;
  }
}

/**
 * Saves entire DatabaseSchema to PostgreSQL idempotently.
 */
export async function saveStateToPostgres(state: DatabaseSchema): Promise<boolean> {
  const p = getPgPool();
  if (!p) return false;

  try {
    await p.query(
      `INSERT INTO jns_app_state (key, state, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET
         state = EXCLUDED.state,
         updated_at = NOW()`,
      ['current', JSON.stringify(state)]
    );
    return true;
  } catch (err) {
    console.error('Failed to persist state to PostgreSQL:', err);
    return false;
  }
}
