/**
 * Momentum Engine — shared between API routes and cron
 * Uses SportAPI (rapidsportapi) for live football data
 */
import {
  fetchLiveMatches,
  fetchScheduledMatches,
  fetchMatchIncidents,
  todayDate,
  mapIncidentToMomentum,
  statusToHalf,
  type SportApiMatch,
  type MomentumEventType,
} from './sport-api';

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
  homeBadge?: string;
  awayBadge?: string;
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

/* ─── In-memory store ──────────────────────────────────────────────── */

export const store = new Map<string, MatchState>();

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

/* ─── Helpers ───────────────────────────────────────────────────────── */

function toMatchState(m: SportApiMatch): MatchState {
  const matchId = String(m.id);
  const existing = store.get(matchId);

  return {
    matchId,
    homeTeam: m.homeTeam.name,
    awayTeam: m.awayTeam.name,
    kickoff: m.startTimestamp,
    homeScore: m.homeScore?.current ?? 0,
    awayScore: m.awayScore?.current ?? 0,
    events: existing?.events ?? [],
    half: statusToHalf(m.status) as MatchState['half'],
    venue: existing?.venue ?? '',
    host: m.tournament?.uniqueTournament?.name ?? '',
    poolAddress: existing?.poolAddress,
    homeBadge: existing?.homeBadge ?? '',
    awayBadge: existing?.awayBadge ?? '',
  };
}

/* ─── Main fetch/scrape function ────────────────────────────────────── */

/**
 * Fetch all active matches and their incidents from SportAPI,
 * then update the in-memory store.
 * Called by the daily cron and live endpoint.
 */
export async function scrapeAllMatches(): Promise<{
  updated: number;
  failed: number;
  results: { matchId: string; status: string }[];
}> {
  const results: { matchId: string; status: string }[] = [];
  let updated = 0;
  let failed = 0;

  try {
    // 1. Get live matches
    const liveMatches = await fetchLiveMatches();
    const scheduledMatches = await fetchScheduledMatches(todayDate());

    // Merge — prefer live over scheduled for same match (dedup by ID)
    const seen = new Set<number>();
    const allMatches: SportApiMatch[] = [];

    for (const m of liveMatches) {
      if (!seen.has(m.id)) {
        allMatches.push(m);
        seen.add(m.id);
      }
    }
    for (const m of scheduledMatches) {
      if (!seen.has(m.id)) {
        allMatches.push(m);
        seen.add(m.id);
      }
    }

    if (allMatches.length === 0) {
      results.push({ matchId: 'all', status: 'no matches found (live or scheduled)' });
      return { updated: 0, failed: 0, results };
    }

    // 2. For each match, fetch incidents and compute momentum
    for (const match of allMatches) {
      try {
        const matchId = String(match.id);

        // Fetch incidents (goals, cards, shots, etc.)
        const incidents = await fetchMatchIncidents(match.id);

        // Map to our event format
        const events: MatchEvent[] = incidents
          .map((inc) => {
            const type = mapIncidentToMomentum(inc);
            if (!type) return null;
            return {
              type,
              team: (inc.team === 'home' ? 'home' : 'away') as 'home' | 'away',
              minute: inc.minute ?? 0,
              player: inc.player?.name,
            } as MatchEvent;
          })
          .filter((e): e is MatchEvent => e !== null);

        const result = computeMomentum(events);

        store.set(matchId, {
          matchId,
          homeTeam: match.homeTeam.name,
          awayTeam: match.awayTeam.name,
          kickoff: match.startTimestamp,
          homeScore: result.homeScore,
          awayScore: result.awayScore,
          events,
          half: statusToHalf(match.status) as MatchState['half'],
          venue: '',
          host: match.tournament?.uniqueTournament?.name ?? '',
          homeBadge: '',
          awayBadge: '',
        });

        updated++;
        results.push({
          matchId,
          status: `ok (${match.homeTeam.name} ${match.homeScore?.current ?? 0}-${match.awayScore?.current ?? 0} ${match.awayTeam.name})`,
        });
      } catch (err) {
        results.push({ matchId: String(match.id), status: `error: ${err}` });
        failed++;
      }
    }
  } catch (err) {
    results.push({ matchId: 'all', status: `fetch error: ${err}` });
    failed++;
  }

  return { updated, failed, results };
}
