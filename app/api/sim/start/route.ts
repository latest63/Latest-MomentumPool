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

  // Auto-deploy a pool when a new real match starts
  engine.onNewMatch = async (matchId, homeTeam, awayTeam) => {
    try {
      const addr = await deployPool(matchId, homeTeam, awayTeam);
      console.log(`[sim] Deployed pool for ${matchId} (${homeTeam} vs ${awayTeam}): ${addr}`);
      return addr;
    } catch (err) {
      console.warn(`[sim] Deploy failed for ${matchId}, proceeding mock:`, err);
      return null;
    }
  };

  engine.start();

  return NextResponse.json({ ok: true });
}
