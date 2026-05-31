import { NextResponse } from 'next/server';
import { getEngine } from '@/lib/sim-engine';
import { deployPool, settlePool } from '@/lib/sim-relayer';

export const dynamic = 'force-dynamic';

export async function POST() {
  const engine = getEngine();

  // Auto-settle when a match ends
  engine.onSettle = async (_matchId, winner, homeScore, awayScore, poolAddress) => {
    try {
      const result = await settlePool(poolAddress, winner, homeScore, awayScore);
      console.log(`[sim] Auto-settled ${_matchId}:`, result);
    } catch (err) {
      console.error(`[sim] Settle failed:`, err);
    }
  };

  // Lazy deploy — pool is only deployed when first user deposits
  // engine.onNewMatch intentionally NOT set — deploy happens on-demand in handleDeposit

  engine.start();

  return NextResponse.json({ ok: true });
}
