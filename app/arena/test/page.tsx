'use client';

import { useEffect, useState } from 'react';
import { MomentumBar, PoolCard, EventFeed, type MomentumData, type EventItem } from '@/components/MomentumMeter';
import Nav from '@/components/Nav';
import TeamLogo from '@/components/TeamLogo';
import { useAccount, useWriteContract } from 'wagmi';
import { parseEther } from 'viem';
import { useLoading } from '@/components/LoadingOverlay';

const POOL_ABI = [
  { name: 'deposit', type: 'function', inputs: [{ name: 'teamId', type: 'uint8' }], stateMutability: 'payable', outputs: [] },
  { name: 'getPoolTotals', type: 'function', inputs: [], outputs: [{ name: '', type: 'uint256' }, { name: '', type: 'uint256' }], stateMutability: 'view' },
] as const;

const POOL_ADDRESS = (process.env.NEXT_PUBLIC_POOL_ADDRESS || '0x04Da66a885F7c1E52F984E7eFc013393aeeAA2df') as `0x${string}`;
const HOME_TEAM = 'Mexico';
const AWAY_TEAM = 'South Africa';

export default function TestArenaPage() {
  const { isConnected } = useAccount();
  const { writeContract, isPending } = useWriteContract();
  const { setLoading } = useLoading();
  useEffect(() => { setLoading(isPending); }, [isPending, setLoading]);

  // Kickoff 1 hour from now — keeps deposit window open
  const kickoff = Math.floor(Date.now() / 1000) + 3600;

  const handleDeposit = (_matchId: string, teamId: number, amount: string) => {
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
            <h2>Test Match</h2>
            <div className="live-indicator" style={{ color: 'var(--accent-primary)' }}>POOL</div>
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

          <MomentumBar data={null} loading={false} homeTeam={HOME_TEAM} awayTeam={AWAY_TEAM} />
          <PoolCard matchId="test-match" homeTeam={HOME_TEAM} awayTeam={AWAY_TEAM} kickoff={kickoff} onDeposit={handleDeposit} />
        </div>

        <footer className="app-footer">
          <p>Test Pool · <a href={`https://www.okx.com/web3/explorer/xlayer/address/${POOL_ADDRESS}`} target="_blank" rel="noopener">{POOL_ADDRESS.slice(0, 10)}...{POOL_ADDRESS.slice(-4)}</a></p>
        </footer>
      </div>
    </>
  );
}
