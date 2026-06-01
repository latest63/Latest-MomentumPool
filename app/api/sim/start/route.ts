import { NextResponse } from 'next/server';
import { getEngine, loadPoolRegistry } from '@/lib/sim-engine';
import { deployPool, settlePool } from '@/lib/sim-relayer';
import { insertDeployedPool } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST() {
  const engine = getEngine();

  // Load pre-deployed pool addresses from Supabase
  await loadPoolRegistry();

  // Auto-settle when a match ends
  engine.onSettle = async (_matchId, winner, homeScore, awayScore, poolAddress) => {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const result = await settlePool(poolAddress, winner, homeScore, awayScore);
        console.log(`[sim] Auto-settled ${_matchId}:`, result);
        return;
      } catch (err) {
        console.error(`[sim] Settle attempt ${attempt + 1}/5 failed for ${_matchId}:`, (err as Error).message?.slice(0, 100));
        if (attempt < 4) await new Promise(r => setTimeout(r, 5000));
      }
    }
    console.error(`[sim] All 5 settle attempts failed for ${_matchId}`);
  };

  // Deploy pool once per match — only if not already in Supabase
  engine.deployPoolForMatch = async (matchId, homeTeam, awayTeam, tokenAddress) => {
    try {
      const poolAddress = await deployPool(matchId, homeTeam, awayTeam, tokenAddress);
      // Persist to Supabase so it survives cold starts
      insertDeployedPool(poolAddress, matchId, homeTeam, awayTeam, tokenAddress).catch(() => {});
      console.log(`[sim] Deployed pool for ${matchId}: ${poolAddress}`);
      return poolAddress;
    } catch (err) {
      console.error(`[sim] Deploy failed for ${matchId}:`, err);
      return null;
    }
  };

  return NextResponse.json({ ok: true, source: 'schedule' });
}
