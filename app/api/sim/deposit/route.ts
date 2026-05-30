import { NextRequest, NextResponse } from 'next/server';
import { getEngine } from '@/lib/sim-engine';

export async function POST(req: NextRequest) {
  const { matchId, team, amount } = await req.json();
  const engine = getEngine();
  const ok = engine.deposit(matchId, team, amount);
  return NextResponse.json({ ok });
}
