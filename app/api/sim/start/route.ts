import { NextResponse } from 'next/server';
import { getEngine } from '@/lib/sim-engine';
import { settlePool } from '@/lib/sim-relayer';

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

  // Lazy deploy — pool is deployed on first user deposit via frontend
  engine.onNewMatch = null;

  engine.start();

  return NextResponse.json({ ok: true });
}
