import { NextRequest, NextResponse } from 'next/server';
import { computeMomentum, getMatch } from '@/lib/momentum';

export const dynamic = 'force-dynamic';

const fallbackInsight = (match: NonNullable<ReturnType<typeof getMatch>>) => {
  const result = computeMomentum(match.events);
  const leader = result.winner === 0 ? match.homeTeam : result.winner === 1 ? match.awayTeam : 'Both teams';
  const swing = Math.abs(result.homeScore - result.awayScore);
  return `${leader} ${result.winner === null ? 'are level' : 'control the momentum'} by ${swing} points. Watch the next goal, corner, or card — one event can flip the half.`;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const match = getMatch(id);
  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ insight: fallbackInsight(match), source: 'fallback' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 90,
        messages: [
          {
            role: 'system',
            content:
              'You are the Momentum Pool match analyst. Write one punchy, football-style GameFi insight. No prediction market language. Max 2 short sentences.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              match: `${match.homeTeam} vs ${match.awayTeam}`,
              venue: match.venue,
              half: match.half,
              momentum: computeMomentum(match.events),
              recentEvents: match.events.slice(-5),
            }),
          },
        ],
      }),
    });

    if (!response.ok) throw new Error(`OpenAI ${response.status}`);
    const data = await response.json();
    const insight = data?.choices?.[0]?.message?.content?.trim();
    return NextResponse.json({ insight: insight || fallbackInsight(match), source: insight ? 'openai' : 'fallback' });
  } catch (error) {
    console.error('AI insight failed:', error);
    return NextResponse.json({ insight: fallbackInsight(match), source: 'fallback' });
  }
}
