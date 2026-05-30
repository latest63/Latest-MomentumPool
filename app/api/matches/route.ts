import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const USDG = '0xa78e2baabaf5c4f36b7fc394725deb68d332eec1';

const SIM_MATCHES = [
  { id: 'sim-1', homeTeam: 'Nigeria', awayTeam: 'Brazil', homeScore: 0, awayScore: 0 },
  { id: 'sim-2', homeTeam: 'Argentina', awayTeam: 'France', homeScore: 0, awayScore: 0 },
  { id: 'sim-3', homeTeam: 'England', awayTeam: 'Germany', homeScore: 0, awayScore: 0 },
  { id: 'sim-4', homeTeam: 'Portugal', awayTeam: 'Spain', homeScore: 0, awayScore: 0 },
  { id: 'sim-5', homeTeam: 'Morocco', awayTeam: 'Senegal', homeScore: 0, awayScore: 0 },
];

export async function GET() {
  const mapped = SIM_MATCHES.map((m) => ({
    matchId: m.id,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    homeCode: m.homeTeam.slice(0, 3).toUpperCase(),
    awayCode: m.awayTeam.slice(0, 3).toUpperCase(),
    homeBadge: '',
    awayBadge: '',
    homeScore: m.homeScore ?? 0,
    awayScore: m.awayScore ?? 0,
    status: 'scheduled',
    half: '',
    kickoff: Math.floor(Date.now() / 1000) + 3600,
    competition: 'Momentum Pool — World Cup 2026',
    group: 'Group Stage',
    isLive: false,
    poolAddress: '',
    settled: false,
  }));

  return NextResponse.json({ matches: mapped, total: mapped.length, source: 'simulation' });
}
