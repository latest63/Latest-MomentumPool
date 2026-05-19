/**
 * Momentum Pool — Express Server
 *
 * Serves live match data + momentum scores to the frontend.
 * No on-chain reads needed for the real-time meter.
 */

import express from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json());

const SPORTS_API_KEY = process.env.SPORTS_API_KEY || '';

/* ───── Momentum Engine (shared with relayer) ───── */

const POINTS = {
  goal: 5,
  woodwork: 2,
  shot_on_target: 1,
  corner: 1,
  foul: -1,
  yellow_card: -3,
  red_card: -5,
} as const;

type EventType = keyof typeof POINTS;

interface MatchEvent {
  type: EventType;
  team: 'home' | 'away';
  minute: number;
  player?: string;
}

/* ───── In-memory match cache (replace with DB in prod) ───── */

interface MatchState {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  events: MatchEvent[];
  half: 'pre' | 'first' | 'halftime' | 'second' | 'fulltime';
  kickoff: number;
  poolAddress?: string;
}

const matches: Map<string, MatchState> = new Map();

/* ───── API Routes ───── */

/// GET /api/matches — list all tracked matches
app.get('/api/matches', (_req, res) => {
  const list = Array.from(matches.values()).map((m) => ({
    matchId: m.matchId,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    half: m.half,
    kickoff: m.kickoff,
    poolAddress: m.poolAddress,
  }));
  res.json({ matches: list });
});

/// GET /api/match/:id — full match detail + event feed
app.get('/api/match/:id', (req, res) => {
  const match = matches.get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Match not found' });

  res.json({
    ...match,
    // Return last 50 events (newest first for scroll feed)
    recentEvents: match.events.slice(-50).reverse(),
  });
});

/// GET /api/match/:id/momentum — just the scores (lightweight, poll this)
app.get('/api/match/:id/momentum', (req, res) => {
  const match = matches.get(req.params.id);
  if (!match) return res.status(404).json({ error: 'Match not found' });

  res.json({
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    half: match.half,
    diff: match.homeScore - match.awayScore,
  });
});

/* ───── Fetch + Cache Loop ───── */

async function refreshMatch(matchId: string) {
  try {
    const url = `https://api-football-v1.p.rapidapi.com/v3/fixtures/events?fixture=${matchId}`;
    const res = await fetch(url, {
      headers: {
        'x-rapidapi-key': SPORTS_API_KEY,
        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
      },
    });

    if (!res.ok) return;

    const data = await res.json();
    if (!data.response) return;

    const typeMap: Record<string, EventType> = {
      Goal: 'goal',
      'Card (yellow)': 'yellow_card',
      'Card (red)': 'red_card',
      'subst': 'foul',
      'Var': 'foul',
    };

    let homeScore = 0;
    let awayScore = 0;
    const events: MatchEvent[] = [];

    for (const raw of data.response) {
      const mappedType = typeMap[raw.type] || null;
      if (!mappedType) continue;

      const team: 'home' | 'away' = raw.team?.name === matches.get(matchId)?.homeTeam ? 'home' : 'away';

      const pts = POINTS[mappedType];
      if (team === 'home') homeScore += pts;
      else awayScore += pts;

      events.push({
        type: mappedType,
        team,
        minute: raw.time?.elapsed || 0,
        player: raw.player?.name,
      });
    }

    const existing = matches.get(matchId);
    if (existing) {
      existing.homeScore = homeScore;
      existing.awayScore = awayScore;
      existing.events = events;
    }
  } catch (err) {
    console.error(`[Refresh] Error for ${matchId}:`, (err as Error).message);
  }
}

/* ───── Bootstrap ───── */

async function bootstrap() {
  // Load match config (from DB or env)
  // Example: registerMatch('12345', 'Nigeria', 'Brazil', 1747700000);

  // Refresh every 15s
  setInterval(async () => {
    for (const matchId of matches.keys()) {
      await refreshMatch(matchId);
    }
  }, 15_000);

  // Initial refresh
  for (const matchId of matches.keys()) {
    await refreshMatch(matchId);
  }
}

// Expose for adding matches dynamically
export function registerMatch(matchId: string, home: string, away: string, kickoff: number, poolAddress?: string) {
  matches.set(matchId, {
    matchId,
    homeTeam: home,
    awayTeam: away,
    homeScore: 0,
    awayScore: 0,
    events: [],
    half: 'pre',
    kickoff,
    poolAddress,
  });
  refreshMatch(matchId);
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`[Server] Listening on :${PORT}`);
  await bootstrap();
});
