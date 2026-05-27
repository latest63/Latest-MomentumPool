import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Debug endpoint — tests livescore.com connectivity from Vercel's environment
 */
export async function GET() {
  const results: Record<string, any> = {};

  // Test 1: Fetch livescore homepage
  try {
    const res = await fetch('https://www.livescore.com', {
      headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36' },
      cache: 'no-store',
    });
    const text = await res.text();
    const buildId = text.match(/_next\/static\/([a-zA-Z0-9_-]+)\/_buildManifest/)?.[1];
    results.getBuildId = {
      status: res.status,
      contentLength: text.length,
      buildId: buildId ?? 'NOT FOUND',
      hasBuildManifest: text.includes('_buildManifest'),
      firstChars: text.substring(0, 500),
    };
  } catch (err: any) {
    results.getBuildId = { error: err?.message ?? String(err) };
  }

  // Test 2: Direct fetch with known build ID
  try {
    const buildId = results.getBuildId?.buildId;
    if (buildId && buildId !== 'NOT FOUND') {
      const url = `https://www.livescore.com/_next/data/${buildId}/en/football/norway/eliteserien/ik-start-vs-vaalerenga/1709174.json`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        cache: 'no-store',
      });
      results.dataRoute = {
        status: res.status,
        ok: res.ok,
      };
      if (res.ok) {
        const json = await res.json();
        const event = json?.pageProps?.initialEventData?.event;
        results.dataRoute.event = event
          ? { home: event.homeTeamName, away: event.awayTeamName, status: event.eventStatus }
          : 'NO EVENT DATA';
      } else {
        results.dataRoute.body = await res.text().then(t => t.substring(0, 500));
      }
    }
  } catch (err: any) {
    results.dataRoute = { error: err?.message ?? String(err) };
  }

  // Test 3: Alternative scraping approach — try the HTML page directly
  try {
    const res = await fetch('https://www.livescore.com/en/football/norway/eliteserien/ik-start-vs-vaalerenga/1709174/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36' },
      cache: 'no-store',
    });
    const text = await res.text();
    results.htmlDirect = {
      status: res.status,
      contentLength: text.length,
      hasNextData: text.includes('__NEXT_DATA__'),
      hasSSP: text.includes('__N_SSP'),
      firstChars: text.substring(0, 300),
    };
  } catch (err: any) {
    results.htmlDirect = { error: err?.message ?? String(err) };
  }

  return NextResponse.json(results);
}
