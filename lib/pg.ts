import { Pool, PoolClient } from 'pg';
import type { DatabaseSchema } from './db';
import type {
  User,
  Show,
  Production,
  Comment,
  AuditLog,
  Meeting,
  Improvement,
  AnonymousProblemReport,
  ShowIdea,
  EquipmentRequest,
  GearItem,
  GearCheckoutRecord,
  SystemSettings,
  InAppNotification,
} from './types';

let pool: Pool | null = null;

export function getPgPool(): Pool | null {
  if (!process.env.DATABASE_URL) {
    return null;
  }
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

export const INIT_SCHEMA_SQL = `
-- JNS Operations PostgreSQL Production Schema

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

-- Snapshot state backup table
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
 * Runs a transactional database operation with automatic BEGIN, COMMIT, and ROLLBACK.
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const p = getPgPool();
  if (!p) {
    throw new Error('PostgreSQL pool not available');
  }

  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Row-Level Locking Helper:
 * Locks a specific production row with SELECT ... FOR UPDATE within a transaction,
 * applies a mutation function, and persists the row-level update safely.
 * Concurrent updates to the same production are serialized to prevent race conditions.
 */
export async function updateProductionWithLock(
  productionId: string,
  mutateFn: (prod: Production) => Production | Promise<Production>
): Promise<Production> {
  return withTransaction(async (client) => {
    const res = await client.query(
      'SELECT data FROM productions WHERE id = $1 FOR UPDATE',
      [productionId]
    );

    let currentProd: Production | null = null;
    if (res.rows.length > 0 && res.rows[0].data) {
      currentProd = res.rows[0].data as Production;
    } else {
      // Check snapshot if table row not yet created
      const stateRes = await client.query('SELECT state FROM jns_app_state WHERE key = $1 FOR UPDATE', ['current']);
      if (stateRes.rows.length > 0 && stateRes.rows[0].state) {
        const fullState = stateRes.rows[0].state as DatabaseSchema;
        currentProd = fullState.productions.find((p) => p.id === productionId) || null;
      }
    }

    if (!currentProd) {
      throw new Error(`Production not found: ${productionId}`);
    }

    const updated = await mutateFn(currentProd);

    // Row-level atomic upsert
    await client.query(
      `INSERT INTO productions (id, show_id, episode_number, title, type, status, current_stage, data, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (id) DO UPDATE SET
         show_id = EXCLUDED.show_id,
         episode_number = EXCLUDED.episode_number,
         title = EXCLUDED.title,
         type = EXCLUDED.type,
         status = EXCLUDED.status,
         current_stage = EXCLUDED.current_stage,
         data = EXCLUDED.data,
         updated_at = NOW()`,
      [
        updated.id,
        updated.showId || null,
        updated.episodeNumber || null,
        updated.title,
        updated.type,
        updated.status,
        updated.currentStage,
        JSON.stringify(updated),
      ]
    );

    return updated;
  });
}

/**
 * Loads entire DatabaseSchema from PostgreSQL tables as the single source of truth.
 */
export async function loadStateFromPostgres(): Promise<DatabaseSchema | null> {
  const p = getPgPool();
  if (!p) return null;

  try {
    // 1. Try reading directly from the structured row tables first
    const client = await p.connect();
    try {
      const [
        prodsRes,
        usersRes,
        showsRes,
        commentsRes,
        auditRes,
        meetingsRes,
        impRes,
        probsRes,
        ideasRes,
        eqRes,
        gearRes,
        chkRes,
        notifRes,
        settingsRes,
        snapshotRes,
      ] = await Promise.all([
        client.query('SELECT data FROM productions ORDER BY updated_at DESC'),
        client.query('SELECT * FROM users'),
        client.query('SELECT * FROM shows'),
        client.query('SELECT data FROM comments ORDER BY created_at DESC'),
        client.query('SELECT data FROM audit_logs ORDER BY timestamp DESC'),
        client.query('SELECT data FROM meetings ORDER BY updated_at DESC'),
        client.query('SELECT data FROM improvements ORDER BY created_at DESC'),
        client.query('SELECT data FROM problem_reports ORDER BY created_at DESC'),
        client.query('SELECT data FROM show_ideas ORDER BY created_at DESC'),
        client.query('SELECT data FROM equipment_requests ORDER BY created_at DESC'),
        client.query('SELECT data FROM gear_inventory ORDER BY updated_at DESC'),
        client.query('SELECT data FROM gear_checkouts ORDER BY created_at DESC'),
        client.query('SELECT data FROM notifications ORDER BY created_at DESC'),
        client.query("SELECT data FROM system_settings WHERE id = 'settings'"),
        client.query('SELECT state FROM jns_app_state WHERE key = $1', ['current']),
      ]);

      // If relational tables have data, compose them
      if (usersRes.rows.length > 0 || prodsRes.rows.length > 0) {
        const users: User[] = usersRes.rows.map((r) => ({
          id: r.id,
          email: r.email,
          name: r.name,
          fullName: r.full_name,
          role: r.role,
          jobFunction: r.job_function,
          positionDisplay: r.position_display,
          isActive: r.is_active,
          avatarUrl: r.avatar_url,
          createdAt: r.created_at?.toISOString?.() || r.created_at,
          metadata: r.metadata,
        }));

        const shows: Show[] = showsRes.rows.map((r) => ({
          id: r.id,
          name: r.name,
          status: (r.is_active === false ? 'INACTIVE' : 'ACTIVE') as any,
          hosts: r.hosts,
          producerId: r.producer_id,
          recordingDay: r.recording_day,
          publicationDay: r.publication_day,
          description: r.description,
          createdAt: r.created_at?.toISOString?.() || r.created_at,
        }));

        const productions: Production[] = prodsRes.rows.map((r) => r.data);
        const comments: Comment[] = commentsRes.rows.map((r) => r.data);
        const auditLogs: AuditLog[] = auditRes.rows.map((r) => r.data);
        const meetings: Meeting[] = meetingsRes.rows.map((r) => r.data);
        const improvements: Improvement[] = impRes.rows.map((r) => r.data);
        const anonymousProblemReports: AnonymousProblemReport[] = probsRes.rows.map((r) => r.data);
        const showIdeas: ShowIdea[] = ideasRes.rows.map((r) => r.data);
        const equipmentRequests: EquipmentRequest[] = eqRes.rows.map((r) => r.data);
        const gearInventory: GearItem[] = gearRes.rows.map((r) => r.data);
        const gearCheckouts: GearCheckoutRecord[] = chkRes.rows.map((r) => r.data);
        const notifications: InAppNotification[] = notifRes.rows.map((r) => r.data);
        const systemSettings: SystemSettings = settingsRes.rows[0]?.data || (snapshotRes.rows[0]?.state?.systemSettings);

        return {
          users,
          shows,
          productions,
          comments,
          auditLogs,
          meetings,
          improvements,
          anonymousProblemReports,
          showIdeas,
          equipmentRequests,
          gearInventory,
          gearCheckouts,
          systemSettings: systemSettings || ({} as any),
          notifications,
        };
      }

      // Fallback to snapshot store if tables haven't been migrated into relational rows yet
      if (snapshotRes.rows.length > 0 && snapshotRes.rows[0].state) {
        return snapshotRes.rows[0].state as DatabaseSchema;
      }

      return null;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Failed to load state from PostgreSQL:', err);
    return null;
  }
}

/**
 * Saves entire DatabaseSchema to PostgreSQL idempotently with atomic row upserts.
 */
export async function saveStateToPostgres(state: DatabaseSchema): Promise<boolean> {
  const p = getPgPool();
  if (!p) return false;

  try {
    return await withTransaction(async (client) => {
      // 1. Update snapshot store
      await client.query(
        `INSERT INTO jns_app_state (key, state, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET
           state = EXCLUDED.state,
           updated_at = NOW()`,
        ['current', JSON.stringify(state)]
      );

      // 2. Sync users row-level
      for (const u of state.users || []) {
        await client.query(
          `INSERT INTO users (id, email, name, full_name, role, job_function, position_display, is_active, avatar_url, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO UPDATE SET
             email = EXCLUDED.email,
             name = EXCLUDED.name,
             full_name = EXCLUDED.full_name,
             role = EXCLUDED.role,
             job_function = EXCLUDED.job_function,
             position_display = EXCLUDED.position_display,
             is_active = EXCLUDED.is_active,
             avatar_url = EXCLUDED.avatar_url`,
          [
            u.id,
            u.email,
            u.name,
            u.fullName || null,
            u.role,
            u.jobFunction || null,
            u.positionDisplay || null,
            u.isActive ?? true,
            u.avatarUrl || null,
            u.createdAt || new Date().toISOString(),
          ]
        );
      }

      // 3. Sync shows row-level
      for (const s of state.shows || []) {
        await client.query(
          `INSERT INTO shows (id, name, hosts, producer_id, recording_day, publication_day, description, is_active, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             hosts = EXCLUDED.hosts,
             producer_id = EXCLUDED.producer_id,
             recording_day = EXCLUDED.recording_day,
             publication_day = EXCLUDED.publication_day,
             description = EXCLUDED.description,
             is_active = EXCLUDED.is_active`,
          [
            s.id,
            s.name,
            s.hosts || null,
            s.producerId || null,
            s.recordingDay || null,
            s.publicationDay || null,
            s.description || null,
            s.status === 'ACTIVE',
            s.createdAt || new Date().toISOString(),
          ]
        );
      }

      // 4. Sync productions row-level
      for (const prod of state.productions || []) {
        await client.query(
          `INSERT INTO productions (id, show_id, episode_number, title, type, status, current_stage, data, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
           ON CONFLICT (id) DO UPDATE SET
             show_id = EXCLUDED.show_id,
             episode_number = EXCLUDED.episode_number,
             title = EXCLUDED.title,
             type = EXCLUDED.type,
             status = EXCLUDED.status,
             current_stage = EXCLUDED.current_stage,
             data = EXCLUDED.data,
             updated_at = NOW()`,
          [
            prod.id,
            prod.showId || null,
            prod.episodeNumber || null,
            prod.title,
            prod.type,
            prod.status,
            prod.currentStage,
            JSON.stringify(prod),
          ]
        );
      }

      // 5. Sync system settings
      if (state.systemSettings) {
        await client.query(
          `INSERT INTO system_settings (id, data, updated_at)
           VALUES ('settings', $1, NOW())
           ON CONFLICT (id) DO UPDATE SET
             data = EXCLUDED.data,
             updated_at = NOW()`,
          [JSON.stringify(state.systemSettings)]
        );
      }

      return true;
    });
  } catch (err) {
    console.error('Failed to persist state to PostgreSQL:', err);
    return false;
  }
}
