import { NextResponse } from 'next/server';
import { getAllMatches } from '@/lib/momentum';

export const dynamic = 'force-dynamic';

export async function GET() {
  const matches = getAllMatches().map((m) => ({
    matchId: m.matchId,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    half: m.half,
    kickoff: m.kickoff,
    venue: m.venue,
    host: m.host,
    poolAddress: m.poolAddress,
    homeBadge: m.homeBadge,
    awayBadge: m.awayBadge,
  }));

  return NextResponse.json({ matches });
}
