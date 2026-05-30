import { NextResponse } from 'next/server';
import { getEngine } from '@/lib/sim-engine';
import { deployPool, settlePool } from '@/lib/sim-relayer';

export const dynamic = 'force-dynamic';

/**
 * POST /api/sim/start
 * Start the engine, deploy a real pool for sim-1, wire up auto-settle.
 */
export async function POST() {
  const engine = getEngine();

  // Wire up on-chain settlement callback
  engine.onSettle = async (_matchId, winner, homeScore, awayScore, poolAddress) => {
    try {
      const result = await settlePool(poolAddress, winner, homeScore, awayScore);
      console.log(`[sim] Auto-settled ${_matchId}:`, result);
    } catch (err) {
      console.error(`[sim] Settle failed for ${_matchId}:`, err);
    }
  };

  engine.start();

  // Deploy a pool for the first match (Nigeria vs Brazil)
  try {
    const poolAddress = await deployPool('sim-1', 'Nigeria', 'Brazil');
    engine.setPoolAddress('sim-1', poolAddress);
    console.log(`[sim] Deployed pool for sim-1: ${poolAddress}`);
  } catch (err) {
    console.warn('[sim] Pool deploy skipped (proceeding mock):', err);
  }

  return NextResponse.json({ ok: true });
}
