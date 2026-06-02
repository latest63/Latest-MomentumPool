import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || '';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: DATABASE_URL });
  }
  return pool;
}

export type DeployedPoolRow = {
  pool_address: string;
  match_id: string;
  home_team: string;
  away_team: string;
  token_address: string;
  created_at: string;
};

/** Insert a deployed pool record (idempotent — ignores on conflict). */
export async function insertDeployedPool(
  poolAddress: string,
  matchId: string,
  homeTeam: string,
  awayTeam: string,
  tokenAddress: string = '',
): Promise<void> {
  if (!DATABASE_URL) return;
  try {
    const db = getPool();
    await db.query(
      `INSERT INTO deployed_pools (pool_address, match_id, home_team, away_team, token_address)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (pool_address) DO NOTHING`,
      [poolAddress.toLowerCase(), matchId, homeTeam, awayTeam, tokenAddress.toLowerCase()],
    );
  } catch (err) {
    console.error('[supabase] insert failed:', (err as Error).message);
  }
}

/** Fetch all deployed pools from Supabase (fallback). */
export async function getDeployedPools(): Promise<DeployedPoolRow[]> {
  if (!DATABASE_URL) return [];
  try {
    const db = getPool();
    const result = await db.query<DeployedPoolRow>(
      'SELECT * FROM deployed_pools ORDER BY created_at DESC',
    );
    return result.rows;
  } catch (err) {
    console.error('[supabase] query failed:', (err as Error).message);
    return [];
  }
}

/** Ensure engine_state table exists (safe to call repeatedly). */
async function ensureEngineStateTable(): Promise<void> {
  if (!DATABASE_URL) return;
  try {
    const db = getPool();
    await db.query(`
      CREATE TABLE IF NOT EXISTS engine_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  } catch (err) {
    console.error('[supabase] engine_state table creation failed:', (err as Error).message);
  }
}

/** Persist engine state to Supabase (upsert single row keyed "main"). */
export async function saveEngineState(value: string): Promise<void> {
  if (!DATABASE_URL) return;
  try {
    await ensureEngineStateTable();
    const db = getPool();
    await db.query(
      `INSERT INTO engine_state (key, value, updated_at)
       VALUES ('main', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
      [value],
    );
  } catch (err) {
    console.error('[supabase] engine_state save failed:', (err as Error).message);
  }
}

/** Load engine state from Supabase. Returns null if not found or on error. */
export async function loadEngineState(): Promise<string | null> {
  if (!DATABASE_URL) return null;
  try {
    await ensureEngineStateTable();
    const db = getPool();
    const result = await db.query<{ value: string }>(
      'SELECT value FROM engine_state WHERE key = $1',
      ['main'],
    );
    return result.rows[0]?.value ?? null;
  } catch (err) {
    console.error('[supabase] engine_state load failed:', (err as Error).message);
    return null;
  }
}

export type MatchState = {
  events: { minute: number; type: string; team: string; player: string }[];
  score: { home: number; away: number };
  goals: { home: number; away: number };
  momentumHome: number;
};

/** Persist match state (events + score + goals + momentum) to Supabase. */
export async function saveMatchState(matchId: string, state: MatchState): Promise<void> {
  if (!DATABASE_URL) return;
  try {
    await ensureEngineStateTable();
    const db = getPool();
    await db.query(
      `INSERT INTO engine_state (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      [`match-${matchId}`, JSON.stringify(state)],
    );
  } catch (err) {
    console.error('[supabase] match_state save failed:', (err as Error).message);
  }
}

/** Load match state from Supabase. Returns null if not found. */
export async function loadMatchState(matchId: string): Promise<MatchState | null> {
  if (!DATABASE_URL) return null;
  try {
    await ensureEngineStateTable();
    const db = getPool();
    const result = await db.query<{ value: string }>(
      'SELECT value FROM engine_state WHERE key = $1',
      [`match-${matchId}`],
    );
    if (result.rows[0]?.value) {
      return JSON.parse(result.rows[0].value);
    }
    return null;
  } catch (err) {
    console.error('[supabase] match_state load failed:', (err as Error).message);
    return null;
  }
}
