/**
 * Momentum Engine — pure computation, no I/O, no in-memory store.
 *
 * All match data (metadata + events) lives in Supabase.
 * This module only computes scores from a list of events.
 */
import type { EventType, MatchEvent } from '@/lib/db';

export const POINTS: Record<EventType, number> = {
  goal: 5,
  woodwork: 2,
  shot_on_target: 1,
  corner: 1,
  foul: -1,
  yellow_card: -3,
  red_card: -5,
};

export interface MomentumResult {
  homeScore: number;
  awayScore: number;
  winner: 0 | 1 | null;
}

/** Compute momentum scores from a list of events */
export function computeMomentum(events: MatchEvent[]): MomentumResult {
  let homeScore = 0;
  let awayScore = 0;

  for (const ev of events) {
    const pts = POINTS[ev.type] || 0;
    if (ev.team === 'home') homeScore += pts;
    else awayScore += pts;
  }

  return {
    homeScore,
    awayScore,
    winner: homeScore > awayScore ? 0 : awayScore > homeScore ? 1 : null,
  };
}
