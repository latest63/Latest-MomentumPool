/**
 * livescore.com scraper — fetches live match data via their Next.js data route
 */
export interface LivescoreEvent {
  type: string;
  team: string;
  name: string;
  time: string;
  score?: { home: string; away: string };
  assist?: { name: string }[];
}

export interface LivescoreData {
  homeTeam: string;
  awayTeam: string;
  homeScore: string;
  awayScore: string;
  status: string;
  incidents: LivescoreEvent[];
  homeBadge: string;
  awayBadge: string;
}

const BASE = 'https://www.livescore.com';

/** Fetch the current build ID from livescore.com */
async function getBuildId(): Promise<string | null> {
  try {
    const html = await fetch(BASE, {
      headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36' },
      cache: 'no-store',
    }).then(r => r.text());

    const match = html.match(/_next\/static\/([a-zA-Z0-9_-]+)\/_buildManifest/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetch match data from livescore.com's Next.js data route
 * @param path e.g. "en/football/england/premier-league/brighton-vs-manchester-united/1529167"
 */
export async function fetchLivescoreMatch(path: string): Promise<LivescoreData | null> {
  try {
    const buildId = await getBuildId();
    if (!buildId) return null;

    const url = `${BASE}/_next/data/${buildId}/${path}.json`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36' },
      cache: 'no-store',
    });

    if (!res.ok) return null;
    const json = await res.json();
    const event = json?.pageProps?.initialEventData?.event;
    if (!event) return null;

    const incidents: LivescoreEvent[] = [];
    const incs = event.incidents?.incs;
    if (incs) {
      for (const half of Object.keys(incs)) {
        for (const minute of Object.keys(incs[half])) {
          for (const teamKey of Object.keys(incs[half][minute])) {
            for (const evt of incs[half][minute][teamKey]) {
              incidents.push({
                type: evt.type?.replace('Football', '') ?? 'event',
                team: teamKey,
                name: evt.name ?? '',
                time: evt.time ?? '',
                score: evt.score,
                assist: evt.assist,
              });
            }
          }
        }
      }
    }

    const IMG_BASE = 'https://storage.livescore.com/images/team/high/';

    return {
      homeTeam: event.homeTeamName,
      awayTeam: event.awayTeamName,
      homeScore: event.homeTeamScore ?? '0',
      awayScore: event.awayTeamScore ?? '0',
      status: event.eventStatus ?? 'UNKNOWN',
      incidents,
      homeBadge: event.homeTeamBadge ? `${IMG_BASE}${event.homeTeamBadge}` : '',
      awayBadge: event.awayTeamBadge ? `${IMG_BASE}${event.awayTeamBadge}` : '',
    };
  } catch {
    return null;
  }
}

/**
 * Map livescore.com event types to our momentum event types
 */
export function mapLivescoreType(type: string): string {
  const map: Record<string, string> = {
    Goal: 'goal',
    YellowCard: 'yellow_card',
    RedCard: 'red_card',
    Penalty: 'goal',
    OwnGoal: 'goal',
    Subst: 'foul',
    Var: 'foul',
    Corner: 'corner',
    ShotOnTarget: 'shot_on_target',
    Woodwork: 'woodwork',
  };
  return map[type] ?? 'foul';
}

/**
 * Map livescore.com match status to our half format
 */
export function mapLivescoreStatus(status: string): string {
  const map: Record<string, string> = {
    LIVE: 'first',
    HALFTIME: 'halftime',
    SECONDHALF: 'second',
    FULLTIME: 'fulltime',
    PAST: 'fulltime',
    PREMATCH: 'pre',
    POSTPONED: 'pre',
    CANCELLED: 'pre',
  };
  return map[status] ?? 'pre';
}

/**
 * Match configuration — maps our internal matchId to livescore.com path
 * Uses today's real matches — Bundesliga relegation + Eliteserien
 * When WC 2026 or other fixtures are published, update the event IDs here
 *
 * Format: "en/football/{country}/{league}/{teamA}-vs-{teamB}/{eventId}"
 *
 * To find an event ID:
 *   1. Go to livescore.com and open a match detail page
 *   2. The URL has the event ID at the end: .../teamA-vs-teamB/{eventId}/
 *   3. Or use curl + NEXT_DATA to find match IDs for a league
 */
export const LIVESCORE_MATCHES: Record<string, string> = {
  'usa-canada': 'en/football/norway/eliteserien/ik-start-vs-vaalerenga/1709174',
  'brazil-nigeria': 'en/football/norway/eliteserien/hamkam-vs-lillestroem/1709184',
  'argentina-ghana': 'en/football/sweden/allsvenskan/elfsborg-vs-bk-haecken/1710352',
  'mexico-japan': 'en/football/germany/bundesliga/paderborn-vs-wolfsburg/1779291',
};
