import { NextResponse } from 'next/server';
import { fetchWorldCupMatches, fdStatusToHalf } from '@/lib/football-data';

// Cache for 1 hour — schedule barely changes, saves API quota
export const revalidate = 3600;

export async function GET() {
  try {
    const matches = await fetchWorldCupMatches();

    if (!matches.length) {
      return NextResponse.json({ matches: [] });
    }

    // Filter out knockout placeholders where teams aren't decided yet
    const withTeams = matches.filter((m) => m.homeTeam?.name && m.awayTeam?.name);

    const mapped = withTeams.map((m) => {
      const status = m.status;
      const isLive = status === 'IN_PLAY' || status === 'PAUSED';
      const ht = m.homeTeam;
      const at = m.awayTeam;

      return {
        matchId: String(m.id),
        homeTeam: ht.name,
        awayTeam: at.name,
        homeCode: ht.tla,
        awayCode: at.tla,
        homeBadge: ht.crest,
        awayBadge: at.crest,
        homeScore: m.score.fullTime.home ?? 0,
        awayScore: m.score.fullTime.away ?? 0,
        status: status.toLowerCase().replace(/_/g, ''),
        half: fdStatusToHalf(status),
        kickoff: new Date(m.utcDate).getTime() / 1000,
        competition: `FIFA World Cup 2026`,
        group: m.group ?? m.stage ?? '',
        matchday: m.matchday,
        isLive,
      };
    });

    // Sorted: live first, then scheduled by date
    mapped.sort((a, b) => {
      if (a.isLive && !b.isLive) return -1;
      if (!a.isLive && b.isLive) return 1;
      return (a.kickoff || 0) - (b.kickoff || 0);
    });

    return NextResponse.json({ matches: mapped, total: mapped.length });
  } catch (err: any) {
    console.error('Matches API error:', err);
    return NextResponse.json(
      { matches: [], error: err?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
