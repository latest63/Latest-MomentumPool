import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'data', 'matches.json');

export interface MatchRecord {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeCode?: string;
  awayCode?: string;
  homeBadge?: string;
  awayBadge?: string;
  competition: string;
  group?: string;
  kickoff: number;
  half: string;
  status: string;
  poolAddress?: string;
  poolFactory?: string;
  settled?: boolean;
  winner?: number;
  homeScore?: number;
  awayScore?: number;
}

interface DbData {
  matches: MatchRecord[];
}

function load(): DbData {
  try {
    if (!existsSync(DB_PATH)) return { matches: [] };
    const raw = readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw) as DbData;
  } catch {
    return { matches: [] };
  }
}

function save(data: DbData): void {
  writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

/** Get all matches */
export function getAllMatches(): MatchRecord[] {
  return load().matches;
}

/** Get match by ID */
export function getMatch(id: string): MatchRecord | undefined {
  return load().matches.find((m) => m.id === id);
}

/** Add or update a match */
export function upsertMatch(match: MatchRecord): void {
  const data = load();
  const idx = data.matches.findIndex((m) => m.id === match.id);
  if (idx >= 0) {
    data.matches[idx] = match;
  } else {
    data.matches.push(match);
  }
  save(data);
}

/** Delete match */
export function deleteMatch(id: string): void {
  const data = load();
  data.matches = data.matches.filter((m) => m.id !== id);
  save(data);
}

/** Update settlement for a match */
export function settleMatch(id: string, winner: number, homeScore: number, awayScore: number): void {
  const data = load();
  const match = data.matches.find((m) => m.id === id);
  if (!match) return;
  match.settled = true;
  match.winner = winner;
  match.homeScore = homeScore;
  match.awayScore = awayScore;
  match.half = 'fulltime';
  match.status = 'settled';
  save(data);
}
