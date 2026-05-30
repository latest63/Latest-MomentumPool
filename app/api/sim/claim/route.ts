import { NextRequest, NextResponse } from 'next/server';
import { getEngine } from '@/lib/sim-engine';

export async function POST(req: NextRequest) {
  const { team } = await req.json();
  const engine = getEngine();
  const result = engine.claim(team);
  return NextResponse.json(result ?? { won: false, payout: 0 });
}
