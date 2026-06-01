'use client';

import { useAccount, useWriteContract } from 'wagmi';
import Nav from '@/components/Nav';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLoading } from '@/components/LoadingOverlay';
import confetti from 'canvas-confetti';
import type { UserPosition } from '@/app/api/pools/user-positions/route';
import { POOL_ABI } from '@/lib/pool-abi';

/* ─── Token config ─── */
const USDG_DECIMALS = 6;

const STATE_LABELS = ['Open', 'Live', 'Settled', 'Cancelled'];
const STATE_CLASSES = ['state-open', 'state-live', 'state-settled', 'state-cancelled'];

export default function PositionsPage() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const { setLoading } = useLoading();
  const [positions, setPositions] = useState<UserPosition[] | null>(null);
  const [loading, setLoadingLocal] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null); // poolAddress being claimed
  const [claimError, setClaimError] = useState('');
  const [showCup, setShowCup] = useState(false);
  const hasFired = useRef(false);

  // Fetch positions when wallet connects
  useEffect(() => {
    if (!address) {
      setPositions(null);
      setLoadingLocal(false);
      return;
    }

    setLoadingLocal(true);
    fetch(`/api/pools/user-positions?address=${address}`)
      .then(r => r.json())
      .then(data => {
        setPositions(data.positions || []);
        setLoadingLocal(false);
      })
      .catch(() => {
        setPositions([]);
        setLoadingLocal(false);
      });
  }, [address]);

  useEffect(() => { setLoading(loading || claiming !== null || isPending); }, [loading, claiming, isPending, setLoading]);

  const fireConfetti = useCallback(() => {
    if (hasFired.current) return;
    hasFired.current = true;
    confetti({ particleCount: 150, spread: 100, origin: { x: 0.5, y: 0.4 }, colors: ['#ffd700', '#ff6b6b', '#48dbfb', '#ff9ff3', '#feca57'] });
    setTimeout(() => confetti({ particleCount: 80, spread: 80, origin: { x: 0.2, y: 0.5 }, colors: ['#ffd700', '#ff6b6b', '#48dbfb'] }), 200);
    setTimeout(() => confetti({ particleCount: 80, spread: 80, origin: { x: 0.8, y: 0.5 }, colors: ['#ffd700', '#ff9ff3', '#feca57'] }), 400);
    setTimeout(() => confetti({ particleCount: 200, spread: 120, origin: { x: 0.5, y: 0.3 } }), 600);
  }, []);

  const handleClaim = async (pool: UserPosition) => {
    if (claiming) return;
    setClaiming(pool.poolAddress);
    setClaimError('');

    try {
      await writeContractAsync({
        abi: POOL_ABI,
        address: pool.poolAddress as `0x${string}`,
        functionName: 'withdraw',
      });

      // Refetch positions after a brief delay for tx to propagate
      await new Promise(r => setTimeout(r, 2000));
      const res = await fetch(`/api/pools/user-positions?address=${address}`);
      const data = await res.json();
      setPositions(data.positions || []);

      setShowCup(true);
      setTimeout(fireConfetti, 500);
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'Claim failed');
    } finally {
      setClaiming(null);
    }
  };

  const totalDeposit = (dep: UserPosition) => BigInt(dep.depositHome) + BigInt(dep.depositAway);
  const teamPicked = (dep: UserPosition) =>
    BigInt(dep.depositHome) > 0n ? dep.homeTeam
    : BigInt(dep.depositAway) > 0n ? dep.awayTeam
    : null;

  return (
    <>
      <Nav />
      <div className="main-content">
        <div className="page-header">
          <h1>Your Positions</h1>
          <p className="page-subtitle" style={{ fontWeight: 700, color: '#fff' }}>Active deposits and winnings across all pool matches</p>
        </div>

        {!isConnected ? (
          <div className="empty-state">
            <span className="empty-icon">🔌</span>
            <h3>Connect your wallet</h3>
            <p>Connect to view your positions and claim winnings</p>
          </div>
        ) : loading ? (
          <div className="empty-state">
            <span className="empty-icon">⏳</span>
            <h3>Loading positions...</h3>
            <p>Checking on-chain deposits across all pools</p>
          </div>
        ) : !positions || positions.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📭</span>
            <h3>No positions found</h3>
            <p>Head to the Arena to place a deposit on a match</p>
          </div>
        ) : (
          <div className="positions-list">
            {positions.map((pool) => {
              const depHome = Number(BigInt(pool.depositHome)) / 10 ** USDG_DECIMALS;
              const depAway = Number(BigInt(pool.depositAway)) / 10 ** USDG_DECIMALS;
              const total = depHome + depAway;
              const team = teamPicked(pool);
              const poolTotalH = Number(BigInt(pool.poolTotalsHome)) / 10 ** USDG_DECIMALS;
              const poolTotalA = Number(BigInt(pool.poolTotalsAway)) / 10 ** USDG_DECIMALS;
              const poolTotal = poolTotalH + poolTotalA;
              const isSettled = pool.state === 2;
              const isCancelled = pool.state === 3;
              const canClaim = (isSettled || isCancelled) && !pool.claimed && total > 0;

              return (
                <div key={pool.poolAddress} className={`position-card ${STATE_CLASSES[pool.state] || ''}`}>
                  <div className="position-header">
                    <span className="position-match">{pool.homeTeam} vs {pool.awayTeam}</span>
                    <span className={`position-state ${STATE_CLASSES[pool.state] || ''}`}>
                      {STATE_LABELS[pool.state] || 'Unknown'}
                    </span>
                  </div>

                  <div className="position-details">
                    <div className="position-row">
                      <span className="pos-label">Your deposit</span>
                      <span className="pos-value">{total.toFixed(4)} USDG</span>
                    </div>
                    <div className="position-row">
                      <span className="pos-label">Team</span>
                      <span className="pos-value pos-team">{team || '—'}</span>
                    </div>
                    <div className="position-row">
                      <span className="pos-label">Pool total</span>
                      <span className="pos-value">{poolTotal.toFixed(4)} USDG</span>
                    </div>
                    {isSettled && pool.winnerTeamId !== null && (
                      <div className="position-row">
                        <span className="pos-label">Winner</span>
                        <span className="pos-value pos-winner">
                          {pool.winnerTeamId === 0 ? pool.homeTeam : pool.awayTeam} 🏆
                        </span>
                      </div>
                    )}
                  </div>

                  {canClaim && (
                    <div className="position-action">
                      <button
                        className="claim-btn"
                        onClick={() => handleClaim(pool)}
                        disabled={claiming === pool.poolAddress}
                      >
                        {claiming === pool.poolAddress ? 'Claiming...' : 'Claim Winnings'}
                      </button>
                      {claimError && claiming === pool.poolAddress && (
                        <p className="claim-error">{claimError}</p>
                      )}
                    </div>
                  )}

                  {pool.claimed && (
                    <div className="position-claimed">
                      ✅ Winnings claimed
                    </div>
                  )}
                </div>
              );
            })}
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
