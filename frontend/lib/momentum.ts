/**
 * Momentum Engine — shared between API routes and cron
 *
 * Maps real football events to momentum points.
 * Score is computed from the full event list per match.
 */

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
  poolAddress?: string;
}

export interface MomentumResult {
  homeScore: number;
  awayScore: number;
  winner: 0 | 1 | null; // null = tie
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

/* ─── Event type mapping from API-Football ─── */

export const API_FOOTBALL_TYPE_MAP: Record<string, EventType> = {
  Goal: 'goal',
  'Card (yellow)': 'yellow_card',
  'Card (red)': 'red_card',
  subst: 'foul',
  Var: 'foul',
};

/* ─── In-memory store (replaced by DB in production) ─── */

const store = new Map<string, MatchState>();

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

  // Detect half based on time
  const elapsed = Math.floor(Date.now() / 1000) - match.kickoff;
  if (elapsed < 0) match.half = 'pre';
  else if (elapsed < 45 * 60) match.half = 'first';
  else if (elapsed < 60 * 60) match.half = 'halftime';
  else if (elapsed < 105 * 60) match.half = 'second';
  else match.half = 'fulltime';

  return match;
}
