import { NextRequest, NextResponse } from 'next/server';
import { publicClient } from '@/lib/chain-client';
import { POOL_ABI } from '@/lib/pool-abi';
import { getDeployedPools } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export type UserPosition = {
  poolAddress: string;
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  depositHome: string; // raw bigint string
  depositAway: string;
  state: number;
  claimed: boolean;
  winnerTeamId: number | null;
  poolTotalsHome: string;
  poolTotalsAway: string;
};

/** GET /api/pools/user-positions?address=0x... */
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address');
  if (!address) {
    return NextResponse.json({ error: 'address required' }, { status: 400 });
  }

  const addr = address.toLowerCase() as `0x${string}`;

  // Import factory and pool list dynamically (reuses the list endpoint logic)
  let pools: { poolAddress: string; matchId: string; homeTeam: string; awayTeam: string }[] = [];

  try {
    const { FACTORY_ABI } = await import('@/lib/pool-abi');
    const FACTORY = process.env.NEXT_PUBLIC_POOL_FACTORY || '';
    if (FACTORY) {
      const logs = await publicClient.getLogs({
        address: FACTORY as `0x${string}`,
        event: FACTORY_ABI.find(e => e.name === 'PoolCreated') as any,
        fromBlock: BigInt(0),
        toBlock: 'latest',
      });
      pools = logs
        .filter((l: any) => l.args?.pool)
        .map((l: any) => ({
          poolAddress: (l.args.pool as string).toLowerCase(),
          matchId: l.args.matchId || '',
          homeTeam: l.args.homeTeam || '',
          awayTeam: l.args.awayTeam || '',
        }));
    }
  } catch (err) {
    console.error('[pools/user-positions] on-chain pool list failed:', (err as Error).message);

    // Fallback: Supabase
    try {
      const rows = await getDeployedPools();
      if (rows.length > 0) {
        pools = rows.map(r => ({
          poolAddress: r.pool_address.toLowerCase(),
          matchId: r.match_id,
          homeTeam: r.home_team,
          awayTeam: r.away_team,
        }));
      }
    } catch {}

    // Last resort: engine's in-memory deployedPools
    if (pools.length === 0) {
      try {
        const { getEngine } = await import('@/lib/sim-engine');
        const state = getEngine().getState();
        pools = state.deployedPools.map(p => ({
          poolAddress: p.poolAddress.toLowerCase(),
          matchId: p.matchId,
          homeTeam: p.homeTeam,
          awayTeam: p.awayTeam,
        }));
      } catch {
        return NextResponse.json({ error: 'No pool sources available', positions: [] }, { status: 500 });
      }
    }
  }

  if (pools.length === 0) {
    return NextResponse.json({ positions: [] });
  }

  // Query each pool for user's deposit
  const positions: UserPosition[] = [];
  const BATCH_SIZE = 5; // avoid overwhelming RPC

  for (let i = 0; i < pools.length; i += BATCH_SIZE) {
    const batch = pools.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (pool) => {
        const poolAddr = pool.poolAddress as `0x${string}`;

        const [depositResult, stateRaw, claimed, winnerId, totals] = await Promise.all([
          publicClient.readContract({
            address: poolAddr,
            abi: POOL_ABI,
            functionName: 'getUserDeposit',
            args: [addr],
          }).catch(() => [0n, 0n]),
          publicClient.readContract({
            address: poolAddr,
            abi: POOL_ABI,
            functionName: 'state',
          }).catch(() => 255),
          publicClient.readContract({
            address: poolAddr,
            abi: POOL_ABI,
            functionName: 'claimed',
            args: [addr],
          }).catch(() => true), // if read fails treat as claimed (no action needed)
          publicClient.readContract({
            address: poolAddr,
            abi: POOL_ABI,
            functionName: 'winnerTeamId',
          }).catch(() => 255),
          publicClient.readContract({
            address: poolAddr,
            abi: POOL_ABI,
            functionName: 'getPoolTotals',
          }).catch(() => [0n, 0n]),
        ]);

        const dHome = Array.isArray(depositResult) ? (depositResult[0] as bigint) : 0n;
        const dAway = Array.isArray(depositResult) ? (depositResult[1] as bigint) : 0n;

        // Skip pools where user has no deposit
        if (dHome === 0n && dAway === 0n) return null;

        const totalH = Array.isArray(totals) ? (totals[0] as bigint) : 0n;
        const totalA = Array.isArray(totals) ? (totals[1] as bigint) : 0n;

        return {
          poolAddress: pool.poolAddress,
          matchId: pool.matchId,
          homeTeam: pool.homeTeam,
          awayTeam: pool.awayTeam,
          depositHome: dHome.toString(),
          depositAway: dAway.toString(),
          state: Number(stateRaw),
          claimed: Boolean(claimed),
          winnerTeamId: Number(winnerId) === 255 ? null : Number(winnerId),
          poolTotalsHome: totalH.toString(),
          poolTotalsAway: totalA.toString(),
        };
      }),
    );

    for (const r of results) {
      if (r.status === 'fulfilled' && r.value !== null) {
        positions.push(r.value);
      }
    }
  }

  return NextResponse.json({ positions, count: positions.length });
}
