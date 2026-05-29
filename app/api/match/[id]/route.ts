import { NextRequest, NextResponse } from 'next/server';
import { getMatch, getMatchEvents } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;

  const [match, events] = await Promise.all([
    getMatch(id),
    getMatchEvents(id),
  ]);

  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  return NextResponse.json({
    matchId: match.id,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeCode: match.homeCode || '',
    awayCode: match.awayCode || '',
    homeBadge: match.homeBadge || '',
    awayBadge: match.awayBadge || '',
    homeScore: match.homeScore ?? 0,
    awayScore: match.awayScore ?? 0,
    kickoff: match.kickoff,
    half: match.half,
    status: match.status,
    competition: match.competition,
    group: match.group || '',
    poolAddress: match.poolAddress || '',
    settled: !!match.settled,
    recentEvents: events.slice(-50).reverse(),
    source: 'supabase',
  });
}
