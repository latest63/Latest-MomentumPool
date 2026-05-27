import { NextResponse } from 'next/server';
import { scrapeAllMatches } from '@/lib/momentum';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Scrape endpoint — called by GitHub Actions daily at 1am.
 *
 * Fetches all configured matches from livescore.com,
 * updates the in-memory store with real scores and events.
 *
 * Users see live data during matches (fetched directly from livescore.com
 * by the /momentum route). This cron keeps the backend store updated
 * for settlement and the match listing.
 */
export async function GET() {
  try {
    const result = await scrapeAllMatches();

    return NextResponse.json({
      ok: true,
      timestamp: Math.floor(Date.now() / 1000),
      ...result,
    });
  } catch (err: any) {
    console.error('Scrape cron failed:', err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Unknown error' },
      { status: 500 },
    );
  }
}
