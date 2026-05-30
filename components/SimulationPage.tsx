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
  const [showCup, setShowCup] = useState(false);
  const confettiFired = useRef(false);
  const [whistleType, setWhistleType] = useState<'start' | 'end' | null>(null);

  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const prevPhase = useRef<SimPhase | null>(null);

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

  /* Detect phase transitions */
  useEffect(() => {
    if (!state?.match) return;
    const current = state.match.phase;
    const prev = prevPhase.current;

    if (prev && prev !== current) {
      if (current === 'live') {
        setWhistleType('start');
        setTimeout(() => setWhistleType(null), 2500);
      } else if (current === 'settled') {
        setWhistleType('end');
        setTimeout(() => setWhistleType(null), 2500);
      }
    }
    prevPhase.current = current;
  }, [state?.match?.phase]);

  /* Auto-show cup on settlement */
  useEffect(() => {
    if (!state?.match) return;
    if (state.match.phase === 'settled' && !confettiFired.current) {
      confettiFired.current = true;
      setTimeout(() => setShowCup(true), 800);
    }
    if (state.match.phase === 'open') {
      confettiFired.current = false;
      setShowCup(false);
    }
  }, [state?.match?.phase, state?.match?.round]);

  const handleRealDeposit = useCallback(async (team: TeamSide, poolAddress: string) => {
    if (!isConnected || !address) { alert('Connect your wallet first'); return; }
    try {
      await writeContractAsync({
        address: poolAddress as `0x${string}`,
        abi: POOL_ABI,
        functionName: 'deposit',
        args: [team === 'home' ? 0 : 1],
        value: BigInt('1000000000000000'),
      });
    } catch (err: any) { alert(err?.message || 'Deposit failed'); }
  }, [address, isConnected, writeContractAsync]);

  const handleRealClaim = useCallback(async (poolAddress: string, team: TeamSide) => {
    if (!isConnected || !address) { alert('Connect your wallet first'); return; }
    try {
      await writeContractAsync({
        address: poolAddress as `0x${string}`,
        abi: POOL_ABI,
        functionName: 'withdraw',
      });
      confetti({ particleCount: 120, spread: 100, origin: { x: 0.5, y: 0.5 } });
      setShowCup(false);
    } catch (err: any) { alert(err?.message || 'Claim failed'); }
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

  const match = state.match;
  const totalCycles = Math.floor(state.totalMatches / 5) + 1;

  return (
    <>
      <Nav />
      <div className="main-content">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1>⚡ Simulation</h1>
            <p className="page-subtitle">2min deposit → 2min play → cycles through 5 matchups</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <ConnectWallet />
            <span className="sim-round-badge">Round {totalCycles}</span>
          </div>
        </div>

        {!match ? (
          <div className="empty-state" style={{ marginTop: 40 }}>
            <span className="empty-icon">⏳</span>
            <h3>Preparing next match...</h3>
          </div>
        ) : (
          <>
            <div className="sim-single-container">
              <SimMatchCard
                key={`${match.id}-r${match.round}`}
                match={match}
                isConnected={isConnected}
                onRealDeposit={handleRealDeposit}
                onRealClaim={handleRealClaim}
                whistleType={whistleType}
              />

              {/* Next up banner */}
              {state.nextUp && (
                <div className="sim-next-up">
                  <span className="sim-next-label">NEXT UP</span>
                  <span className="sim-next-teams">
                    {state.nextUp.homeTeam} <span className="sim-vs">vs</span> {state.nextUp.awayTeam}
                  </span>
                </div>
              )}
            </div>

            {/* Match counter */}
            <div className="sim-counter">
              Match {state.totalMatches} of 5 ·&nbsp;
              {state.match && state.match.phase === 'open' && 'Deposit phase'}
              {state.match && state.match.phase === 'live' && 'Live'}
              {state.match && state.match.phase === 'settled' && 'Settled'}
            </div>
          </>
        )}

        <footer className="app-footer">
          <p>Simulation — {state.tick}s elapsed</p>
        </footer>
      </div>

      {/* Cup popup */}
      {showCup && match && (
        <div className="cup-overlay" onClick={() => setShowCup(false)}>
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
                  await handleRealClaim(match.poolAddress!, winner);
                }}
              >
                Claim Real Winnings
              </button>
            ) : (
              <button className="cup-close" onClick={() => { confetti({ particleCount: 100, spread: 80 }); setShowCup(false); }}>
                Awesome!
              </button>
            )}
          </div>
        </div>
      )}
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
          {type === 'start' ? '🔊 KICK OFF!' : '🔊 FULL TIME!'}
        </span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   MATCH CARD
   ══════════════════════════════════════════════════ */
function SimMatchCard({
  match,
  isConnected,
  onRealDeposit,
  onRealClaim,
  whistleType,
}: {
  match: SimMatch;
  isConnected: boolean;
  onRealDeposit: (team: TeamSide, poolAddress: string) => void;
  onRealClaim: (poolAddress: string, team: TeamSide) => void;
  whistleType: 'start' | 'end' | null;
}) {
  const colors = TEAM_COLORS[match.homeTeam] || { home: '#333', away: '#666' };
  const recentEvents = match.events.slice(-8).reverse();
  const phaseTime = match.phaseElapsed;
  const phaseMax = match.phase === 'open' ? 120 : match.phase === 'live' ? 120 : 15;
  const phasePct = Math.min(100, (phaseTime / phaseMax) * 100);

  const homeMomentumPct = match.momentumHome;
  const awayMomentumPct = 100 - match.momentumHome;

  const hasRealPool = !!match.poolAddress;
  const hasDeposit = match.deposits.home > 0 || match.deposits.away > 0;
  const matchWinner: TeamSide | null =
    match.phase === 'settled'
      ? match.score.home > match.score.away ? 'home'
        : match.score.away > match.score.home ? 'away'
        : Math.random() < 0.5 ? 'home' : 'away'
      : null;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleDeposit = (team: TeamSide) => {
    if (hasRealPool && isConnected) onRealDeposit(team, match.poolAddress!);
    else fetch('/api/sim/deposit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ team, amount: 0.001 }) });
  };

  const handleClaim = () => {
    if (!matchWinner) return;
    if (hasRealPool && isConnected) onRealClaim(match.poolAddress!, matchWinner);
    else fetch('/api/sim/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ team: matchWinner }) })
      .then(r => r.json()).then(d => { if (d.won) confetti({ particleCount: 100, spread: 80, origin: { x: 0.5, y: 0.4 } }); });
  };

  return (
    <div className={`sim-card sim-card-single sim-card-${match.phase}`} style={{ position: 'relative' }}>
      {whistleType && <WhistleOverlay type={whistleType} />}
      {hasRealPool && <div className="sim-pool-badge">REAL POOL</div>}

      {/* Header */}
      <div className="sim-card-header">
        <div className="sim-teams">
          <span className="sim-team" style={{ color: colors.home }}>{match.homeTeam}</span>
          <span className="sim-vs">vs</span>
          <span className="sim-team" style={{ color: colors.away }}>{match.awayTeam}</span>
        </div>
        <span className={`sim-phase sim-phase-${match.phase}`}>
          {match.phase === 'open' ? 'DEPOSIT' : match.phase === 'live' ? 'LIVE' : 'SETTLED'}
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

      {/* Momentum bar */}
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

      {/* Events */}
      <div className="sim-events">
        {recentEvents.length === 0 && match.phase === 'live' && <div className="sim-ev-empty">⏳ Match starting...</div>}
        {recentEvents.length === 0 && match.phase === 'open' && <div className="sim-ev-empty">💵 Deposit on your team</div>}
        {recentEvents.length === 0 && match.phase === 'settled' && <div className="sim-ev-empty">🏁 Full time</div>}
        {recentEvents.map((ev, i) => {
          const meta = EVENT_META[ev.type] || { icon: '•', label: ev.type };
          const isHome = ev.team === 'home';
          const min = Math.floor(ev.minute / 2) + 1;
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
            {hasRealPool && !isConnected && <div className="sim-deposit-hint">Connect wallet to deposit real OKB</div>}
            {!hasRealPool && <div className="sim-deposit-hint sim-deposit-hint-mock">Mock mode — no real OKB</div>}
          </>
        )}
        {match.phase === 'settled' && matchWinner && (
          <div className="sim-claim-row">
            <button className="sim-claim-btn" onClick={handleClaim}>
              🏆 Claim {matchWinner === 'home' ? match.homeTeam : match.awayTeam}
            </button>
          </div>
        )}
        {match.phase === 'settled' && !hasDeposit && (
          <div className="sim-claimed-badge">No deposits placed</div>
        )}
      </div>
    </div>
  );
}
