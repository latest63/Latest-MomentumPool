import { NextResponse } from 'next/server';
import { getEngine } from '@/lib/sim-engine';
import { deployPool, settlePool } from '@/lib/sim-relayer';

export const dynamic = 'force-dynamic';

export async function POST() {
  const engine = getEngine();

  // Wire up on-chain settlement
  engine.onSettle = async (_matchId, winner, homeScore, awayScore, poolAddress) => {
    try {
      const result = await settlePool(poolAddress, winner, homeScore, awayScore);
      console.log(`[sim] Auto-settled ${_matchId}:`, result);
    } catch (err) {
      console.error(`[sim] Settle failed:`, err);
    }
  };

  engine.start();

  // Deploy a real pool for the first match (Nigeria vs Brazil — real: true)
  try {
    const poolAddress = await deployPool('sim-1', 'Nigeria', 'Brazil');
    engine.setPoolAddress(poolAddress);
    console.log(`[sim] Deployed pool: ${poolAddress}`);
  } catch (err) {
    console.warn('[sim] Pool deploy skipped (proceeding mock):', err);
  }

  return NextResponse.json({ ok: true });
}
