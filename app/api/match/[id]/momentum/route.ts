import { NextRequest, NextResponse } from 'next/server';
import { getMatch, computeMomentum, store } from '@/lib/momentum';
import { todayDate, fetchScheduledMatches, fetchMatchIncidents, mapIncidentToMomentum, statusToHalf } from '@/lib/sport-api';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;

  // 1. Try to find the match from SportAPI by looking up today's schedule + live matches
  try {
    const matches = await fetchScheduledMatches(todayDate());
    const match = matches.find((m) => String(m.id) === id);

    if (match) {
      const incidents = await fetchMatchIncidents(match.id);

      // Map to our event format
      const events = incidents
        .map((inc) => {
          const type = mapIncidentToMomentum(inc);
          if (!type) return null;
          return {
            type,
            team: (inc.team === 'home' ? 'home' : 'away') as 'home' | 'away',
            minute: inc.minute ?? 0,
            player: inc.player?.name,
          };
        })
        .filter((e): e is NonNullable<typeof e> => e !== null);

      const result = computeMomentum(events);

      // Update store
      const existing = store.get(id);
      store.set(id, {
        matchId: id,
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        kickoff: match.startTimestamp,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        events,
        half: statusToHalf(match.status) as any,
        venue: existing?.venue ?? '',
        homeBadge: existing?.homeBadge ?? '',
        awayBadge: existing?.awayBadge ?? '',
        host: match.tournament?.uniqueTournament?.name ?? '',
        poolAddress: existing?.poolAddress,
      });

      return NextResponse.json({
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        half: statusToHalf(match.status),
        diff: result.homeScore - result.awayScore,
        incidents: events.length,
        source: 'sportapi',
      });
    }
  } catch (err) {
    console.error('SportAPI fetch error:', err);
    // Fall through to mock
  }

  // 2. Fall back to in-memory store
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
    source: 'store',
  });
}
