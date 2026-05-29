import { NextResponse } from 'next/server';
import { getAllMatches } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const matches = getAllMatches();

  // Sort: unscheduled first, then by kickoff
  const sorted = [...matches].sort((a, b) => {
    if (!a.kickoff && b.kickoff) return -1;
    if (a.kickoff && !b.kickoff) return 1;
    return (a.kickoff || 0) - (b.kickoff || 0);
  });

  const mapped = sorted.map((m) => ({
    matchId: m.id,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    homeCode: m.homeCode || m.homeTeam.slice(0, 3).toUpperCase(),
    awayCode: m.awayCode || m.awayTeam.slice(0, 3).toUpperCase(),
    homeBadge: m.homeBadge || '',
    awayBadge: m.awayBadge || '',
    homeScore: m.homeScore ?? 0,
    awayScore: m.awayScore ?? 0,
    status: m.status,
    half: m.half,
    kickoff: m.kickoff,
    competition: m.competition,
    group: m.group || '',
    isLive: m.status === 'inplay' || m.status === 'live',
    poolAddress: m.poolAddress || '',
    settled: !!m.settled,
  }));

  return NextResponse.json({ matches: mapped, total: mapped.length, source: 'db' });
}
