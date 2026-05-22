'use client';

import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import Nav from '@/components/Nav';
import { useState, useEffect } from 'react';
import { useLoading } from '@/components/LoadingOverlay';

const POOL_ADDRESS = '0x86ce525510b61d21de8ad122fc7f4e43a66c5f68';

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
    </>
  );
}
