import { NextRequest, NextResponse } from 'next/server';
import { deployPool } from '@/lib/sim-relayer';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { matchId, homeTeam, awayTeam } = await req.json();
    if (!matchId || !homeTeam || !awayTeam) {
      return NextResponse.json({ error: 'matchId, homeTeam, awayTeam required' }, { status: 400 });
    }
    const poolAddress = await deployPool(matchId, homeTeam, awayTeam);
    return NextResponse.json({ ok: true, poolAddress });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[sim/deploy]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
