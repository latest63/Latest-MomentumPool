import { NextRequest, NextResponse } from 'next/server';
import { settlePool } from '@/lib/sim-relayer';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { poolAddress, winner, homeScore, awayScore } = await req.json();
    if (!poolAddress || winner === undefined) {
      return NextResponse.json({ error: 'poolAddress and winner required' }, { status: 400 });
    }
    const result = await settlePool(poolAddress, winner, homeScore || 0, awayScore || 0);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[sim/settle]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
