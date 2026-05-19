/**
 * Momentum Engine — shared between API routes and cron
 * 2026 World Cup themed sample data + scoring engine.
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
  venue?: string;
  host?: 'USA' | 'Canada' | 'Mexico';
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
    matchId: 'wc26-01',
    homeTeam: 'USA',
    awayTeam: 'Canada',
    kickoff: 1781085600,
    venue: 'Los Angeles',
    host: 'USA',
    homeScore: 8,
    awayScore: 5,
    half: 'first',
    events: [
      { type: 'shot_on_target', team: 'home', minute: 6, player: 'Pulisic' },
      { type: 'corner', team: 'home', minute: 11 },
      { type: 'goal', team: 'away', minute: 18, player: 'David' },
      { type: 'goal', team: 'home', minute: 31, player: 'Pulisic' },
      { type: 'foul', team: 'away', minute: 38 },
    ],
  },
  {
    matchId: 'wc26-02',
    homeTeam: 'Mexico',
    awayTeam: 'Ghana',
    kickoff: 1781172000,
    venue: 'Mexico City',
    host: 'Mexico',
    homeScore: 6,
    awayScore: 4,
    half: 'first',
    events: [
      { type: 'corner', team: 'home', minute: 7 },
      { type: 'shot_on_target', team: 'away', minute: 14 },
      { type: 'goal', team: 'home', minute: 26, player: 'Giménez' },
      { type: 'yellow_card', team: 'away', minute: 42 },
    ],
  },
  {
    matchId: 'wc26-03',
    homeTeam: 'Brazil',
    awayTeam: 'Nigeria',
    kickoff: 1781258400,
    venue: 'Dallas',
    host: 'USA',
    homeScore: 7,
    awayScore: 9,
    half: 'first',
    events: [
      { type: 'shot_on_target', team: 'away', minute: 3, player: 'Osimhen' },
      { type: 'corner', team: 'home', minute: 12 },
      { type: 'woodwork', team: 'away', minute: 21, player: 'Lookman' },
      { type: 'goal', team: 'home', minute: 28, player: 'Viní Jr' },
      { type: 'goal', team: 'away', minute: 37, player: 'Osimhen' },
    ],
  },
  {
    matchId: 'wc26-04',
    homeTeam: 'Argentina',
    awayTeam: 'Japan',
    kickoff: 1781344800,
    venue: 'Toronto',
    host: 'Canada',
    homeScore: 5,
    awayScore: 6,
    half: 'first',
    events: [
      { type: 'corner', team: 'away', minute: 9 },
      { type: 'shot_on_target', team: 'home', minute: 17 },
      { type: 'goal', team: 'away', minute: 33, player: 'Mitoma' },
    ],
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
