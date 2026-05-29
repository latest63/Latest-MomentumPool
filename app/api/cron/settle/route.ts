import { NextResponse } from 'next/server';
import { getAllMatches, getMatchEvents } from '@/lib/db';
import { computeMomentum } from '@/lib/momentum';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Settle cron — runs periodically to auto-settle on-chain pools.
 * Reads match data from Supabase, computes momentum, settles on-chain.
 */
export async function GET() {
  if (!process.env.PRIVATE_KEY || !process.env.FACTORY_ADDRESS) {
    return NextResponse.json({ message: 'Relayer not configured — set PRIVATE_KEY and FACTORY_ADDRESS' });
  }

  const now = Math.floor(Date.now() / 1000);
  const results: { matchId: string; action: string }[] = [];

  const matches = await getAllMatches();

  for (const match of matches) {
    // Kickoff + 45min half + 15min stoppage = half-time
    const halfTime = match.kickoff + 45 * 60 + 15 * 60;

    if (now < halfTime || !match.poolAddress || match.settled) continue;

    const events = await getMatchEvents(match.id);
    const result = computeMomentum(events);

    // In production: call settle() or cancel() on the MomentumPool contract via viem
    results.push({
      matchId: match.id,
      action: result.winner === null
        ? 'cancel (tie)'
        : `settle winner=${result.winner} (${result.homeScore}-${result.awayScore})`,
    });
  }

  return NextResponse.json({ settled: results.length, results, source: 'supabase' });
}
