/**
 * SportAPI (rapidsportapi) client — fetches live football matches & incidents
 * Docs: https://rapidapi.com/rapidsportapi/api/sportapi7
 *
 * Base: https://sportapi7.p.rapidapi.com
 * Auth: X-RapidAPI-Key (set via RAPIDAPI_KEY env var)
 */

const BASE = 'https://sportapi7.p.rapidapi.com';

function headers(): Record<string, string> {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) throw new Error('RAPIDAPI_KEY env var not set');
  return {
    'X-RapidAPI-Key': key,
    'X-RapidAPI-Host': 'sportapi7.p.rapidapi.com',
  };
}

/* ─── Types ─────────────────────────────────────────────────────────── */

export interface SportApiTeam {
  name: string;
  shortName?: string;
  slug?: string;
  sport?: { name: string };
  nameCode?: string;
  id?: number;
  country?: { name: string };
}

export interface SportApiIncident {
  id: number;
  incidentType: string; // "goal" | "card" | "substitution" | "period" | "missedPenalty" | …
  incidentClass: string; // "regular" | "yellow" | "red" | "yellow_red" | "ownGoal" | "penalty" | …
  player?: { name: string };
  homeScore?: string;
  awayScore?: string;
  lastUpdated?: number;
  team?: string; // "home" | "away"
  minute: number;
  reason?: string;
  text?: string;
  time?: number; // seconds into match
}

export interface SportApiStatus {
  code: number;
  description: string;
  type: 'inprogress' | 'finished' | 'notstarted' | 'postponed' | 'canceled' | 'interrupted';
}

export interface SportApiMatch {
  id: number;
  homeTeam: SportApiTeam;
  awayTeam: SportApiTeam;
  homeScore: { current: number; normaltime?: number; period1?: number; period2?: number };
  awayScore: { current: number; normaltime?: number; period1?: number; period2?: number };
  status: SportApiStatus;
  startTimestamp: number;
  roundInfo?: { round: number };
  tournament?: { name: string; slug: string; uniqueTournament: { id: number; name: string } };
  season?: { id: number; year: string };
  customId?: string;
  winnerCode?: number; // 0=draw, 1=home, 2=away
  detailedScore?: { home: number; away: number };
}

export interface SportApiIncidentResponse {
  incidents: SportApiIncident[];
  hasNextPage: boolean;
}

export interface SportApiEventsResponse {
  events: SportApiMatch[];
}

/* ─── Sport → Momentum mapping ─────────────────────────────────────── */

export type MomentumEventType =
  | 'goal'
  | 'woodwork'
  | 'shot_on_target'
  | 'corner'
  | 'foul'
  | 'yellow_card'
  | 'red_card';

/**
 * Map SportAPI incident to our momentum event type.
 */
export function mapIncidentToMomentum(inc: SportApiIncident): MomentumEventType | null {
  const type = inc.incidentType;
  const cls = inc.incidentClass;

  if (type === 'goal') return 'goal';
  if (type === 'card') {
    if (cls === 'yellow' || cls === 'yellow_red') return 'yellow_card';
    if (cls === 'red') return 'red_card';
    return 'yellow_card';
  }
  if (type === 'missedPenalty') return 'woodwork';
  if (type === 'shot' || type === 'shotOnTarget') return 'shot_on_target';
  if (type === 'corner') return 'corner';
  if (type === 'foul') return 'foul';
  if (type === 'substitution' || type === 'subst') return null; // no momentum impact
  if (type === 'period') return null; // halftime/fulltime markers
  if (type === 'var') return null;
  if (type === 'freeKick') return 'foul';
  if (type === 'savedShot') return 'shot_on_target';
  if (type === 'chance') return 'shot_on_target';

  return null;
}

/**
 * Map SportAPI status to half notation.
 */
export function mapStatusToHalf(status: SportApiStatus): string {
  if (status.type === 'notstarted') return 'pre';
  if (status.type === 'finished') return 'fulltime';
  if (status.type === 'postponed' || status.type === 'canceled') return 'pre';
  // inprogress — derive half from description or code
  const desc = status.description?.toLowerCase() || '';
  if (desc.includes('half time') || desc.includes('halftime') || desc.includes('ht')) return 'halftime';
  if (desc.includes('2nd half') || desc.includes('second half')) return 'second';
  if (desc.includes('1st half') || desc.includes('first half')) return 'first';
  if (desc.includes('extra time')) return 'second';
  return 'first';
}

export function statusToHalf(status: SportApiStatus): string {
  if (status.type === 'notstarted') return 'pre';
  if (status.type === 'finished') return 'fulltime';
  if (status.type === 'postponed' || status.type === 'canceled') return 'pre';

  // Derive from status code
  // Common codes: 0=notstarted, 1=inprogress(1st), 2=halftime, 3=inprogress(2nd), 4=finished, 5=postponed...
  const code = status.code;
  if (code === 1) return 'first';
  if (code === 2) return 'halftime';
  if (code === 3) return 'second';
  if (code >= 4) return 'fulltime';

  return 'first';
}

/* ─── API calls ─────────────────────────────────────────────────────── */

/**
 * Fetch all live (in-progress) football matches.
 */
export async function fetchLiveMatches(): Promise<SportApiMatch[]> {
  const res = await fetch(`${BASE}/api/v1/sport/football/events/live`, {
    headers: headers(),
    cache: 'no-store',
  });
  if (!res.ok) {
    console.warn(`SportAPI live events returned ${res.status}`);
    return [];
  }
  const data: SportApiEventsResponse = await res.json();
  return data.events ?? [];
}

/**
 * Fetch scheduled football matches for a specific date.
 */
export async function fetchScheduledMatches(date: string): Promise<SportApiMatch[]> {
  const url = `${BASE}/api/v1/sport/football/scheduled-events/${date}`;
  const res = await fetch(url, { headers: headers(), cache: 'no-store' });
  if (!res.ok) {
    console.warn(`SportAPI scheduled events returned ${res.status}`);
    return [];
  }
  const data: SportApiEventsResponse = await res.json();
  return data.events ?? [];
}

/**
 * Fetch match detail info.
 */
export async function fetchMatchDetail(matchId: number): Promise<SportApiMatch | null> {
  const res = await fetch(`${BASE}/api/v1/event/${matchId}`, {
    headers: headers(),
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json();
}

/**
 * Fetch match incidents (goals, cards, subs, etc.).
 */
export async function fetchMatchIncidents(matchId: number): Promise<SportApiIncident[]> {
  const res = await fetch(`${BASE}/api/v1/event/${matchId}/incidents`, {
    headers: headers(),
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const data: SportApiIncidentResponse = await res.json();
  return data.incidents ?? [];
}

/**
 * Get today's date as YYYY-MM-DD.
 */
export function todayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
