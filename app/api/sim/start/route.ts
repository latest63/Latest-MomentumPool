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

  // Auto-deploy contract when a new match starts
  engine.onNewMatch = async (matchId, homeTeam, awayTeam, tokenAddress) => {
    try {
      const addr = await deployPool(matchId, homeTeam, awayTeam, tokenAddress);
      console.log(`[sim] Deployed pool for ${matchId}: ${addr}`);
      return addr;
    } catch (err) {
      console.error(`[sim] Deploy failed for ${matchId}:`, err);
      return null;
    }
  };

  engine.start();

  return NextResponse.json({ ok: true });
}
