import { NextRequest, NextResponse } from 'next/server';
import { getEngine } from '@/lib/sim-engine';

export async function POST(req: NextRequest) {
  const { team, amount } = await req.json();
  const engine = getEngine();
  const ok = engine.deposit(team, amount ?? 0.001);
  return NextResponse.json({ ok });
}
