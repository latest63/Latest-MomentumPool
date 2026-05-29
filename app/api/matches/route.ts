import { NextResponse } from 'next/server';
import { todayDate, fetchScheduledMatches, fetchLiveMatches } from '@/lib/sport-api';

export const dynamic = 'force-dynamic'; // always fresh from SportAPI
// Browser/edge cache for 5 min to save API quota
export const revalidate = 300;

export async function GET() {
  try {
    // Get upcoming matches
    const [live, scheduled] = await Promise.all([
      fetchLiveMatches().catch(() => []),
      fetchScheduledMatches(todayDate()).catch(() => []),
    ]);

    // Dedup by ID — live takes priority
    const seen = new Set<number>();
    const all: any[] = [];

    for (const m of live) {
      if (!seen.has(m.id)) {
        const ht = m.homeTeam ?? {};
        const at = m.awayTeam ?? {};
        all.push({
          matchId: String(m.id),
          homeTeam: ht.name,
          awayTeam: at.name,
          homeScore: m.homeScore?.current ?? 0,
          awayScore: m.awayScore?.current ?? 0,
          status: m.status?.type ?? 'unknown',
          kickoff: m.startTimestamp,
          competition: m.tournament?.uniqueTournament?.name ?? m.tournament?.name ?? '',
          homeColors: ht.teamColors ?? { primary: '#374df5', secondary: '#374df5', text: '#ffffff' },
          awayColors: at.teamColors ?? { primary: '#374df5', secondary: '#374df5', text: '#ffffff' },
          homeCode: ht.nameCode ?? ht.name?.slice(0, 3).toUpperCase() ?? 'HOM',
          awayCode: at.nameCode ?? at.name?.slice(0, 3).toUpperCase() ?? 'AWY',
        });
        seen.add(m.id);
      }
    }

    // Add upcoming — up to 5 to fill
    for (const m of scheduled) {
      if (all.length >= 5) break;
      if (seen.has(m.id)) continue;
      const ht = m.homeTeam ?? {};
      const at = m.awayTeam ?? {};
      all.push({
        matchId: String(m.id),
        homeTeam: ht.name,
        awayTeam: at.name,
        homeScore: m.homeScore?.current ?? 0,
        awayScore: m.awayScore?.current ?? 0,
        status: m.status?.type ?? 'notstarted',
        kickoff: m.startTimestamp,
        competition: m.tournament?.uniqueTournament?.name ?? m.tournament?.name ?? '',
        homeColors: ht.teamColors ?? { primary: '#374df5', secondary: '#374df5', text: '#ffffff' },
        awayColors: at.teamColors ?? { primary: '#374df5', secondary: '#374df5', text: '#ffffff' },
        homeCode: ht.nameCode ?? ht.name?.slice(0, 3).toUpperCase() ?? 'HOM',
        awayCode: at.nameCode ?? at.name?.slice(0, 3).toUpperCase() ?? 'AWY',
      });
      seen.add(m.id);
    }

    return NextResponse.json({ matches: all.slice(0, 5) });
  } catch (err: any) {
    console.error('Matches API error:', err);
    return NextResponse.json({ matches: [], error: err?.message });
  }
}
