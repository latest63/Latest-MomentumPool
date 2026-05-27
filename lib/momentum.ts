/**
 * Momentum Engine — shared between API routes and cron
 * Sample data for today's live matches (Bundesliga Rel. + Eliteserien + Allsvenskan).
 */
import { fetchLivescoreMatch, mapLivescoreStatus, mapLivescoreType, LIVESCORE_MATCHES } from './livescore';

export type EventType =
  | 'goal'
  | 'woodwork'
  | 'shot_on_target'
  | 'corner'
  | 'foul'
  | 'yellow_card'
  | 'red_card';

export const POINTS: Record<EventType, number> = {
  goal: 5,
  woodwork: 2,
  shot_on_target: 1,
  corner: 1,
  foul: -1,
  yellow_card: -3,
  red_card: -5,
};

export interface MatchEvent {
  type: EventType;
  team: 'home' | 'away';
  minute: number;
  player?: string;
}

export interface MatchState {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: number;
  homeScore: number;
  awayScore: number;
  events: MatchEvent[];
  half: 'pre' | 'first' | 'halftime' | 'second' | 'fulltime';
  venue?: string;
  host?: string;
  poolAddress?: string;
}

export interface MomentumResult {
  homeScore: number;
  awayScore: number;
  winner: 0 | 1 | null;
}

export function computeMomentum(events: MatchEvent[]): MomentumResult {
  let homeScore = 0;
  let awayScore = 0;

  for (const ev of events) {
    const pts = POINTS[ev.type] || 0;
    if (ev.team === 'home') homeScore += pts;
    else awayScore += pts;
  }

  return {
    homeScore,
    awayScore,
    winner: homeScore > awayScore ? 0 : awayScore > homeScore ? 1 : null,
  };
}

export const WORLD_CUP_MATCHES: MatchState[] = [
  {
    matchId: 'usa-canada',
    homeTeam: 'IK Start',
    awayTeam: 'Vålerenga',
    kickoff: 1748262600,
    venue: 'Sør Arena',
    host: 'Norway',
    homeScore: 0,
    awayScore: 0,
    half: 'pre',
    events: [],
  },
  {
    matchId: 'brazil-nigeria',
    homeTeam: 'HamKam',
    awayTeam: 'Lillestrøm',
    kickoff: 1748271600,
    venue: 'Briskeby Stadion',
    host: 'Norway',
    homeScore: 0,
    awayScore: 0,
    half: 'pre',
    events: [],
  },
  {
    matchId: 'argentina-ghana',
    homeTeam: 'Elfsborg',
    awayTeam: 'BK Häcken',
    kickoff: 1748282400,
    venue: 'Borås Arena',
    host: 'Sweden',
    homeScore: 0,
    awayScore: 0,
    half: 'pre',
    events: [],
  },
  {
    matchId: 'mexico-japan',
    homeTeam: 'Paderborn',
    awayTeam: 'Wolfsburg',
    kickoff: 1748287800,
    venue: 'Home Deluxe Arena',
    host: 'Germany',
    homeScore: 0,
    awayScore: 0,
    half: 'pre',
    events: [],
  },
];

const store = new Map<string, MatchState>(WORLD_CUP_MATCHES.map((m) => [m.matchId, { ...m }]));

export const API_FOOTBALL_TYPE_MAP: Record<string, EventType> = {
  Goal: 'goal',
  'Card (yellow)': 'yellow_card',
  'Card (red)': 'red_card',
  subst: 'foul',
  Var: 'foul',
};

export function registerMatch(
  matchId: string,
  homeTeam: string,
  awayTeam: string,
  kickoff: number,
  poolAddress?: string
) {
  store.set(matchId, {
    matchId,
    homeTeam,
    awayTeam,
    kickoff,
    homeScore: 0,
    awayScore: 0,
    events: [],
    half: 'pre',
    poolAddress,
  });
}

export function getMatch(matchId: string): MatchState | undefined {
  return store.get(matchId);
}

export function getAllMatches(): MatchState[] {
  return Array.from(store.values());
}

export function updateMatch(matchId: string, events: MatchEvent[]): MatchState | undefined {
  const match = store.get(matchId);
  if (!match) return;

  const result = computeMomentum(events);
  match.homeScore = result.homeScore;
  match.awayScore = result.awayScore;
  match.events = events;

  const elapsed = Math.floor(Date.now() / 1000) - match.kickoff;
  if (elapsed < 0) match.half = 'pre';
  else if (elapsed < 45 * 60) match.half = 'first';
  else if (elapsed < 60 * 60) match.half = 'halftime';
  else if (elapsed < 105 * 60) match.half = 'second';
  else match.half = 'fulltime';

  return match;
}

/**
 * Scrape all configured matches from livescore.com and update the in-memory store.
 * Called by the daily GitHub Actions cron at 1am.
 */
export async function scrapeAllMatches(): Promise<{
  updated: number;
  failed: number;
  results: { matchId: string; status: string }[];
}> {
  const results: { matchId: string; status: string }[] = [];
  let updated = 0;
  let failed = 0;

  for (const [matchId, lsPath] of Object.entries(LIVESCORE_MATCHES)) {
    try {
      const live = await fetchLivescoreMatch(lsPath);
      if (!live) {
        results.push({ matchId, status: 'failed (no data)' });
        failed++;
        continue;
      }

      const events: MatchEvent[] = (live.incidents ?? []).map((inc) => ({
        type: mapLivescoreType(inc.type) as EventType,
        team: inc.team === 'home' ? 'home' : 'away',
        minute: parseInt(inc.time) || 0,
        player: inc.name || undefined,
      }));

      const result = computeMomentum(events);
      const existing = store.get(matchId);

      store.set(matchId, {
        matchId,
        homeTeam: live.homeTeam,
        awayTeam: live.awayTeam,
        kickoff: existing?.kickoff ?? Math.floor(Date.now() / 1000),
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        events,
        half: mapLivescoreStatus(live.status) as MatchState['half'],
        venue: existing?.venue,
        host: existing?.host,
        poolAddress: existing?.poolAddress,
      });

      updated++;
      results.push({
        matchId,
        status: `ok (${live.homeTeam} ${live.homeScore}-${live.awayScore} ${live.awayTeam})`,
      });
    } catch (err) {
      results.push({ matchId, status: `error: ${err}` });
      failed++;
    }
  }

  return { updated, failed, results };
}
