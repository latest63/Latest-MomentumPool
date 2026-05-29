/**
 * Football-data.org client — World Cup schedule + team info
 * Free tier: 10 req/min, 1,000 req/day
 */
export interface FdTeam {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

export interface FdMatch {
  id: number;
  utcDate: string;
  status: string; // SCHEDULED | TIMED | IN_PLAY | PAUSED | FINISHED | SUSPENDED | POSTPONED | CANCELLED
  matchday: number;
  stage: string;
  group?: string;
  homeTeam: FdTeam;
  awayTeam: FdTeam;
  score: {
    winner: string | null;
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
  };
  lastUpdated: string;
}

const BASE = 'https://api.football-data.org/v4';

function headers() {
  const token = process.env.FOOTBALL_DATA_KEY;
  if (!token) throw new Error('FOOTBALL_DATA_KEY env not set');
  return { 'X-Auth-Token': token };
}

/**
 * Fetch all World Cup 2026 matches.
 * Competition ID 2000 = FIFA World Cup.
 */
export async function fetchWorldCupMatches(): Promise<FdMatch[]> {
  const res = await fetch(`${BASE}/competitions/2000/matches`, {
    headers: headers(),
    next: { revalidate: 3600 }, // cache 1 hour — schedule barely changes
  });
  if (!res.ok) {
    console.warn(`football-data returned ${res.status}`);
    return [];
  }
  const data = await res.json();
  return data.matches ?? [];
}

/**
 * Fetch a single match by ID.
 */
export async function fetchFdMatch(matchId: number): Promise<FdMatch | null> {
  const res = await fetch(`${BASE}/matches/${matchId}`, {
    headers: headers(),
    next: { revalidate: 300 }, // 5 min cache for scores
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data ?? null;
}

/**
 * Convert football-data.org status to our half format.
 */
export function fdStatusToHalf(status: string): string {
  switch (status) {
    case 'SCHEDULED':
    case 'TIMED':
      return 'pre';
    case 'IN_PLAY':
      return 'first';
    case 'PAUSED':
      return 'halftime';
    case 'FINISHED':
      return 'fulltime';
    default:
      return 'pre';
  }
}
