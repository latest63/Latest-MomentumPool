import postgres from 'postgres';

export interface MatchRecord {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeCode?: string;
  awayCode?: string;
  homeBadge?: string;
  awayBadge?: string;
  competition: string;
  group?: string;
  kickoff: number;
  half: string;
  status: string;
  poolAddress?: string;
  poolFactory?: string;
  settled?: boolean;
  winner?: number;
  homeScore?: number;
  awayScore?: number;
}

/** Singleton connection — reuses across hot reloads in dev */
let _sql: ReturnType<typeof postgres> | null = null;

function getSql() {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL not set');
    _sql = postgres(url, {
      max: 3,            // pool size — pooler handles the rest
      idle_timeout: 10,  // close idle connections after 10s
      max_lifetime: 60,  // recycle after 60s
      ssl: 'require',
    });
  }
  return _sql;
}

/** Get all matches */
export async function getAllMatches(): Promise<MatchRecord[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM matches ORDER BY kickoff ASC NULLS FIRST
  `;
  return rows.map(matchRow);
}

/** Get match by ID */
export async function getMatch(id: string): Promise<MatchRecord | undefined> {
  const sql = getSql();
  const [row] = await sql`
    SELECT * FROM matches WHERE id = ${id}
  `;
  return row ? matchRow(row) : undefined;
}

/** Add or update a match */
export async function upsertMatch(match: MatchRecord): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO matches ${sql({
      id: match.id,
      home_team: match.homeTeam,
      away_team: match.awayTeam,
      home_code: match.homeCode ?? null,
      away_code: match.awayCode ?? null,
      home_badge: match.homeBadge ?? null,
      away_badge: match.awayBadge ?? null,
      competition: match.competition,
      group_name: match.group ?? null,
      kickoff: match.kickoff,
      half: match.half,
      status: match.status,
      pool_address: match.poolAddress ?? null,
      pool_factory: match.poolFactory ?? null,
      settled: match.settled ?? false,
      winner: match.winner ?? null,
      home_score: match.homeScore ?? null,
      away_score: match.awayScore ?? null,
    })}
    ON CONFLICT (id) DO UPDATE SET
      home_team      = EXCLUDED.home_team,
      away_team      = EXCLUDED.away_team,
      home_code      = EXCLUDED.home_code,
      away_code      = EXCLUDED.away_code,
      home_badge     = EXCLUDED.home_badge,
      away_badge     = EXCLUDED.away_badge,
      competition    = EXCLUDED.competition,
      group_name     = EXCLUDED.group_name,
      kickoff        = EXCLUDED.kickoff,
      half           = EXCLUDED.half,
      status         = EXCLUDED.status,
      pool_address   = EXCLUDED.pool_address,
      pool_factory   = EXCLUDED.pool_factory,
      settled        = EXCLUDED.settled,
      winner         = EXCLUDED.winner,
      home_score     = EXCLUDED.home_score,
      away_score     = EXCLUDED.away_score
  `;
}

/** Delete match */
export async function deleteMatch(id: string): Promise<void> {
  const sql = getSql();
  await sql`
    DELETE FROM matches WHERE id = ${id}
  `;
}

/** Update settlement for a match */
export async function settleMatch(
  id: string,
  winner: number,
  homeScore: number,
  awayScore: number
): Promise<void> {
  const sql = getSql();
  await sql`
    UPDATE matches
    SET settled = true,
        winner  = ${winner},
        home_score = ${homeScore},
        away_score = ${awayScore},
        half    = 'fulltime',
        status  = 'settled'
    WHERE id = ${id}
  `;
}

/* ─── Row mapper ────────────────────────────────────── */

function matchRow(row: any): MatchRecord {
  return {
    id: row.id,
    homeTeam: row.home_team,
    awayTeam: row.away_team,
    homeCode: row.home_code ?? undefined,
    awayCode: row.away_code ?? undefined,
    homeBadge: row.home_badge ?? undefined,
    awayBadge: row.away_badge ?? undefined,
    competition: row.competition,
    group: row.group_name ?? undefined,
    kickoff: row.kickoff,
    half: row.half,
    status: row.status,
    poolAddress: row.pool_address ?? undefined,
    poolFactory: row.pool_factory ?? undefined,
    settled: row.settled,
    winner: row.winner ?? undefined,
    homeScore: row.home_score ?? undefined,
    awayScore: row.away_score ?? undefined,
  };
}
