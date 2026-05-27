import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** livescore.com fetch — inlined to avoid Vercel import issues */
const BASE = 'https://www.livescore.com';

async function getBuildId(): Promise<string | null> {
  try {
    const html = await fetch(BASE, {
      headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36' },
      cache: 'no-store',
    }).then(r => r.text());

    const match = html.match(/_next\/static\/([a-zA-Z0-9_-]+)\/_buildManifest/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

async function fetchMatch(path: string): Promise<any> {
  try {
    const buildId = await getBuildId();
    if (!buildId) return null;

    const url = `${BASE}/_next/data/${buildId}/${path}.json`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36' },
      cache: 'no-store',
    });

    if (!res.ok) return null;
    const json = await res.json();
    const event = json?.pageProps?.initialEventData?.event;
    if (!event) return null;

    return {
      homeTeam: event.homeTeamName,
      awayTeam: event.awayTeamName,
      homeScore: event.homeTeamScore ?? '0',
      awayScore: event.awayTeamScore ?? '0',
      status: event.eventStatus ?? 'UNKNOWN',
    };
  } catch {
    return null;
  }
}

const LIVESCORE_MATCHES: Record<string, string> = {
  'usa-canada': 'en/football/norway/eliteserien/ik-start-vs-vaalerenga/1709174',
  'brazil-nigeria': 'en/football/norway/eliteserien/hamkam-vs-lillestroem/1709184',
  'argentina-ghana': 'en/football/sweden/allsvenskan/elfsborg-vs-bk-haecken/1710352',
  'mexico-japan': 'en/football/germany/bundesliga/paderborn-vs-wolfsburg/1779291',
};

/**
 * Scrape endpoint — called by daily cron at 1am.
 */
export async function GET() {
  try {
    const results: { matchId: string; status: string }[] = [];
    let updated = 0;
    let failed = 0;

    for (const [matchId, lsPath] of Object.entries(LIVESCORE_MATCHES)) {
      const live = await fetchMatch(lsPath);
      if (!live) {
        results.push({ matchId, status: 'failed (no data)' });
        failed++;
      } else {
        results.push({
          matchId,
          status: `ok (${live.homeTeam} ${live.homeScore}-${live.awayScore} ${live.awayTeam})`,
        });
        updated++;
      }
    }

    return NextResponse.json({
      ok: true,
      timestamp: Math.floor(Date.now() / 1000),
      updated,
      failed,
      results,
    });
  } catch (err: any) {
    console.error('Scrape cron failed:', err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Unknown error' },
      { status: 500 },
    );
  }
}
