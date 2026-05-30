'use client';

import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import Nav from '@/components/Nav';
import { useState, useEffect, useRef } from 'react';
import { useLoading } from '@/components/LoadingOverlay';
import confetti from 'canvas-confetti';

const POOL_ADDRESS = process.env.NEXT_PUBLIC_POOL_ADDRESS || '0x04DA66A885F7C1e52F984e7eFC013393AEEAA2df';

const POOL_ABI = [
  {
    name: 'getUserDeposit',
    type: 'function',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: '', type: 'uint256' },
      { name: '', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    name: 'state',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    name: 'claimed',
    type: 'function',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
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
    name: 'getPoolTotals',
    type: 'function',
    inputs: [],
    outputs: [
      { name: '', type: 'uint256' },
      { name: '', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    name: 'withdraw',
    type: 'function',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

const STATE_LABELS = ['Open', 'Live', 'Settled', 'Cancelled'];
const STATE_CLASSES = ['state-open', 'state-live', 'state-settled', 'state-cancelled'];

interface PoolInfo {
  address: string;
  homeTeam: string;
  awayTeam: string;
  label: string;
}

const KNOWN_POOLS: PoolInfo[] = [
  {
    address: POOL_ADDRESS.toLowerCase(),
    homeTeam: 'Brazil',
    awayTeam: 'Nigeria',
    label: 'Brazil vs Nigeria',
  },
];

export default function PositionsPage() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const { setLoading } = useLoading();
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [showCup, setShowCup] = useState(false);
  const hasFired = useRef(false);

  useEffect(() => { setLoading(isPending || claiming); }, [isPending, claiming, setLoading]);

  // Resolve pool info (could expand to multiple pools later)
  const pool = KNOWN_POOLS[0];

  // Read deposit data
  const { data: deposits, refetch: refetchDeposits } = useReadContract({
    address: POOL_ADDRESS as `0x${string}`,
    abi: POOL_ABI,
    functionName: 'getUserDeposit',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: stateRaw } = useReadContract({
    address: POOL_ADDRESS as `0x${string}`,
    abi: POOL_ABI,
    functionName: 'state',
  });

  const { data: hasClaimed } = useReadContract({
    address: POOL_ADDRESS as `0x${string}`,
    abi: POOL_ABI,
    functionName: 'claimed',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: winnerId } = useReadContract({
    address: POOL_ADDRESS as `0x${string}`,
    abi: POOL_ABI,
    functionName: 'winnerTeamId',
  });

  const { data: poolTotals, refetch: refetchTotals } = useReadContract({
    address: POOL_ADDRESS as `0x${string}`,
    abi: POOL_ABI,
    functionName: 'getPoolTotals',
  });

  const poolState = stateRaw !== undefined ? Number(stateRaw) : -1;
  const depos0 = deposits ? Number(deposits[0]) : 0;
  const depos1 = deposits ? Number(deposits[1]) : 0;
  const totalDeposit = depos0 + depos1;
  const teamPicked = depos0 > 0 ? 0 : depos1 > 0 ? 1 : -1;
  const teamLabel = teamPicked === 0 ? pool.homeTeam : teamPicked === 1 ? pool.awayTeam : null;

  const isSettled = poolState === 2;
  const isCancelled = poolState === 3;
  const canClaim = isConnected && (isSettled || isCancelled) && !hasClaimed && totalDeposit > 0;

  const fireConfetti = () => {
    if (hasFired.current) return;
    hasFired.current = true;
    confetti({ particleCount: 150, spread: 100, origin: { x: 0.5, y: 0.4 }, colors: ['#ffd700', '#ff6b6b', '#48dbfb', '#ff9ff3', '#feca57'] });
    setTimeout(() => confetti({ particleCount: 80, spread: 80, origin: { x: 0.2, y: 0.5 }, colors: ['#ffd700', '#ff6b6b', '#48dbfb'] }), 200);
    setTimeout(() => confetti({ particleCount: 80, spread: 80, origin: { x: 0.8, y: 0.5 }, colors: ['#ffd700', '#ff9ff3', '#feca57'] }), 400);
    setTimeout(() => confetti({ particleCount: 200, spread: 120, origin: { x: 0.5, y: 0.3 } }), 600);
  };

  const handleClaim = async () => {
    if (!canClaim) return;
    setClaiming(true);
    setClaimError('');
    try {
      await writeContractAsync({
        address: POOL_ADDRESS as `0x${string}`,
        abi: POOL_ABI,
        functionName: 'withdraw',
      });
      await refetchDeposits();
      await refetchTotals();
      setShowCup(true);
      setTimeout(fireConfetti, 500);
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'Claim failed');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <>
      <Nav />
      <div className="main-content">
        <div className="page-header">
          <h1>Your Positions</h1>
          <p className="page-subtitle">Active deposits and winnings across all pool matches</p>
        </div>

        {!isConnected ? (
          <div className="empty-state">
            <span className="empty-icon">🔌</span>
            <h3>Connect your wallet</h3>
            <p>Connect to view your positions and claim winnings</p>
          </div>
        ) : totalDeposit === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📭</span>
            <h3>No active positions</h3>
            <p>Head to the Arena to place a deposit on a match</p>
          </div>
        ) : (
          <div className="positions-list">
            <div className={`position-card ${STATE_CLASSES[poolState] || ''}`}>
              <div className="position-header">
                <span className="position-match">{pool.label}</span>
                <span className={`position-state ${STATE_CLASSES[poolState] || ''}`}>
                  {STATE_LABELS[poolState] || 'Unknown'}
                </span>
              </div>

              <div className="position-details">
                <div className="position-row">
                  <span className="pos-label">Your deposit</span>
                  <span className="pos-value">{totalDeposit / 1e18} OKB</span>
                </div>
                <div className="position-row">
                  <span className="pos-label">Team</span>
                  <span className="pos-value pos-team">{teamLabel || '—'}</span>
                </div>
                {poolTotals && (
                  <div className="position-row">
                    <span className="pos-label">Pool total</span>
                    <span className="pos-value">
                      {Number(poolTotals[0]) / 1e18 + Number(poolTotals[1]) / 1e18} OKB
                    </span>
                  </div>
                )}
                {isSettled && (
                  <div className="position-row">
                    <span className="pos-label">Winner</span>
                    <span className={`pos-value pos-winner`}>
                      {Number(winnerId) === 0 ? pool.homeTeam : pool.awayTeam} 🏆
                    </span>
                  </div>
                )}
              </div>

              {canClaim && (
                <div className="position-action">
                  <button
                    className="claim-btn"
                    onClick={handleClaim}
                    disabled={claiming || isPending}
                  >
                    {claiming || isPending ? 'Claiming...' : 'Claim Winnings'}
                  </button>
                  {claimError && <p className="claim-error">{claimError}</p>}
                </div>
              )}

              {hasClaimed && (
                <div className="position-claimed">
                  ✅ Winnings claimed
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showCup && (
        <div className="cup-overlay" onClick={() => setShowCup(false)}>
          <div className="cup-popup" onClick={e => e.stopPropagation()}>
            <img src="/assets/worldcup.png" alt="Champion" className="cup-image" />
            <div className="cup-text">🏆 You Won! 🏆</div>
            <button className="cup-close" onClick={() => setShowCup(false)}>
              Claimed!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
