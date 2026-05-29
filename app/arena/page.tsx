'use client';

import { useEffect, useState } from 'react';
import { MomentumBar, EventFeed, type MomentumData, type EventItem } from '@/components/MomentumMeter';
import Nav from '@/components/Nav';
import { useAccount, useReadContract, useWriteContract, useSwitchChain } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { useLoading } from '@/components/LoadingOverlay';
import { playSelect } from '@/lib/playSound';
import MatchCarousel from '@/components/MatchCarousel';
import TeamLogo from '@/components/TeamLogo';

const POOL_ABI = [
  { name: 'deposit', type: 'function', inputs: [{ name: 'teamId', type: 'uint8' }], stateMutability: 'payable', outputs: [] },
  { name: 'state', type: 'function', inputs: [], outputs: [{ name: '', type: 'uint8' }], stateMutability: 'view' },
  { name: 'winnerTeamId', type: 'function', inputs: [], outputs: [{ name: '', type: 'uint8' }], stateMutability: 'view' },
  { name: 'team0', type: 'function', inputs: [], outputs: [{ name: 'total', type: 'uint256' }], stateMutability: 'view' },
  { name: 'team1', type: 'function', inputs: [], outputs: [{ name: 'total', type: 'uint256' }], stateMutability: 'view' },
] as const;

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
  const [depositAmount, setDepositAmount] = useState('0.001');

  useEffect(() => setMounted(true), []);
  useEffect(() => { setLoading(isPending); }, [isPending, setLoading]);

  // Fetch matches
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

  useEffect(() => {
    if (matches.length && !matches.find(m => m.matchId === selected)) {
      setSelected(matches[0].matchId);
    }
  }, [matches, selected]);

  // Live poll momentum + events
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

  // On-chain pool state
  const { data: rawState } = useReadContract({ address: activePoolAddress, abi: POOL_ABI, functionName: 'state' });
  const { data: rawWinner } = useReadContract({ address: activePoolAddress, abi: POOL_ABI, functionName: 'winnerTeamId' });
  const { data: rawHomeTotal } = useReadContract({ address: activePoolAddress, abi: POOL_ABI, functionName: 'team0' });
  const { data: rawAwayTotal } = useReadContract({ address: activePoolAddress, abi: POOL_ABI, functionName: 'team1' });

  const chainState = mounted ? Number(rawState ?? 0) : 0;
  const isOnChainSettled = chainState === 2;
  const winner = Number(rawWinner ?? 0);
  const homePool = rawHomeTotal ? Number(formatEther(rawHomeTotal as bigint)) : 0;
  const awayPool = rawAwayTotal ? Number(formatEther(rawAwayTotal as bigint)) : 0;
  const totalPool = homePool + awayPool;

  const isMatchSettled = selectedMatch?.settled || isOnChainSettled;
  const homeTeam = selectedMatch?.homeTeam || '';
  const awayTeam = selectedMatch?.awayTeam || '';
  const winnerName = winner === 0 ? homeTeam : awayTeam;

  const handleDeposit = (teamId: number) => {
    if (!isConnected) return alert('Connect your wallet first');
    if (chainId !== 196) {
      alert('Switch to X Layer in your wallet');
      switchChain?.({ chainId: 196 });
      return;
    }
    const parsed = parseFloat(depositAmount);
    if (isNaN(parsed) || parsed <= 0) return alert('Enter a valid amount');
    writeContract({
      address: activePoolAddress,
      abi: POOL_ABI,
      functionName: 'deposit',
      args: [teamId],
      value: parseEther(depositAmount),
    }, {
      onError(err) { alert(`Failed: ${err.message}`); },
    });
  };

  if (!selectedMatch && matches.length === 0) {
    return (
      <>
        <Nav />
        <div className="main-content" style={{ textAlign: 'center', padding: '80px 20px', color: '#666' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚽</div>
          <p>No matches available yet.</p>
        </div>
      </>
    );
  }
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
          {/* Match header: team names + badges */}
          <div className="match-header">
            <div className="match-header-team">
              <TeamLogo name={homeTeam} badge={selectedMatch.homeBadge} code={selectedMatch.homeCode} size={40} />
              <span>{homeTeam}</span>
            </div>
            <div className="match-header-vs">
              VS
              {selectedMatch.group && <small>{selectedMatch.group}</small>}
            </div>
            <div className="match-header-team">
              <TeamLogo name={awayTeam} badge={selectedMatch.awayBadge} code={selectedMatch.awayCode} size={40} />
              <span>{awayTeam}</span>
            </div>
          </div>

          {/* Momentum bar */}
          <MomentumBar
            data={momentum}
            loading={!momLoaded}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
          />

          {/* Pool section */}
          <div className="pool-section">
            {isMatchSettled ? (
              /* ─── SETTLED: show winner + total pool ─── */
              <>
                {homePool > 0 || awayPool > 0 ? (
                  <div className="pool-settled">
                    <div className="pool-settled-winner">
                      🏆 <strong>{winnerName}</strong> won — Total pool: {totalPool.toFixed(4)} OKB
                    </div>
                  </div>
                ) : (
                  <div className="pool-empty">Pool settled — no deposits</div>
                )}
                {isConnected && (
                  <div style={{ textAlign: 'center', marginTop: 16 }}>
                    <a
                      href={`https://www.okx.com/web3/explorer/xlayer/address/${activePoolAddress}`}
                      target="_blank"
                      rel="noopener"
                      className="explorer-link"
                    >
                      View on OKX Explorer ↗
                    </a>
                  </div>
                )}
              </>
            ) : (
              /* ─── LIVE / UPCOMING: show pool + deposit ─── */
              <div className="pool-deposit">
                <div className="pool-deposit-teams">
                  <div className="pool-deposit-team">
                    <TeamLogo name={homeTeam} badge={selectedMatch.homeBadge} code={selectedMatch.homeCode} size={32} />
                    <span className="pool-deposit-team-name">{homeTeam}</span>
                    <span className="pool-deposit-amount">{homePool.toFixed(4)} OKB</span>
                    <button className="pool-deposit-btn" onClick={() => handleDeposit(0)}>
                      Deposit
                    </button>
                  </div>
                  <div className="pool-deposit-vs">VS</div>
                  <div className="pool-deposit-team">
                    <TeamLogo name={awayTeam} badge={selectedMatch.awayBadge} code={selectedMatch.awayCode} size={32} />
                    <span className="pool-deposit-team-name">{awayTeam}</span>
                    <span className="pool-deposit-amount">{awayPool.toFixed(4)} OKB</span>
                    <button className="pool-deposit-btn" onClick={() => handleDeposit(1)}>
                      Deposit
                    </button>
                  </div>
                </div>
                <div className="pool-deposit-input">
                  <label>Amount (OKB)</label>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={e => setDepositAmount(e.target.value)}
                    min="0.0001"
                    step="0.001"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Event feed */}
          <EventFeed events={events} homeTeam={homeTeam} awayTeam={awayTeam} />
        </div>

        <footer className="app-footer">
          <p>
            Built on <a href="https://www.xlayer.tech/" target="_blank" rel="noopener">X Layer</a> &middot;
            {' '}<a href="https://x.com/XLayerOfficial" target="_blank" rel="noopener">@XLayerOfficial</a> &middot;
            {' '}<a href="https://github.com/latest63/Latest-MomentumPool" target="_blank" rel="noopener">GitHub</a>
            {rawHomeTotal && (
              <> &middot; Pool <a href={`https://www.okx.com/web3/explorer/xlayer/address/${activePoolAddress}`} target="_blank" rel="noopener">{activePoolAddress.slice(0, 10)}...{activePoolAddress.slice(-4)}</a></>
            )}
          </p>
        </footer>
      </div>
    </>
  );
}
