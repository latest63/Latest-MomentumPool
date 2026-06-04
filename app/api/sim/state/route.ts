import { NextResponse } from 'next/server';
import { getEngine, loadPoolRegistry } from '@/lib/sim-engine';
import { deployPool, settlePool } from '@/lib/sim-relayer';
import { insertDeployedPool } from '@/lib/supabase';

/* ─── GET /api/sim/state ─── */
export async function GET() {
  const engine = getEngine();
  if (!engine) {
    return NextResponse.json({ error: 'Engine not available' }, { status: 500 });
  }

  // Load pool registry from Supabase so previously deployed pools are found
  await loadPoolRegistry();

  // Ensure callbacks are set (Vercel serverless may cold-start without /api/sim/start)
  if (!engine.deployPoolForMatch) {
    engine.deployPoolForMatch = async (matchId, homeTeam, awayTeam, tokenAddress) => {
      try {
        const poolAddress = await deployPool(matchId, homeTeam, awayTeam, tokenAddress);
        insertDeployedPool(poolAddress, matchId, homeTeam, awayTeam, tokenAddress).catch(() => {});
        console.log(`[sim] Deployed pool for ${matchId}: ${poolAddress}`);
        return poolAddress;
      } catch (err) {
        console.error(`[sim] Deploy failed for ${matchId}:`, err);
        return null;
      }
    };
  }
  if (!engine.onSettle) {
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
    };
  }

  return NextResponse.json(await engine.getState());
}
