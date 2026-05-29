import { NextResponse } from 'next/server';
import {
  fetchLiveMatches,
  fetchScheduledMatches,
  fetchMatchIncidents,
  mapIncidentToMomentum,
  statusToHalf,
  todayDate,
} from '@/lib/sport-api';
import { upsertMatch, setMatchEvents } from '@/lib/db';
import type { MatchEvent, EventType } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Scrape endpoint — fetches live + scheduled matches from SportAPI
 * and writes them to Supabase.
 *
 * Called by GitHub Actions cron or Vercel Cron Jobs.
 */
export async function GET() {
  try {
    const results: { matchId: string; status: string }[] = [];
    let updated = 0;
    let failed = 0;

    // 1. Fetch live + scheduled from SportAPI
    const [liveMatches, scheduledMatches] = await Promise.all([
      fetchLiveMatches(),
      fetchScheduledMatches(todayDate()),
    ]);

    // Merge — dedup by ID, live takes priority
    const seen = new Set<number>();
    const allMatches = [...liveMatches, ...scheduledMatches].filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });

    if (allMatches.length === 0) {
      results.push({ matchId: 'all', status: 'no matches found' });
      return NextResponse.json({ updated: 0, failed: 0, results });
    }

    // 2. For each match, fetch incidents + write to Supabase
    for (const m of allMatches) {
      try {
        const matchId = String(m.id);

        // Fetch incidents
        const incidents = await fetchMatchIncidents(m.id);

        // Map to our event format
        const events: MatchEvent[] = incidents
          .map((inc) => {
            const type = mapIncidentToMomentum(inc);
            if (!type) return null;
            return {
              type: type as EventType,
              team: (inc.team === 'home' ? 'home' : 'away') as 'home' | 'away',
              minute: inc.minute ?? 0,
              player: inc.player?.name,
            } as MatchEvent;
          })
          .filter((e): e is MatchEvent => e !== null);

        // Write match to Supabase
        await upsertMatch({
          id: matchId,
          homeTeam: m.homeTeam.name,
          awayTeam: m.awayTeam.name,
          homeCode: m.homeTeam.nameCode || m.homeTeam.shortName || '',
          awayCode: m.awayTeam.nameCode || m.awayTeam.shortName || '',
          homeBadge: '',
          awayBadge: '',
          competition: m.tournament?.uniqueTournament?.name ?? '',
          kickoff: m.startTimestamp,
          half: statusToHalf(m.status),
          status: m.status.type === 'inprogress' ? 'live' : m.status.type === 'finished' ? 'settled' : 'scheduled',
          homeScore: m.homeScore?.current ?? 0,
          awayScore: m.awayScore?.current ?? 0,
        });

        // Write events to Supabase (full replace)
        await setMatchEvents(matchId, events);

        updated++;
        results.push({
          matchId,
          status: `ok (${m.homeTeam.name} ${m.homeScore?.current ?? 0}-${m.awayScore?.current ?? 0} ${m.awayTeam.name}, ${events.length} events)`,
        });
      } catch (err) {
        results.push({ matchId: String(m.id), status: `error: ${err}` });
        failed++;
      }
    }

    return NextResponse.json({
      ok: true,
      timestamp: Math.floor(Date.now() / 1000),
      updated,
      failed,
      results,
      source: 'supabase',
    });
  } catch (err: any) {
    console.error('Scrape cron failed:', err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Unknown error' },
      { status: 500 },
    );
  }
}
