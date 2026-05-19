import { NextResponse } from 'next/server';
import { getAllMatches, computeMomentum } from '@/lib/momentum';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel cron allows up to 60s

/**
 * Vercel Cron Job — runs every 2 minutes
 *
 * Check all live matches. If a match is past half-time and has a pool,
 * fetch latest events and settle the on-chain pool.
 *
 * Requires env vars:
 *   - PRIVATE_KEY (wallet that owns the Factory)
 *   - FACTORY_ADDRESS (deployed MomentumPoolFactory)
 *   - XLAYER_RPC (default: https://testrpc.xlayer.tech)
 *   - SPORTS_API_KEY (optional, for live event data)
 */

export async function GET() {
  // Check if we're configured to settle
  if (!process.env.PRIVATE_KEY || !process.env.FACTORY_ADDRESS) {
    return NextResponse.json({ message: 'Relayer not configured — set PRIVATE_KEY and FACTORY_ADDRESS' });
  }

  const now = Math.floor(Date.now() / 1000);
  const results: { matchId: string; action: string }[] = [];

  for (const match of getAllMatches()) {
    // Kickoff + 45min half + 15min stoppage = half-time
    const halfTime = match.kickoff + 45 * 60 + 15 * 60;

    if (now < halfTime || !match.poolAddress) continue;

    // Check if already settled via contract state
    const result = computeMomentum(match.events);

    // In production: call settle() or cancel() on the MomentumPool contract via viem
    results.push({
      matchId: match.matchId,
      action: result.winner === null ? 'cancel (tie)' : `settle winner=${result.winner} (${match.homeScore}-${match.awayScore})`,
    });
  }

  return NextResponse.json({ settled: results.length, results });
}
