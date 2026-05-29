import { NextRequest, NextResponse } from 'next/server';
import { getMatch, getMatchEvents } from '@/lib/db';
import { computeMomentum } from '@/lib/momentum';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;

  // Read match + events from Supabase
  const [match, events] = await Promise.all([
    getMatch(id),
    getMatchEvents(id),
  ]);

  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  const result = computeMomentum(events);

  return NextResponse.json({
    homeScore: result.homeScore,
    awayScore: result.awayScore,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    half: match.half,
    diff: result.homeScore - result.awayScore,
    eventsTotal: events.length,
    source: 'supabase',
  });
}
