import { NextRequest, NextResponse } from 'next/server';
import { deployPool } from '@/lib/sim-relayer';
import { getEngine } from '@/lib/sim-engine';
import { insertDeployedPool } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { matchId, homeTeam, awayTeam, tokenAddress } = await req.json();
    if (!matchId || !homeTeam || !awayTeam) {
      return NextResponse.json({ error: 'matchId, homeTeam, awayTeam required' }, { status: 400 });
    }
    const poolAddress = await deployPool(matchId, homeTeam, awayTeam, tokenAddress);

    // Register the pool address on the engine so state polling picks it up
    const engine = getEngine();
    engine.setPoolAddress(poolAddress);

    // Persist to Supabase (fire-and-forget — on-chain query is primary)
    insertDeployedPool(poolAddress, matchId, homeTeam, awayTeam, tokenAddress || '').catch(() => {});

    return NextResponse.json({ ok: true, poolAddress });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[sim/deploy]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
