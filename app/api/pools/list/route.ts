import { NextRequest, NextResponse } from 'next/server';
import { publicClient } from '@/lib/chain-client';
import { FACTORY_ABI } from '@/lib/pool-abi';
import { getDeployedPools } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const FACTORY = process.env.NEXT_PUBLIC_POOL_FACTORY || '';

export type DeployedPool = {
  poolAddress: string;
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  tokenAddress: string;
};

/** GET /api/pools/list — returns all pools deployed by the factory */
export async function GET() {
  if (!FACTORY) {
    return NextResponse.json({ error: 'FACTORY not configured' }, { status: 500 });
  }

  try {
    const latest = await publicClient.getBlockNumber();
    // X Layer RPC limits getLogs to 100 blocks — query recent blocks
    const fromBlock = latest > 100n ? latest - 100n : 0n;
    const logs = await publicClient.getLogs({
      address: FACTORY as `0x${string}`,
      event: FACTORY_ABI.find(e => e.name === 'PoolCreated') as any,
      fromBlock,
      toBlock: 'latest',
    });

    const pools: DeployedPool[] = logs
      .filter((l: any) => l.args?.pool)
      .map((l: any) => ({
        poolAddress: l.args.pool.toLowerCase(),
        matchId: l.args.matchId || '',
        homeTeam: l.args.homeTeam || '',
        awayTeam: l.args.awayTeam || '',
        tokenAddress: l.args.token ? l.args.token.toLowerCase() : '',
      }));

    return NextResponse.json({ pools });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[pools/list] on-chain query failed:', msg);

    // Fallback: try Supabase
    try {
      const rows = await getDeployedPools();
      if (rows.length > 0) {
        const pools: DeployedPool[] = rows.map(r => ({
          poolAddress: r.pool_address.toLowerCase(),
          matchId: r.match_id,
          homeTeam: r.home_team,
          awayTeam: r.away_team,
          tokenAddress: r.token_address.toLowerCase(),
        }));
        return NextResponse.json({ pools, source: 'supabase-fallback' });
      }
    } catch {}

    // Last resort: try engine in-memory deployedPools
    try {
      const { getEngine } = await import('@/lib/sim-engine');
      const engine = getEngine();
      const state = engine.getState();
      // First try deployedPools array
      if (state.deployedPools.length > 0) {
        const pools = state.deployedPools.map(p => ({
          poolAddress: p.poolAddress.toLowerCase(),
          matchId: p.matchId,
          homeTeam: p.homeTeam,
          awayTeam: p.awayTeam,
          tokenAddress: p.tokenAddress.toLowerCase(),
        }));
        return NextResponse.json({ pools, source: 'engine-fallback' });
      }
      // Fallback: current match pool address
      if (state.match?.poolAddress) {
        const m = state.match;
        const pools = [{
          poolAddress: m.poolAddress!.toLowerCase(),
          matchId: m.id,
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          tokenAddress: m.tokenAddress.toLowerCase(),
        }];
        return NextResponse.json({ pools, source: 'engine-current-match' });
      }
    } catch {}
  }
}
