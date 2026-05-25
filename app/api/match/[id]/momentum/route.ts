import { NextRequest, NextResponse } from 'next/server';
import { getMatch, computeMomentum } from '@/lib/momentum';
import { fetchLivescoreMatch, mapLivescoreStatus, LIVESCORE_MATCHES } from '@/lib/livescore';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Try live data from livescore.com first
  const lsPath = LIVESCORE_MATCHES[id];
  if (lsPath) {
    const live = await fetchLivescoreMatch(lsPath);
    if (live) {
      return NextResponse.json({
        homeScore: parseInt(live.homeScore) || 0,
        awayScore: parseInt(live.awayScore) || 0,
        homeTeam: live.homeTeam,
        awayTeam: live.awayTeam,
        half: mapLivescoreStatus(live.status),
        diff: (parseInt(live.homeScore) || 0) - (parseInt(live.awayScore) || 0),
        homeBadge: live.homeBadge,
        awayBadge: live.awayBadge,
        source: 'live',
      });
    }
  }

  // Fall back to mock data
  const match = getMatch(id);
  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  const result = computeMomentum(match.events);

  return NextResponse.json({
    homeScore: result.homeScore,
    awayScore: result.awayScore,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    half: match.half,
    diff: result.homeScore - result.awayScore,
    source: 'mock',
  });
}
