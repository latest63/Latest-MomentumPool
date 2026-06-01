import { NextResponse } from 'next/server';
import { getEngine } from '@/lib/sim-engine';
import { deployPool, settlePool } from '@/lib/sim-relayer';

export const dynamic = 'force-dynamic';

export async function POST() {
  const engine = getEngine();

  // Auto-settle when a match ends — retries with backoff for block timestamp lag
  engine.onSettle = async (_matchId, winner, homeScore, awayScore, poolAddress) => {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const result = await settlePool(poolAddress, winner, homeScore, awayScore);
        console.log(`[sim] Auto-settled ${_matchId}:`, result);
        return;
      } catch (err) {
        console.error(`[sim] Settle attempt ${attempt + 1}/5 failed for ${_matchId}:`, (err as Error).message?.slice(0, 100));
        if (attempt < 4) await new Promise(r => setTimeout(r, 5000)); // 5s between retries
      }
    }
    console.error(`[sim] All 5 settle attempts failed for ${_matchId}`);
  };

  // Auto-deploy pool when a new match starts — timestamps match sim phases (120s / 240s)
  engine.onNewMatch = async (matchId, homeTeam, awayTeam, tokenAddress) => {
    try {
      const poolAddress = await deployPool(matchId, homeTeam, awayTeam, tokenAddress);
      console.log(`[sim] Auto-deployed pool for ${matchId}: ${poolAddress}`);
      return poolAddress;
    } catch (err) {
      console.error(`[sim] Auto-deploy failed for ${matchId}:`, err);
      return null;
    }
  };

  engine.start();

  // Deploy pool for the current match right now (engine starts before onNewMatch is set)
  const currentState = engine.getState();
  if (currentState.match && !currentState.match.poolAddress && currentState.match.phase === 'open') {
    deployPool(
      currentState.match.id,
      currentState.match.homeTeam,
      currentState.match.awayTeam,
      currentState.match.tokenAddress,
    ).then(addr => {
      if (addr) {
        engine.setPoolAddress(addr);
        console.log(`[sim] Deployed pool for current match ${currentState.match!.id}: ${addr}`);
      }
    }).catch(err => {
      console.error(`[sim] Failed to deploy pool for current match:`, err);
    });
  }

  return NextResponse.json({ ok: true });
}
