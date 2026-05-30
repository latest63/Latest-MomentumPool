import { NextResponse } from 'next/server';
import { getEngine } from '@/lib/sim-engine';

/* ─── GET /api/sim/state ─── */
export async function GET() {
  const engine = getEngine();
  if (!engine) {
    return NextResponse.json({ error: 'Engine not available' }, { status: 500 });
  }
  return NextResponse.json(engine.getState());
}
