'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import Nav from '@/components/Nav';
import ConnectWallet from '@/components/ConnectWallet';
import confetti from 'canvas-confetti';
import type { SimState, SimMatch, SimPhase, TeamSide } from '@/lib/sim-engine';
import { POOL_ABI } from '@/lib/pool-abi';

/* ─── Event display config ─── */
const EVENT_META: Record<string, { icon: string; label: string }> = {
  goal: { icon: '⚽', label: 'GOAL!' },
  yellow_card: { icon: '🟨', label: 'Yellow Card' },
  red_card: { icon: '🟥', label: 'RED CARD' },
  corner: { icon: '🚩', label: 'Corner' },
  shot_on_target: { icon: '🎯', label: 'Shot on Target' },
  foul: { icon: '🔇', label: 'Foul' },
  woodwork: { icon: '💥', label: 'Woodwork' },
};

const TEAM_COLORS: Record<string, { home: string; away: string }> = {
  'Nigeria': { home: '#008751', away: '#FFFFFF' },
  'Brazil': { home: '#FFDF00', away: '#009739' },
  'Argentina': { home: '#75AADB', away: '#FFFFFF' },
  'France': { home: '#002395', away: '#FFFFFF' },
  'England': { home: '#CF142B', away: '#FFFFFF' },
  'Germany': { home: '#000000', away: '#FFFFFF' },
  'Portugal': { home: '#006600', away: '#FF0000' },
  'Spain': { home: '#C60B1E', away: '#FFC400' },
  'Morocco': { home: '#C1272D', away: '#006233' },
  'Senegal': { home: '#00853F', away: '#FDEF42' },
};

/* ══════════════════════════════════════════════════
   SIMULATION PAGE
   ══════════════════════════════════════════════════ */
export default function SimulationPage() {
  const [state, setState] = useState<SimState | null>(null);
  const [claimPopups, setClaimPopups] = useState<Set<string>>(new Set());
  const [claimed, setClaimed] = useState<Set<string>>(new Set());
  const confettiFired = useRef<Set<string>>(new Set());
  const [whistles, setWhistles] = useState<Set<string>>(new Set());

  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  /* Track previous phases for whistle detection */
  const prevPhases = useRef<Map<string, SimPhase>>(new Map());

  /* Start engine on mount */
  useEffect(() => {
    fetch('/api/sim/start', { method: 'POST' }).catch(() => {});
  }, []);

  /* Poll state every second */
  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await fetch('/api/sim/state');
        if (res.ok) setState(await res.json());
      } catch {}
    };
    fetchState();
    const interval = setInterval(fetchState, 1000);
    return () => clearInterval(interval);
  }, []);

  /* Detect phase transitions for whistle animation */
  useEffect(() => {
    if (!state) return;
    for (const match of state.matches) {
      const prev = prevPhases.current.get(match.id);
      if (prev && prev !== match.phase) {
        // Transition detected!
        if (match.phase === 'live') {
          // Whistle for match START
          const key = `${match.id}-start-r${match.round}`;
          setWhistles(prev => new Set(prev).add(key));
          setTimeout(() => setWhistles(s => { const n = new Set(s); n.delete(key); return n; }), 2500);
        } else if (match.phase === 'settled') {
          // Whistle for FULL TIME
          const key = `${match.id}-end-r${match.round}`;
          setWhistles(prev => new Set(prev).add(key));
          setTimeout(() => setWhistles(s => { const n = new Set(s); n.delete(key); return n; }), 2500);
        }
      }
      prevPhases.current.set(match.id, match.phase);
    }
  }, [state]);

  /* Check for newly settled matches to auto-show cup */
  useEffect(() => {
    if (!state) return;
    for (const match of state.matches) {
      const key = `${match.id}-r${match.round}`;
      if (match.phase === 'settled' && !claimPopups.has(key) && !confettiFired.current.has(key)) {
        const hasDeposit = match.deposits.home > 0 || match.deposits.away > 0;
        if (hasDeposit) {
          confettiFired.current.add(key);
          setTimeout(() => setClaimPopups(prev => new Set(prev).add(key)), 800);
        }
      }
    }
  }, [state, claimPopups]);

  const handleRealDeposit = useCallback(async (matchId: string, team: TeamSide, poolAddress: string) => {
    if (!isConnected || !address) {
      alert('Connect your wallet first');
      return;
    }
    try {
      await writeContractAsync({
        address: poolAddress as `0x${string}`,
        abi: POOL_ABI,
        functionName: 'deposit',
        args: [team === 'home' ? 0 : 1],
        value: BigInt('1000000000000000'), // 0.001 OKB
      });
    } catch (err: any) {
      alert(err?.message || 'Deposit failed');
    }
  }, [address, isConnected, writeContractAsync]);

  const handleMockDeposit = useCallback((matchId: string, team: TeamSide) => {
    fetch('/api/sim/deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId, team, amount: 0.001 }),
    });
  }, []);

  const handleRealClaim = useCallback(async (poolAddress: string, matchId: string, team: TeamSide) => {
    if (!isConnected || !address) {
      alert('Connect your wallet first');
      return;
    }
    try {
      await writeContractAsync({
        address: poolAddress as `0x${string}`,
        abi: POOL_ABI,
        functionName: 'withdraw',
      });
      setClaimed(prev => new Set(prev).add(`${matchId}-${team}`));
      confetti({ particleCount: 120, spread: 100, origin: { x: 0.5, y: 0.5 } });
    } catch (err: any) {
      alert(err?.message || 'Claim failed');
    }
  }, [address, isConnected, writeContractAsync]);

  if (!state) {
    return (
      <>
        <Nav />
        <div className="main-content" style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-tertiary)' }}>
          <div style={{ fontSize: 48, marginBottom: 12, animation: 'loading-pulse 1s ease-in-out infinite' }}>⚽</div>
          <p>Starting simulation...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Nav />
      <div className="main-content">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1>⚡ Simulation Mode</h1>
            <p className="page-subtitle">5 matches running live — 2min deposit → 2min play → repeat</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <ConnectWallet />
            <div className="sim-round-badge">
              Round {Math.max(...state.matches.map(m => m.round))}
            </div>
          </div>
        </div>

        <div className="sim-grid">
          {state.matches.map((match) => (
            <SimMatchCard
              key={`${match.id}-r${match.round}`}
              match={match}
              isConnected={isConnected}
              onRealDeposit={handleRealDeposit}
              onMockDeposit={handleMockDeposit}
              onRealClaim={handleRealClaim}
              claimed={claimed}
              whistles={whistles}
            />
          ))}
        </div>

        {state.matches.filter(m => m.phase === 'settled').length === 5 && (
          <div className="sim-cycle-notice">
            🔄 All matches settled — next round starting soon...
          </div>
        )}

        <footer className="app-footer">
          <p>Simulation — {state.tick}s elapsed · {state.matches.filter(m => m.phase === 'live').length} live matches</p>
        </footer>
      </div>

      {/* Cup popups for settled matches */}
      {state.matches.map((match) => {
        const key = `${match.id}-r${match.round}`;
        if (!claimPopups.has(key)) return null;
        return (
          <div key={key} className="cup-overlay" onClick={() => setClaimPopups(prev => { const n = new Set(prev); n.delete(key); return n; })}>
            <div className="cup-popup" onClick={e => e.stopPropagation()}>
              <img src="/assets/worldcup.png" alt="Champion" className="cup-image" />
              <div className="cup-text">
                🏆 {match.score.home > match.score.away ? match.homeTeam : match.awayTeam} Won! 🏆
              </div>
              <p style={{ color: 'var(--text-secondary)', margin: '8px 0' }}>
                {match.homeTeam} {match.score.home} – {match.score.away} {match.awayTeam}
              </p>
              {match.poolAddress && isConnected ? (
                <button
                  className="cup-close"
                  onClick={async () => {
                    const winner: TeamSide = match.score.home > match.score.away ? 'home' : match.score.away > match.score.home ? 'away' : 'home';
                    await handleRealClaim(match.poolAddress!, match.id, winner);
                    setClaimPopups(prev => { const n = new Set(prev); n.delete(key); return n; });
                  }}
                >
                  Claim Real Winnings
                </button>
              ) : (
                <button className="cup-close" onClick={() => setClaimPopups(prev => { const n = new Set(prev); n.delete(key); return n; })}>
                  Awesome!
                </button>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}

/* ══════════════════════════════════════════════════
   WHISTLE OVERLAY
   ══════════════════════════════════════════════════ */
function WhistleOverlay({ type }: { type: 'start' | 'end' }) {
  return (
    <div className="sim-whistle-overlay">
      <div className="sim-whistle-inner">
        <span className="sim-whistle-icon">📣</span>
        <span className="sim-whistle-text">
          {type === 'start' ? (
            <>🔊 KICK OFF!</>
          ) : (
            <>🔊 FULL TIME!</>
          )}
        </span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   SINGLE MATCH CARD
   ══════════════════════════════════════════════════ */
function SimMatchCard({
  match,
  isConnected,
  onRealDeposit,
  onMockDeposit,
  onRealClaim,
  claimed,
  whistles,
}: {
  match: SimMatch;
  isConnected: boolean;
  onRealDeposit: (id: string, team: TeamSide, poolAddress: string) => void;
  onMockDeposit: (id: string, team: TeamSide) => void;
  onRealClaim: (poolAddress: string, matchId: string, team: TeamSide) => void;
  claimed: Set<string>;
  whistles: Set<string>;
}) {
  const colors = TEAM_COLORS[match.homeTeam] || { home: '#333', away: '#666' };
  const recentEvents = match.events.slice(-8).reverse();
  const phaseTime = match.phaseElapsed;
  const phaseMax = match.phase === 'open' ? 120 : match.phase === 'live' ? 120 : 15;
  const phasePct = Math.min(100, (phaseTime / phaseMax) * 100);

  const homeMomentumPct = match.momentumHome;
  const awayMomentumPct = 100 - match.momentumHome;

  const hasDeposit = match.deposits.home > 0 || match.deposits.away > 0;
  const matchWinner: TeamSide | null =
    match.phase === 'settled'
      ? match.score.home > match.score.away ? 'home'
        : match.score.away > match.score.home ? 'away'
        : Math.random() < 0.5 ? 'home' : 'away'
      : null;

  const hasRealPool = !!match.poolAddress;
  const startKey = `${match.id}-start-r${match.round}`;
  const endKey = `${match.id}-end-r${match.round}`;
  const showWhistleStart = whistles.has(startKey);
  const showWhistleEnd = whistles.has(endKey);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleDeposit = (team: TeamSide) => {
    if (hasRealPool && isConnected) {
      onRealDeposit(match.id, team, match.poolAddress!);
    } else {
      onMockDeposit(match.id, team);
    }
  };

  const handleClaim = () => {
    if (!matchWinner) return;
    if (hasRealPool && isConnected) {
      onRealClaim(match.poolAddress!, match.id, matchWinner);
    } else {
      // Mock claim
      fetch('/api/sim/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: match.id, team: matchWinner }),
      }).then(r => r.json()).then(data => {
        if (data.won) confetti({ particleCount: 100, spread: 80, origin: { x: 0.5, y: 0.4 } });
      });
    }
  };

  return (
    <div className={`sim-card sim-card-${match.phase}`} style={{ position: 'relative' }}>
      {/* Whistle animations */}
      {showWhistleStart && <WhistleOverlay type="start" />}
      {showWhistleEnd && <WhistleOverlay type="end" />}

      {/* Pool badge */}
      {hasRealPool && (
        <div className="sim-pool-badge">REAL POOL</div>
      )}

      {/* Header */}
      <div className="sim-card-header">
        <div className="sim-teams">
          <span className="sim-team" style={{ color: colors.home }}>{match.homeTeam}</span>
          <span className="sim-vs">vs</span>
          <span className="sim-team" style={{ color: colors.away }}>{match.awayTeam}</span>
        </div>
        <span className={`sim-phase sim-phase-${match.phase}`}>
          {match.phase === 'open' ? 'DEPOSIT'
            : match.phase === 'live' ? 'LIVE'
            : 'SETTLED'}
        </span>
      </div>

      {/* Timer bar */}
      <div className="sim-timer-track">
        <div className={`sim-timer-fill sim-timer-${match.phase}`} style={{ width: `${phasePct}%` }} />
        <span className="sim-timer-label">{formatTime(phaseTime)}</span>
      </div>

      {/* Scoreboard */}
      <div className="sim-scoreboard">
        <div className={`sim-score-team ${match.phase === 'settled' && match.score.home > match.score.away ? 'sim-score-winner' : ''}`}>
          <span className="sim-score-name">{match.homeTeam}</span>
          <span className="sim-score-num">{match.score.home}</span>
        </div>
        <div className="sim-score-divider">:</div>
        <div className={`sim-score-team ${match.phase === 'settled' && match.score.away > match.score.home ? 'sim-score-winner' : ''}`}>
          <span className="sim-score-name">{match.awayTeam}</span>
          <span className="sim-score-num">{match.score.away}</span>
        </div>
      </div>

      {/* Momentum bar (only during live) */}
      {match.phase === 'live' && (
        <div className="sim-momentum">
          <div className="sim-mom-bar">
            <div className="sim-mom-fill sim-mom-home" style={{ width: `${homeMomentumPct}%` }} />
            <div className="sim-mom-divider" />
            <div className="sim-mom-fill sim-mom-away" style={{ width: `${awayMomentumPct}%` }} />
          </div>
          <div className="sim-mom-labels">
            <span>{homeMomentumPct.toFixed(0)}%</span>
            <span>{awayMomentumPct.toFixed(0)}%</span>
          </div>
        </div>
      )}

      {/* Events feed */}
      <div className="sim-events">
        {recentEvents.length === 0 && match.phase === 'live' && (
          <div className="sim-ev-empty">⏳ Match starting...</div>
        )}
        {recentEvents.length === 0 && match.phase === 'open' && (
          <div className="sim-ev-empty">💵 Deposit on your team</div>
        )}
        {recentEvents.length === 0 && match.phase === 'settled' && (
          <div className="sim-ev-empty">🏁 Full time</div>
        )}
        {recentEvents.map((ev, i) => {
          const meta = EVENT_META[ev.type] || { icon: '•', label: ev.type };
          const isHome = ev.team === 'home';
          const min = Math.floor((ev as any).minute / 2) + 1;
          return (
            <div key={`${ev.minute}-${i}`} className={`sim-ev ${isHome ? 'sim-ev-home' : 'sim-ev-away'}`}>
              <span className="sim-ev-min">{min}&apos;</span>
              <span className="sim-ev-icon">{meta.icon}</span>
              <span className="sim-ev-type">{meta.label}</span>
              {ev.player && <span className="sim-ev-player">{ev.player}</span>}
            </div>
          );
        })}
      </div>

      {/* Action area */}
      <div className="sim-actions">
        {match.phase === 'open' && (
          <>
            <div className="sim-deposit-row">
              <button className="sim-deposit-btn" style={{ background: colors.home }} onClick={() => handleDeposit('home')}>
                {match.homeTeam}
              </button>
              <button className="sim-deposit-btn" style={{ background: colors.away }} onClick={() => handleDeposit('away')}>
                {match.awayTeam}
              </button>
            </div>
            {hasRealPool && !isConnected && (
              <div className="sim-deposit-hint">Connect wallet to deposit real OKB</div>
            )}
            {!hasRealPool && (
              <div className="sim-deposit-hint sim-deposit-hint-mock">Mock mode — no real OKB</div>
            )}
          </>
        )}
        {match.phase === 'settled' && matchWinner && !claimed.has(`${match.id}-${matchWinner}`) && (
          <div className="sim-claim-row">
            <button className="sim-claim-btn" onClick={handleClaim}>
              🏆 Claim {matchWinner === 'home' ? match.homeTeam : match.awayTeam}
            </button>
          </div>
        )}
        {match.phase === 'settled' && claimed.has(`${match.id}-${matchWinner}`) && (
          <div className="sim-claimed-badge">✅ Claimed</div>
        )}
        {match.phase === 'settled' && !hasDeposit && (
          <div className="sim-claimed-badge">No deposits placed</div>
        )}
      </div>
    </div>
  );
}
