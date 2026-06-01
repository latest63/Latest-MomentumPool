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
