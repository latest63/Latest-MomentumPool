'use client';

import { useEffect, useState } from 'react';
import { MomentumBar, PoolCard, EventFeed, type MomentumData, type EventItem } from '@/components/MomentumMeter';
import Nav from '@/components/Nav';
import TeamLogo from '@/components/TeamLogo';
import { useAccount, useReadContract } from 'wagmi';

const POOL_ABI = [
  {
    name: 'state',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    name: 'winnerTeamId',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    name: 'winningScore',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'losingScore',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'team0',
    type: 'function',
    inputs: [],
    outputs: [{ name: 'total', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'team1',
    type: 'function',
    inputs: [],
    outputs: [{ name: 'total', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

const POOL_ADDRESS = (process.env.NEXT_PUBLIC_POOL_ADDRESS || '0x04DA66A885F7C1e52F984e7eFC013393AEEAA2df') as `0x${string}`;
const HOME_TEAM = 'Mexico';
const AWAY_TEAM = 'South Africa';

// Settled momentum + events for display
const SETTLED_MOMENTUM: MomentumData = {
  homeScore: 2,
  awayScore: 1,
  homeTeam: HOME_TEAM,
  awayTeam: AWAY_TEAM,
  half: 'fulltime',
  diff: 1,
};

const SETTLED_EVENTS: EventItem[] = [
  { type: 'goal', team: 'home', minute: 12, player: 'Jiménez' },
  { type: 'goal', team: 'home', minute: 23, player: 'Lozano' },
  { type: 'goal', team: 'away', minute: 35, player: 'Tau' },
];

export default function TestArenaPage() {
  const { isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data: rawState } = useReadContract({
    address: POOL_ADDRESS,
    abi: POOL_ABI,
    functionName: 'state',
  });
  const { data: rawWinner } = useReadContract({
    address: POOL_ADDRESS,
    abi: POOL_ABI,
    functionName: 'winnerTeamId',
  });
  const { data: rawWinScore } = useReadContract({
    address: POOL_ADDRESS,
    abi: POOL_ABI,
    functionName: 'winningScore',
  });
  const { data: rawLoseScore } = useReadContract({
    address: POOL_ADDRESS,
    abi: POOL_ABI,
    functionName: 'losingScore',
  });
  const { data: rawHomeTotal } = useReadContract({
    address: POOL_ADDRESS,
    abi: POOL_ABI,
    functionName: 'team0',
  });
  const { data: rawAwayTotal } = useReadContract({
    address: POOL_ADDRESS,
    abi: POOL_ABI,
    functionName: 'team1',
  });

  const state = mounted ? Number(rawState ?? 0) : 0;
  const winner = Number(rawWinner ?? 0);
  const winScore = Number(rawWinScore ?? 0);
  const loseScore = Number(rawLoseScore ?? 0);
  const homeTotal = Number(rawHomeTotal ?? 0);
  const awayTotal = Number(rawAwayTotal ?? 0);

  const isSettled = state === 2;
  const winnerName = winner === 0 ? HOME_TEAM : AWAY_TEAM;
  const loserName = winner === 0 ? AWAY_TEAM : HOME_TEAM;

  return (
    <>
      <Nav />
      <div className="main-content">
        <div className="match-selector">
          <div className="match-selector-header">
            <h2>Test Pool</h2>
            <div className="live-indicator" style={{ color: 'var(--bright-green)' }}>SETTLED</div>
          </div>
        </div>

        <div className="match-view">
          <div className="match-header">
            <div className="match-header-team">
              <TeamLogo name={HOME_TEAM} />
              <span>{HOME_TEAM}</span>
            </div>
            <div className="match-header-vs">
              VS
              <small>Friendly</small>
            </div>
            <div className="match-header-team">
              <TeamLogo name={AWAY_TEAM} />
              <span>{AWAY_TEAM}</span>
            </div>
          </div>

          {/* Settlement banner */}
          {isSettled && (
            <div className="settle-banner">
              <div className="settle-winner">
                🏆 <strong>{winnerName}</strong> won{' '}
                <span className="settle-score">{winScore}–{loseScore}</span>
              </div>
              <div className="settle-pool-totals">
                Pool: {parseFloat((homeTotal / 1e18).toFixed(4))} OKB on {HOME_TEAM} ·{' '}
                {parseFloat((awayTotal / 1e18).toFixed(4))} OKB on {AWAY_TEAM}
              </div>
            </div>
          )}

          <MomentumBar data={SETTLED_MOMENTUM} homeTeam={HOME_TEAM} awayTeam={AWAY_TEAM} />
          <EventFeed events={SETTLED_EVENTS} homeTeam={HOME_TEAM} awayTeam={AWAY_TEAM} />

          {/* If connected, hide PoolCard and show claim button */}
          {isConnected && isSettled && (
            <div style={{ textAlign: 'center', margin: '24px 0' }}>
              <a
                href={`https://www.okx.com/web3/explorer/xlayer/address/${POOL_ADDRESS}`}
                target="_blank"
                rel="noopener"
                style={{
                  display: 'inline-block', padding: '12px 24px',
                  background: 'var(--accent-primary)', color: '#fff',
                  borderRadius: 8, fontWeight: 600, textDecoration: 'none',
                }}
              >
                View on OKX Explorer ↗
              </a>
            </div>
          )}
        </div>

        <footer className="app-footer">
          <p>
            Pool ·{' '}
            <a
              href={`https://www.okx.com/web3/explorer/xlayer/address/${POOL_ADDRESS}`}
              target="_blank"
              rel="noopener"
            >
              {POOL_ADDRESS.slice(0, 10)}...{POOL_ADDRESS.slice(-4)}
            </a>
            · <a href="/arena" style={{ color: 'var(--accent-primary)' }}>Back to Arena →</a>
          </p>
        </footer>
      </div>
    </>
  );
}
