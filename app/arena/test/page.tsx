'use client';

import { useEffect, useState } from 'react';
import { MomentumBar, PoolCard, EventFeed, MomentumData, EventItem } from '@/components/MomentumMeter';
import Nav from '@/components/Nav';
import TeamLogo from '@/components/TeamLogo';
import { useAccount, useWriteContract } from 'wagmi';
import { parseEther } from 'viem';
import { useLoading } from '@/components/LoadingOverlay';
import { playSelect } from '@/lib/playSound';

const POOL_ABI = [
  {
    name: 'deposit',
    type: 'function',
    inputs: [{ name: 'teamId', type: 'uint8' }],
    stateMutability: 'payable',
    outputs: [],
  },
  {
    name: 'getPoolTotals',
    type: 'function',
    inputs: [],
    outputs: [
      { name: '', type: 'uint256' },
      { name: '', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
] as const;

const POOL_ADDRESS = (process.env.NEXT_PUBLIC_POOL_ADDRESS || '0x8f550f21824b56c2fd8d1398955ac043544ecfc7') as `0x${string}`;

const HOME_TEAM = 'Mexico';
const AWAY_TEAM = 'South Africa';
const MATCH_ID = 'test-match';
const GROUP = 'Friendly';
const COMPETITION = 'Test Match';

// Test momentum data — shows Mexico leading with events
const TEST_MOMENTUM: MomentumData = {
  homeScore: 8,
  awayScore: 3,
  homeTeam: HOME_TEAM,
  awayTeam: AWAY_TEAM,
  half: 'first',
  diff: 5,
};

const TEST_EVENTS: EventItem[] = [
  { type: 'goal', team: 'home', minute: 12, player: 'Jiménez' },
  { type: 'goal', team: 'home', minute: 23, player: 'Lozano' },
  { type: 'yellow_card', team: 'away', minute: 28, player: 'Mokoena' },
  { type: 'shot_on_target', team: 'away', minute: 31, player: 'Zungu' },
  { type: 'goal', team: 'away', minute: 35, player: 'Tau' },
  { type: 'corner', team: 'home', minute: 38 },
  { type: 'woodwork', team: 'home', minute: 41, player: 'Vega' },
];

export default function TestArenaPage() {
  const [momentum, setMomentum] = useState<MomentumData | null>(null);
  const [momLoaded, setMomLoaded] = useState(false);
  const [events, setEvents] = useState<EventItem[]>([]);
  const { address, isConnected } = useAccount();
  const { writeContract, isPending } = useWriteContract();
  const { setLoading } = useLoading();

  useEffect(() => { setLoading(isPending); }, [isPending, setLoading]);

  // Simulate loading test data on mount
  useEffect(() => {
    setMomentum(TEST_MOMENTUM);
    setEvents(TEST_EVENTS);
    setMomLoaded(true);
  }, []);

  const handleDeposit = (matchId: string, teamId: number, amount: string) => {
    if (!isConnected) return alert('Connect your wallet first');
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) return alert('Enter a valid amount');
    writeContract({
      address: POOL_ADDRESS,
      abi: POOL_ABI,
      functionName: 'deposit',
      args: [teamId],
      value: parseEther(amount),
    });
  };

  return (
    <>
      <Nav />
      <div className="main-content">
        <div className="match-selector">
          <div className="match-selector-header">
            <h2>{COMPETITION}</h2>
            <div className="live-indicator">TEST</div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <a
            href={`https://www.okx.com/web3/explorer/xlayer/address/${POOL_ADDRESS}`}
            target="_blank"
            rel="noopener"
            className="test-address-link"
          >
            Pool Contract ↗
          </a>
        </div>

        <div className="match-view">
          <div className="match-header">
            <div className="match-header-team">
              <TeamLogo name={HOME_TEAM} />
              <span>{HOME_TEAM}</span>
            </div>
            <div className="match-header-vs">
              VS
              <small>{GROUP}</small>
            </div>
            <div className="match-header-team">
              <TeamLogo name={AWAY_TEAM} />
              <span>{AWAY_TEAM}</span>
            </div>
          </div>

          <MomentumBar
            data={momentum}
            loading={!momLoaded}
            homeTeam={HOME_TEAM}
            awayTeam={AWAY_TEAM}
          />

          <PoolCard
            matchId={MATCH_ID}
            homeTeam={HOME_TEAM}
            awayTeam={AWAY_TEAM}
            onDeposit={handleDeposit}
          />

          <EventFeed events={events} homeTeam={HOME_TEAM} awayTeam={AWAY_TEAM} />
        </div>

        <footer className="app-footer">
          <p>Test Pool · <a href={`https://www.okx.com/web3/explorer/xlayer/address/${POOL_ADDRESS}`} target="_blank" rel="noopener">{POOL_ADDRESS.slice(0, 10)}...{POOL_ADDRESS.slice(-4)}</a></p>
        </footer>
      </div>
    </>
  );
}
