/**
 * Momentum Pool Backend Relayer
 *
 * Watches football matches, computes momentum at half-time,
 * and settles the on-chain pool.
 *
 * ── Depends on ──
 *   - Sports API client (APIFootball via RapidAPI, or Sportmonks)
 *   - Viem/Ethers for on-chain settlement
 *
 * ── Run ──
 *   pnpm install
 *   pnpm tsx src/relayer.ts
 */

import { createPublicClient, createWalletClient, http, parseEther, type Hash } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import 'dotenv/config';

/* ══════════════════════════ CONFIG ══════════════════════════ */

const XLAYER_RPC = process.env.XLAYER_RPC || 'https://testnet-rpc.xlayer.tech';
const FACTORY_ADDRESS = process.env.FACTORY_ADDRESS as `0x${string}`;
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;
const SPORTS_API_KEY = process.env.SPORTS_API_KEY || '';

// Match configs — you can fetch these from your DB or sports API dynamically
interface MatchConfig {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: number; // unix ts
  poolAddress?: `0x${string}`;
}

const MATCHES: MatchConfig[] = [
  // Example — populate from your DB or config file
  // { matchId: '12345', homeTeam: 'Nigeria', awayTeam: 'Brazil', kickoff: 1747700000 },
];

/* ══════════════════════════ MOMENTUM ENGINE ══════════════════════════ */

const POINTS = {
  goal: 5,
  woodwork: 2,
  shot_on_target: 1,
  corner: 1,
  foul: -1,
  yellow_card: -3,
  red_card: -5,
} as const;

type EventType = keyof typeof POINTS;

interface MatchEvent {
  type: EventType;
  team: 'home' | 'away';
  minute: number;
}

interface MomentumResult {
  homeScore: number;
  awayScore: number;
  winner: 0 | 1 | null; // null = tie
  events: MatchEvent[];
}

function computeMomentum(events: MatchEvent[]): MomentumResult {
  let homeScore = 0;
  let awayScore = 0;

  for (const ev of events) {
    const pts = POINTS[ev.type];
    if (ev.team === 'home') homeScore += pts;
    else awayScore += pts;
  }

  return {
    homeScore,
    awayScore,
    winner: homeScore > awayScore ? 0 : awayScore > homeScore ? 1 : null,
    events,
  };
}

/* ══════════════════════════ SPORTS API CLIENT ══════════════════════════ */

async function fetchMatchEvents(matchId: string): Promise<MatchEvent[]> {
  // ── Option A: API-Football (RapidAPI) ──
  const url = `https://api-football-v1.p.rapidapi.com/v3/fixtures/events?fixture=${matchId}`;
  const res = await fetch(url, {
    headers: {
      'x-rapidapi-key': SPORTS_API_KEY,
      'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
    },
  });

  if (!res.ok) {
    console.warn(`[API] HTTP ${res.status} for match ${matchId}`);
    return [];
  }

  const data = await res.json();
  if (!data.response) return [];

  // Map API-Football event types to our Momentum types
  const typeMap: Record<string, EventType> = {
    Goal: 'goal',
    'Card (yellow)': 'yellow_card',
    'Card (red)': 'red_card',
    'subst': 'foul', // substitutions ≈ minor disruption
    'Var': 'foul',
  };

  const events: MatchEvent[] = [];

  for (const raw of data.response) {
    const mappedType = typeMap[raw.type] || typeMap[raw.detail] || null;
    if (!mappedType) continue;

    events.push({
      type: mappedType,
      team: raw.team?.name?.toLowerCase().includes('nigeria') ? 'home' : 'away',
      minute: raw.time?.elapsed || 0,
    });
  }

  return events;
}

/* ══════════════════════════ ON-CHAIN SETTLEMENT ══════════════════════════ */

const MOMENTUM_POOL_ABI = [
  {
    type: 'function',
    name: 'settle',
    inputs: [
      { name: '_winner', type: 'uint8' },
      { name: 'score0', type: 'uint256' },
      { name: 'score1', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    outputs: [],
  },
  {
    type: 'function',
    name: 'cancel',
    inputs: [],
    stateMutability: 'nonpayable',
    outputs: [],
  },
  {
    type: 'function',
    name: 'state',
    inputs: [],
    stateMutability: 'view',
    outputs: [{ type: 'uint8' }],
  },
] as const;

const account = privateKeyToAccount(PRIVATE_KEY);
const walletClient = createWalletClient({
  account,
  chain: {
    id: 196, // X Layer mainnet — use 195 for testnet if different
    name: 'X Layer',
    nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
    rpcUrls: { default: { http: [XLAYER_RPC] } },
  },
  transport: http(),
});

async function settlePool(
  poolAddress: `0x${string}`,
  result: MomentumResult
): Promise<Hash | null> {
  try {
    if (result.winner === null) {
      // Tie → cancel
      const hash = await walletClient.writeContract({
        address: poolAddress,
        abi: MOMENTUM_POOL_ABI,
        functionName: 'cancel',
      });
      console.log(`[Settle] Cancelled (tie) — tx: ${hash}`);
      return hash;
    }

    const hash = await walletClient.writeContract({
      address: poolAddress,
      abi: MOMENTUM_POOL_ABI,
      functionName: 'settle',
      args: [result.winner, BigInt(result.homeScore), BigInt(result.awayScore)],
    });
    console.log(
      `[Settle] Pool ${poolAddress.slice(0, 10)} → Team ${result.winner} wins (${result.homeScore}-${result.awayScore}) — tx: ${hash}`
    );
    return hash;
  } catch (err) {
    console.error(`[Settle] Failed:`, (err as Error).message?.slice(0, 200));
    return null;
  }
}

/* ══════════════════════════ CRON LOOP ══════════════════════════ */

async function checkAndSettle(match: MatchConfig) {
  const now = Math.floor(Date.now() / 1000);
  const halfTime = match.kickoff + 45 * 60 + 15 * 60; // kickoff + 45min + 15min stoppage buffer

  // Not half-time yet
  if (now < halfTime) return;

  if (!match.poolAddress) {
    console.warn(`[Check] No pool deployed for match ${match.matchId}`);
    return;
  }

  // Check if already settled
  const publicClient = createPublicClient({
    chain: {
      id: 196,
      name: 'X Layer',
      nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
      rpcUrls: { default: { http: [XLAYER_RPC] } },
    },
    transport: http(),
  });

  const state = await publicClient.readContract({
    address: match.poolAddress,
    abi: MOMENTUM_POOL_ABI,
    functionName: 'state',
  });

  if (state === 2 || state === 3) {
    console.log(`[Check] Pool ${match.poolAddress.slice(0, 10)} already settled (state=${state})`);
    return; // Already settled or cancelled
  }

  // Fetch events and settle
  const events = await fetchMatchEvents(match.matchId);
  const result = computeMomentum(events);
  console.log(`[Check] ${match.homeTeam} ${result.homeScore} - ${result.awayScore} ${match.awayTeam} (${events.length} events)`);
  await settlePool(match.poolAddress!, result);
}

async function main() {
  console.log(`[Relayer] Watching ${MATCHES.length} matches...`);

  // ── Poll every 60s ──
  setInterval(async () => {
    for (const match of MATCHES) {
      try {
        await checkAndSettle(match);
      } catch (err) {
        console.error(`[Relayer] Error on ${match.matchId}:`, (err as Error).message);
      }
    }
  }, 60_000);

  // Also run once immediately
  for (const match of MATCHES) {
    await checkAndSettle(match);
  }
}

main().catch(console.error);
