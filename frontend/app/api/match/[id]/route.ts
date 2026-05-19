import { NextRequest, NextResponse } from 'next/server';
import { getMatch } from '@/lib/momentum';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const match = getMatch(id);
  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  return NextResponse.json({
    ...match,
    recentEvents: match.events.slice(-50).reverse(),
  });
}
