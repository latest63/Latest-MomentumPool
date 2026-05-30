import { NextResponse } from 'next/server';
import { getEngine } from '@/lib/sim-engine';

export async function POST() {
  const engine = getEngine();
  engine.start();
  return NextResponse.json({ ok: true });
}
