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

// Serialized lock queue for memory-fallback mode (unit tests / local without DB)
let memoryDbLock: Promise<any> = Promise.resolve();

type DbAccess = {
  getDbAsync: () => Promise<DatabaseSchema>;
  saveDbAsync: (db: DatabaseSchema) => Promise<void>;
};

let registeredDbAccess: DbAccess | null = null;

export function registerDbAccess(access: DbAccess) {
  registeredDbAccess = access;
}

async function getFallbackDb(): Promise<DatabaseSchema> {
  if (registeredDbAccess) {
    return registeredDbAccess.getDbAsync();
  }
  if (globalThis.__jnsDbCache) {
    return globalThis.__jnsDbCache;
  }
  return {
    users: [],
    shows: [],
    productions: [],
    comments: [],
    auditLogs: [],
    meetings: [],
    improvements: [],
    anonymousProblemReports: [],
    showIdeas: [],
    equipmentRequests: [],
    systemSettings: {} as any,
    notifications: [],
    gearInventory: [],
    gearCheckouts: [],
    chatMessages: [],
  };
}

async function saveFallbackDb(data: DatabaseSchema): Promise<void> {
  if (registeredDbAccess) {
    return registeredDbAccess.saveDbAsync(data);
  }
  globalThis.__jnsDbCache = data;
}

/**
 * Row-Level Locking Helper:
 * In PostgreSQL: Locks a specific production row with SELECT ... FOR UPDATE within a transaction,
 * applies a mutation function, and persists the row-level update safely.
 * Concurrent updates to the same production are serialized to prevent race conditions.
 * In memory-fallback mode: Uses a serialized promise lock chain to guarantee atomicity.
 */
export async function updateProductionWithLock(
  productionId: string,
  mutateFn: (prod: Production) => Production | Promise<Production>
): Promise<Production> {
  const p = getPgPool();
  if (!p) {
    const current = memoryDbLock.then(async () => {
      const db = await getFallbackDb();
      const currentProd = db.productions.find((item) => item.id === productionId);
      if (!currentProd) {
        throw new Error(`Production not found: ${productionId}`);
      }
      const updated = await mutateFn(currentProd);
      const idx = db.productions.findIndex((item) => item.id === productionId);
      if (idx >= 0) {
        db.productions[idx] = updated;
      }
      await saveFallbackDb(db);
      return updated;
    });
    memoryDbLock = current.catch(() => {});
    return await current;
  }

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
        currentProd = fullState.productions.find((prod) => prod.id === productionId) || null;
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

    if (globalThis.__jnsDbCache?.productions) {
      const idx = globalThis.__jnsDbCache.productions.findIndex((prod) => prod.id === updated.id);
      if (idx >= 0) {
        globalThis.__jnsDbCache.productions[idx] = updated;
      } else {
        globalThis.__jnsDbCache.productions.unshift(updated);
      }
    }

    return updated;
  });
}

/**
 * Inserts a new production row inside a PostgreSQL transaction or memory lock.
 */
export async function insertProductionWithLock(newProd: Production): Promise<Production> {
  const p = getPgPool();
  if (!p) {
    const current = memoryDbLock.then(async () => {
      const db = await getFallbackDb();
      db.productions.unshift(newProd);
      await saveFallbackDb(db);
      return newProd;
    });
    memoryDbLock = current.catch(() => {});
    return await current;
  }

  return withTransaction(async (client) => {
    await client.query(
      `INSERT INTO productions (id, show_id, episode_number, title, type, status, current_stage, data, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        newProd.id,
        newProd.showId || null,
        newProd.episodeNumber || null,
        newProd.title,
        newProd.type,
        newProd.status,
        newProd.currentStage,
        JSON.stringify(newProd),
      ]
    );
    if (globalThis.__jnsDbCache?.productions) {
      globalThis.__jnsDbCache.productions.unshift(newProd);
    }
    return newProd;
  });
}

/**
 * Deletes a production row inside a PostgreSQL transaction or memory lock.
 */
export async function deleteProductionWithLock(productionId: string): Promise<boolean> {
  const p = getPgPool();
  if (!p) {
    const current = memoryDbLock.then(async () => {
      const db = await getFallbackDb();
      db.productions = db.productions.filter((prod) => prod.id !== productionId);
      db.comments = db.comments.filter((c) => c.productionId !== productionId);
      await saveFallbackDb(db);
      return true;
    });
    memoryDbLock = current.catch(() => {});
    return await current;
  }

  return withTransaction(async (client) => {
    await client.query('DELETE FROM productions WHERE id = $1', [productionId]);
    await client.query('DELETE FROM comments WHERE production_id = $1', [productionId]);
    if (globalThis.__jnsDbCache?.productions) {
      globalThis.__jnsDbCache.productions = globalThis.__jnsDbCache.productions.filter((prod) => prod.id !== productionId);
    }
    if (globalThis.__jnsDbCache?.comments) {
      globalThis.__jnsDbCache.comments = globalThis.__jnsDbCache.comments.filter((c) => c.productionId !== productionId);
    }
    return true;
  });
}

/**
 * Inserts an audit log entry atomically without full-state rewrite.
 */
export async function insertAuditLogWithLock(log: AuditLog): Promise<AuditLog> {
  const p = getPgPool();
  if (!p) {
    const current = memoryDbLock.then(async () => {
      const db = await getFallbackDb();
      db.auditLogs.unshift(log);
      await saveFallbackDb(db);
      return log;
    });
    memoryDbLock = current.catch(() => {});
    return await current;
  }

  return withTransaction(async (client) => {
    await client.query(
      `INSERT INTO audit_logs (id, production_id, user_id, action, data, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        log.id,
        log.productionId || null,
        log.userId,
        log.action,
        JSON.stringify(log),
        log.timestamp || new Date().toISOString(),
      ]
    );
    if (globalThis.__jnsDbCache?.auditLogs) {
      globalThis.__jnsDbCache.auditLogs.unshift(log);
    }
    return log;
  });
}

/**
 * Inserts an in-app notification atomically without full-state rewrite.
 */
export async function insertNotificationWithLock(notif: InAppNotification): Promise<InAppNotification> {
  const p = getPgPool();
  if (!p) {
    const current = memoryDbLock.then(async () => {
      const db = await getFallbackDb();
      db.notifications.unshift(notif);
      await saveFallbackDb(db);
      return notif;
    });
    memoryDbLock = current.catch(() => {});
    return await current;
  }

  return withTransaction(async (client) => {
    await client.query(
      `INSERT INTO notifications (id, user_id, data, created_at)
       VALUES ($1, $2, $3, $4)`,
      [
        notif.id,
        notif.userId,
        JSON.stringify(notif),
        notif.createdAt || new Date().toISOString(),
      ]
    );
    if (globalThis.__jnsDbCache?.notifications) {
      globalThis.__jnsDbCache.notifications.unshift(notif);
    }
    return notif;
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

        const snapshotState = snapshotRes.rows[0]?.state as DatabaseSchema | undefined;

        const productions: Production[] = prodsRes.rows.map((r) => r.data);
        const comments: Comment[] =
          commentsRes.rows.length > 0
            ? commentsRes.rows.map((r) => r.data)
            : (snapshotState?.comments || []);
        const auditLogs: AuditLog[] =
          auditRes.rows.length > 0
            ? auditRes.rows.map((r) => r.data)
            : (snapshotState?.auditLogs || []);
        const meetings: Meeting[] =
          meetingsRes.rows.length > 0
            ? meetingsRes.rows.map((r) => r.data)
            : (snapshotState?.meetings || []);
        const improvements: Improvement[] =
          impRes.rows.length > 0
            ? impRes.rows.map((r) => r.data)
            : (snapshotState?.improvements || []);
        const anonymousProblemReports: AnonymousProblemReport[] =
          probsRes.rows.length > 0
            ? probsRes.rows.map((r) => r.data)
            : (snapshotState?.anonymousProblemReports || []);
        const showIdeas: ShowIdea[] =
          ideasRes.rows.length > 0
            ? ideasRes.rows.map((r) => r.data)
            : (snapshotState?.showIdeas || []);
        const equipmentRequests: EquipmentRequest[] =
          eqRes.rows.length > 0
            ? eqRes.rows.map((r) => r.data)
            : (snapshotState?.equipmentRequests || []);
        const gearInventory: GearItem[] =
          gearRes.rows.length > 0
            ? gearRes.rows.map((r) => r.data)
            : (snapshotState?.gearInventory || []);
        const gearCheckouts: GearCheckoutRecord[] =
          chkRes.rows.length > 0
            ? chkRes.rows.map((r) => r.data)
            : (snapshotState?.gearCheckouts || []);
        const notifications: InAppNotification[] =
          notifRes.rows.length > 0
            ? notifRes.rows.map((r) => r.data)
            : (snapshotState?.notifications || []);
        const systemSettings: SystemSettings = settingsRes.rows[0]?.data || (snapshotState?.systemSettings as any);

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
          chatMessages: (snapshotState as any)?.chatMessages || [],
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

      // 6. Sync gear_inventory row-level
      if (Array.isArray(state.gearInventory)) {
        const itemIds: string[] = [];
        for (const item of state.gearInventory) {
          if (!item.id) continue;
          itemIds.push(item.id);
          await client.query(
            `INSERT INTO gear_inventory (id, name, category, status, data, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             ON CONFLICT (id) DO UPDATE SET
               name = EXCLUDED.name,
               category = EXCLUDED.category,
               status = EXCLUDED.status,
               data = EXCLUDED.data,
               updated_at = NOW()`,
            [
              item.id,
              item.name,
              item.category || null,
              item.status || 'AVAILABLE',
              JSON.stringify(item),
            ]
          );
        }
        if (itemIds.length > 0) {
          await client.query(
            `DELETE FROM gear_inventory WHERE id NOT IN (${itemIds.map((_, i) => `$${i + 1}`).join(', ')})`,
            itemIds
          );
        } else {
          await client.query('DELETE FROM gear_inventory');
        }
      }

      // 7. Sync gear_checkouts row-level
      if (Array.isArray(state.gearCheckouts)) {
        for (const chk of state.gearCheckouts) {
          if (!chk.id) continue;
          await client.query(
            `INSERT INTO gear_checkouts (id, gear_id, user_id, data, created_at)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO UPDATE SET
               gear_id = EXCLUDED.gear_id,
               user_id = EXCLUDED.user_id,
               data = EXCLUDED.data`,
            [
              chk.id,
              chk.gearItemId || null,
              chk.checkedOutToUserId || null,
              JSON.stringify(chk),
              chk.checkoutDate || new Date().toISOString(),
            ]
          );
        }
      }

      // 8. Sync comments row-level
      if (Array.isArray(state.comments)) {
        for (const c of state.comments) {
          if (!c.id) continue;
          await client.query(
            `INSERT INTO comments (id, production_id, user_id, text, data, created_at)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (id) DO UPDATE SET
               data = EXCLUDED.data`,
            [
              c.id,
              c.productionId,
              c.userId,
              c.content,
              JSON.stringify(c),
              c.createdAt || new Date().toISOString(),
            ]
          );
        }
      }

      // 9. Sync meetings
      if (Array.isArray(state.meetings)) {
        for (const m of state.meetings) {
          if (!m.id) continue;
          await client.query(
            `INSERT INTO meetings (id, date, data, updated_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (id) DO UPDATE SET
               date = EXCLUDED.date,
               data = EXCLUDED.data,
               updated_at = NOW()`,
            [m.id, m.date || null, JSON.stringify(m)]
          );
        }
      }

      // 10. Sync improvements
      if (Array.isArray(state.improvements)) {
        for (const imp of state.improvements) {
          if (!imp.id) continue;
          await client.query(
            `INSERT INTO improvements (id, title, status, data, created_at)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO UPDATE SET
               title = EXCLUDED.title,
               status = EXCLUDED.status,
               data = EXCLUDED.data`,
            [imp.id, imp.title, imp.status || null, JSON.stringify(imp), imp.createdAt || new Date().toISOString()]
          );
        }
      }

      // 11. Sync problem_reports
      if (Array.isArray(state.anonymousProblemReports)) {
        for (const rep of state.anonymousProblemReports) {
          if (!rep.id) continue;
          await client.query(
            `INSERT INTO problem_reports (id, title, status, data, created_at)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO UPDATE SET
               title = EXCLUDED.title,
               status = EXCLUDED.status,
               data = EXCLUDED.data`,
            [rep.id, rep.title, rep.status || null, JSON.stringify(rep), rep.createdAt || new Date().toISOString()]
          );
        }
      }

      // 12. Sync show_ideas
      if (Array.isArray(state.showIdeas)) {
        for (const idea of state.showIdeas) {
          if (!idea.id) continue;
          await client.query(
            `INSERT INTO show_ideas (id, title, status, data, created_at)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO UPDATE SET
               title = EXCLUDED.title,
               status = EXCLUDED.status,
               data = EXCLUDED.data`,
            [idea.id, idea.showName, idea.status || null, JSON.stringify(idea), idea.createdAt || new Date().toISOString()]
          );
        }
      }

      // 13. Sync equipment_requests
      if (Array.isArray(state.equipmentRequests)) {
        for (const eq of state.equipmentRequests) {
          if (!eq.id) continue;
          await client.query(
            `INSERT INTO equipment_requests (id, item_name, urgency, status, data, created_at)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO UPDATE SET
               item_name = EXCLUDED.item_name,
               urgency = EXCLUDED.urgency,
               status = EXCLUDED.status,
               data = EXCLUDED.data`,
            [eq.id, eq.itemName, eq.urgency || null, eq.status || null, JSON.stringify(eq), eq.createdAt || new Date().toISOString()]
          );
        }
      }

      return true;
    });
  } catch (err) {
    console.error('Failed to persist state to PostgreSQL:', err);
    return false;
  }
}
