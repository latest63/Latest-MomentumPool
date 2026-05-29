'use client';

import { useEffect, useState } from 'react';
import { MomentumBar, EventFeed, PoolCard, type MomentumData, type EventItem } from '@/components/MomentumMeter';
import Nav from '@/components/Nav';
import { useAccount, useReadContract, useWriteContract, useSwitchChain } from 'wagmi';
import { parseEther } from 'viem';
import { useLoading } from '@/components/LoadingOverlay';
import { playSelect } from '@/lib/playSound';
import MatchCarousel from '@/components/MatchCarousel';
import TeamLogo from '@/components/TeamLogo';

const POOL_ABI = [
  { name: 'deposit', type: 'function', inputs: [{ name: 'teamId', type: 'uint8' }], stateMutability: 'payable', outputs: [] },
  { name: 'getPoolTotals', type: 'function', inputs: [], outputs: [{ name: '', type: 'uint256' }, { name: '', type: 'uint256' }], stateMutability: 'view' },
  { name: 'state', type: 'function', inputs: [], outputs: [{ name: '', type: 'uint8' }], stateMutability: 'view' },
  { name: 'winnerTeamId', type: 'function', inputs: [], outputs: [{ name: '', type: 'uint8' }], stateMutability: 'view' },
  { name: 'winningScore', type: 'function', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { name: 'losingScore', type: 'function', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
  { name: 'team0', type: 'function', inputs: [], outputs: [{ name: 'total', type: 'uint256' }], stateMutability: 'view' },
  { name: 'team1', type: 'function', inputs: [], outputs: [{ name: 'total', type: 'uint256' }], stateMutability: 'view' },
] as const;

const FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_POOL_FACTORY || '0x654E54963eE6440fB30AD92C19AfF8e89Dd15ac5') as `0x${string}`;
const POOL_ADDRESS = (process.env.NEXT_PUBLIC_POOL_ADDRESS || '0x04DA66A885F7C1e52F984e7eFC013393AEEAA2df') as `0x${string}`;

interface MatchSummary {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeCode?: string;
  awayCode?: string;
  homeBadge?: string;
  awayBadge?: string;
  homeScore?: number;
  awayScore?: number;
  status?: string;
  kickoff?: number;
  competition?: string;
  group?: string;
  isLive?: boolean;
  half?: string;
  poolAddress?: string;
  settled?: boolean;
}

export default function ArenaPage() {
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [selected, setSelected] = useState('');
  const [momentum, setMomentum] = useState<MomentumData | null>(null);
  const [momLoaded, setMomLoaded] = useState(false);
  const [events, setEvents] = useState<EventItem[]>([]);
  const { address, isConnected, chainId } = useAccount();
  const { writeContract, isPending } = useWriteContract();
  const { switchChain } = useSwitchChain();
  const { setLoading } = useLoading();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => { setLoading(isPending); }, [isPending, setLoading]);

  // Fetch match list from Supabase
  useEffect(() => {
    fetch('/api/matches')
      .then(r => r.json())
      .then(d => {
        if (d.matches?.length) {
          setMatches(d.matches);
          if (!selected) setSelected(d.matches[0].matchId);
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep selected in sync
  useEffect(() => {
    if (matches.length && !matches.find(m => m.matchId === selected)) {
      setSelected(matches[0].matchId);
    }
  }, [matches, selected]);

  // Live poll momentum + events from Supabase
  useEffect(() => {
    if (!selected) return;
    setMomLoaded(false);
    setMomentum(null);

    const fetchLive = async () => {
      try {
        const [momRes, evRes] = await Promise.all([
          fetch(`/api/match/${selected}/momentum`),
          fetch(`/api/match/${selected}`),
        ]);
        if (momRes.ok) setMomentum(await momRes.json());
        setMomLoaded(true);
        if (evRes.ok) { const d = await evRes.json(); setEvents(d.recentEvents || []); }
      } catch {}
    };
    fetchLive();
    const interval = setInterval(fetchLive, 15_000);
    return () => clearInterval(interval);
  }, [selected]);

  const selectedMatch = matches.find(m => m.matchId === selected);
  const activePoolAddress = (selectedMatch?.poolAddress || POOL_ADDRESS) as `0x${string}`;

  // On-chain state for settled pools
  const { data: rawState } = useReadContract({
    address: activePoolAddress,
    abi: POOL_ABI,
    functionName: 'state',
  });
  const { data: rawWinner } = useReadContract({
    address: activePoolAddress,
    abi: POOL_ABI,
    functionName: 'winnerTeamId',
  });
  const { data: rawWinScore } = useReadContract({
    address: activePoolAddress,
    abi: POOL_ABI,
    functionName: 'winningScore',
  });
  const { data: rawLoseScore } = useReadContract({
    address: activePoolAddress,
    abi: POOL_ABI,
    functionName: 'losingScore',
  });
  const { data: rawHomeTotal } = useReadContract({
    address: activePoolAddress,
    abi: POOL_ABI,
    functionName: 'team0',
  });
  const { data: rawAwayTotal } = useReadContract({
    address: activePoolAddress,
    abi: POOL_ABI,
    functionName: 'team1',
  });
  const { data: rawPoolTotals } = useReadContract({
    address: activePoolAddress,
    abi: POOL_ABI,
    functionName: 'getPoolTotals',
  });

  const chainState = mounted ? Number(rawState ?? 0) : 0;
  const isOnChainSettled = chainState === 2;
  const winner = Number(rawWinner ?? 0);
  const winScore = Number(rawWinScore ?? 0);
  const loseScore = Number(rawLoseScore ?? 0);
  const homeTotal = Number(rawHomeTotal ?? 0);
  const awayTotal = Number(rawAwayTotal ?? 0);
  const [poolHome, poolAway] = rawPoolTotals ? [Number(rawPoolTotals[0]), Number(rawPoolTotals[1])] : [BigInt(0), BigInt(0)];

  const isMatchSettled = selectedMatch?.settled || isOnChainSettled;
  const homeTeam = selectedMatch?.homeTeam || '';
  const awayTeam = selectedMatch?.awayTeam || '';
  const winnerName = winner === 0 ? homeTeam : awayTeam;

  const handleDeposit = (matchId: string, teamId: number, amount: string) => {
    if (!isConnected) return alert('Connect your wallet first');
    if (chainId !== 196) {
      alert('Switch to X Layer in your wallet');
      switchChain?.({ chainId: 196 });
      return;
    }
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) return alert('Enter a valid amount');
    writeContract({
      address: activePoolAddress,
      abi: POOL_ABI,
      functionName: 'deposit',
      args: [teamId],
      value: parseEther(amount),
    }, {
      onError(err) {
        alert(`Transaction failed: ${err.message}`);
        console.error('Deposit error:', err);
      },
    });
  };

  if (!selectedMatch) return null;

  return (
    <>
      <Nav />
      <div className="main-content">
        <div className="match-selector">
          <div className="match-selector-header">
            <h2>{selectedMatch.competition || 'Momentum Pool'}</h2>
            {isMatchSettled ? (
              <div className="live-indicator" style={{ color: 'var(--bright-green)' }}>SETTLED</div>
            ) : selectedMatch.isLive ? (
              <div className="live-indicator">LIVE</div>
            ) : null}
          </div>
          <MatchCarousel
            matches={matches}
            selected={selected}
            onSelect={(id) => { playSelect(); setSelected(id); }}
          />
        </div>

        <div className="match-view">
          <div className="match-header">
            <div className="match-header-team">
              <TeamLogo
                name={selectedMatch.homeTeam}
                badge={selectedMatch.homeBadge}
                code={selectedMatch.homeCode}
              />
              <span>{selectedMatch.homeTeam}</span>
            </div>
            <div className="match-header-vs">
              VS
              {selectedMatch.group && <small>{selectedMatch.group}</small>}
            </div>
            <div className="match-header-team">
              <TeamLogo
                name={selectedMatch.awayTeam}
                badge={selectedMatch.awayBadge}
                code={selectedMatch.awayCode}
              />
              <span>{selectedMatch.awayTeam}</span>
            </div>
          </div>

          {/* Settlement banner */}
          {isOnChainSettled && (
            <div className="settle-banner">
              <div className="settle-winner">
                🏆 <strong>{winnerName}</strong> won{' '}
                <span className="settle-score">{winScore}–{loseScore}</span>
              </div>
              <div className="settle-pool-totals">
                Pool: {parseFloat((homeTotal / 1e18).toFixed(4))} OKB on {homeTeam} ·{' '}
                {parseFloat((awayTotal / 1e18).toFixed(4))} OKB on {awayTeam}
              </div>
            </div>
          )}

          <MomentumBar
            data={momentum}
            loading={!momLoaded}
            homeTeam={selectedMatch.homeTeam}
            awayTeam={selectedMatch.awayTeam}
          />

          {isMatchSettled ? (
            <>
              <EventFeed events={events} homeTeam={homeTeam} awayTeam={awayTeam} />
              {isConnected && (
                <div style={{ textAlign: 'center', margin: '24px 0' }}>
                  <a
                    href={`https://www.okx.com/web3/explorer/xlayer/address/${activePoolAddress}`}
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
            </>
          ) : (
            <PoolCard
              matchId={selectedMatch.matchId}
              homeTeam={selectedMatch.homeTeam}
              awayTeam={selectedMatch.awayTeam}
              kickoff={selectedMatch.kickoff}
              onDeposit={handleDeposit}
            />
          )}
        </div>

        <footer className="app-footer">
          <p>
            Built on <a href="https://www.xlayer.tech/" target="_blank" rel="noopener">X Layer</a> &middot;
            {' '}<a href="https://x.com/XLayerOfficial" target="_blank" rel="noopener">@XLayerOfficial</a> &middot;
            {' '}<a href="https://github.com/latest63/Latest-MomentumPool" target="_blank" rel="noopener">GitHub</a>
            {isOnChainSettled && (
              <> &middot; Pool <a href={`https://www.okx.com/web3/explorer/xlayer/address/${activePoolAddress}`} target="_blank" rel="noopener">{activePoolAddress.slice(0, 10)}...{activePoolAddress.slice(-4)}</a></>
            )}
          </p>
        </footer>
      </div>
    </>
  );
}
