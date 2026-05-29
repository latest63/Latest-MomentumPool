import { NextResponse } from 'next/server';
import { fetchWorldCupMatches, fdStatusToHalf } from '@/lib/football-data';

// Cache for 1 hour — schedule barely changes, saves API quota
export const revalidate = 3600;
export const dynamic = 'force-dynamic';

function fallbackMatch() {
  const testPool = process.env.NEXT_PUBLIC_POOL_ADDRESS || '0x04DA66A885F7C1e52F984e7eFC013393AEEAA2df';
  return NextResponse.json({
    matches: [{
      matchId: 'test-match',
      homeTeam: 'Mexico',
      awayTeam: 'South Africa',
      homeCode: 'MEX',
      awayCode: 'RSA',
      homeBadge: '',
      awayBadge: '',
      homeScore: 0,
      awayScore: 0,
      status: 'scheduled',
      half: 'pre',
      kickoff: Math.floor(Date.now() / 1000) + 3600,
      competition: 'Preview Match',
      group: 'Friendly',
      isLive: false,
      poolAddress: testPool,
    }],
    total: 1,
    fallback: true,
  });
}

export async function GET() {
  try {
    const matches = await fetchWorldCupMatches();

    if (!matches.length) {
      // Fallback: show test match so the page isn't blank
      return fallbackMatch();
    }

    // Filter out knockout placeholders where teams aren't decided yet
    const withTeams = matches.filter((m) => m.homeTeam?.name && m.awayTeam?.name);

    // Only show upcoming matches (skip finished ones)
    const upcoming = withTeams.filter((m) => m.status !== 'FINISHED');

    // Only show matches from the earliest matchday among upcoming matches
    const minMatchday = Math.min(...upcoming.map((m) => m.matchday ?? 999));
    const dayMatches = upcoming.filter((m) => m.matchday === minMatchday);

    const mapped = dayMatches.map((m) => {
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
    return fallbackMatch();
  }
}
