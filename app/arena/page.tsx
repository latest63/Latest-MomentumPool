'use client';

import { useEffect, useState, useCallback } from 'react';
import { MomentumBar, EventFeed, type MomentumData, type EventItem } from '@/components/MomentumMeter';
import Nav from '@/components/Nav';
import { useAccount, useSwitchChain, useWalletClient } from 'wagmi';
import { playSelect } from '@/lib/playSound';
import MatchCarousel from '@/components/MatchCarousel';
import TeamLogo from '@/components/TeamLogo';
import { POOL_ABI } from '@/lib/pool-abi';
import { ToastProvider, useToast } from '@/components/Toast';

/* ─── Types ─── */
interface SimEvent {
  minute: number;
  type: string;
  team: 'home' | 'away';
  player?: string;
}

interface SimMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  phase: 'open' | 'live' | 'settled';
  phaseElapsed: number;
  score: { home: number; away: number };
  events: SimEvent[];
  momentumHome: number;
  deposits: { home: number; away: number };
  poolAddress: string | null;
}

interface SimState {
  match: SimMatch | null;
  nextUp: { id: string; homeTeam: string; awayTeam: string } | null;
  matchIndex: number;
  totalMatches: number;
  tick: number;
  running: boolean;
}

interface MatchSummary {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeCode: string;
  awayCode: string;
  homeBadge: string;
  awayBadge: string;
  competition: string;
  group: string;
  isLive: boolean;
  poolAddress: string;
  settled: boolean;
  isCurrentMatch: boolean;
}

/* ─── Flag badge URLs ─── */
const FLAGS: Record<string, string> = {
  Nigeria:   'https://flagcdn.com/w80/ng.png',
  Brazil:    'https://flagcdn.com/w80/br.png',
  Argentina: 'https://flagcdn.com/w80/ar.png',
  France:    'https://flagcdn.com/w80/fr.png',
  England:   'https://flagcdn.com/w80/gb-eng.png',
  Germany:   'https://flagcdn.com/w80/de.png',
  Portugal:  'https://flagcdn.com/w80/pt.png',
  Spain:     'https://flagcdn.com/w80/es.png',
  Morocco:   'https://flagcdn.com/w80/ma.png',
  Senegal:   'https://flagcdn.com/w80/sn.png',
};

/* ─── Token config ─── */
const USDG_TOKEN = '0xa78e2baabaf5c4f36b7fc394725deb68d332eec1';
const USDG_DECIMALS = 6;

/** Minimal ERC20 approve ABI */
const ERC20_APPROVE = [
  {
    name: 'approve',
    type: 'function',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
] as const;

/* ─── All 5 matchups static data ─── */
const MATCH_BY_ID: Record<string, { homeTeam: string; awayTeam: string }> = {
  'sim-1': { homeTeam: 'Nigeria', awayTeam: 'Brazil' },
  'sim-2': { homeTeam: 'Argentina', awayTeam: 'France' },
  'sim-3': { homeTeam: 'England', awayTeam: 'Germany' },
  'sim-4': { homeTeam: 'Portugal', awayTeam: 'Spain' },
  'sim-5': { homeTeam: 'Morocco', awayTeam: 'Senegal' },
};

/* ─── 5 World Cup matchups ─── */
const MATCHUP_IDS = ['sim-1', 'sim-2', 'sim-3', 'sim-4', 'sim-5'];

/* ─── Phase helpers ─── */
const PHASE_DURATION = { open: 120, live: 120, settled: 15 };

const PHASE_LABEL: Record<string, string> = {
  open: 'DEPOSIT',
  live: 'LIVE',
  settled: 'SETTLED',
};

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function simToMomentum(match: SimMatch): MomentumData {
  return {
    homeScore: match.score.home,
    awayScore: match.score.away,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    half: match.phase === 'live' ? '2ND' : match.phase === 'open' ? '1ST' : 'FT',
    diff: match.score.home - match.score.away,
  };
}

function simToEventItems(events: SimEvent[]): EventItem[] {
  return events.slice(-20).map(e => ({
    type: e.type,
    team: e.team,
    minute: e.minute,
    player: e.player,
  }));
}

/* ═══════════════════════════════════════ PAGE ═══════════════════════════════════════ */
export default function ArenaPage() {
  const { toast } = useToast();
  const [state, setState] = useState<SimState | null>(null);
  const [matches, setMatches] = useState<MatchSummary[]>(
    () => MATCHUP_IDS.map(id => {
      const entry = MATCH_BY_ID[id] || { homeTeam: '', awayTeam: '' };
      return {
        matchId: id,
        homeTeam: entry.homeTeam,
        awayTeam: entry.awayTeam,
        homeCode: entry.homeTeam.slice(0, 3).toUpperCase(),
        awayCode: entry.awayTeam.slice(0, 3).toUpperCase(),
        homeBadge: FLAGS[entry.homeTeam] || '',
        awayBadge: FLAGS[entry.awayTeam] || '',
        competition: 'Momentum Pool — World Cup 2026',
        group: 'Group Stage',
        isLive: false,
        poolAddress: '',
        settled: false,
        isCurrentMatch: false,
      };
    })
  );
  const [selected, setSelected] = useState('sim-1');
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [depositAmount, setDepositAmount] = useState('0.001');
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const { data: walletClient } = useWalletClient();

  // Sync live/settled/upcoming state from engine
  useEffect(() => {
    if (!state?.match) {
      // Clear live/settled flags when no active match
      setMatches(prev => prev.map(m => ({ ...m, isLive: false, settled: false, poolAddress: '', isCurrentMatch: false })));
      return;
    }
    setMatches(prev => {
      const next = prev.map(m => ({
        ...m,
        isLive: m.matchId === state.match!.id && state.match!.phase === 'live',
        settled: m.matchId === state.match!.id && state.match!.phase === 'settled',
        isCurrentMatch: m.matchId === state.match!.id,
        poolAddress: m.matchId === state.match!.id ? (state.match!.poolAddress ?? '') : '',
      }));
      return next;
    });
  }, [state?.match?.id, state?.match?.phase]);

  // Auto-select the current match when the engine cycles to a new one
  useEffect(() => {
    if (state?.match?.id) setSelected(state.match.id);
  }, [state?.match?.id]);

  // Start engine on mount + poll state
  useEffect(() => {
    fetch('/api/sim/start', { method: 'POST' }).catch(() => {});
    const poll = async () => {
      try {
        const res = await fetch('/api/sim/state');
        if (res.ok) setState(await res.json());
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 1000);
    return () => clearInterval(interval);
  }, []);

  const match = state?.match ?? null;
  const isFirstLoad = !state;

  /* ─── Deposit handler ─── */
  const handleDeposit = async (team: 'home' | 'away') => {
    if (!isConnected) return toast('Connect your wallet first', 'warning');
    if (chainId !== 1952) {
      toast('Switch to X Layer testnet in your wallet', 'warning');
      switchChain?.({ chainId: 1952 });
      return;
    }
    const parsed = parseFloat(depositAmount);
    if (isNaN(parsed) || parsed <= 0) return toast('Enter a valid amount', 'warning');

    // Lazy deploy — deploy pool on first deposit if not already deployed
    let poolAddr = match?.poolAddress ?? null;
    if (!poolAddr) {
      toast('Deploying pool contract — one sec...', 'info');
      try {
        const res = await fetch('/api/sim/deploy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchId: match!.id,
            homeTeam: match!.homeTeam,
            awayTeam: match!.awayTeam,
            tokenAddress: USDG_TOKEN,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Deploy failed');
        poolAddr = data.poolAddress;
      } catch (err: any) {
        return toast(err?.message || 'Failed to deploy pool', 'error');
      }
    }

    const amount = BigInt(Math.floor(parsed * 10 ** USDG_DECIMALS));
    const teamId = team === 'home' ? 0 : 1;

    if (!walletClient) return toast('Wallet not ready — reconnect and try again', 'error');

    try {
      // Debug: log what we're about to do
      console.log('[deposit] poolAddr:', poolAddr, 'amount:', amount.toString(), 'team:', team);
      console.log('[deposit] chainId:', chainId, 'address:', address);
      console.log('[deposit] USDG token:', USDG_TOKEN);

      // Pre-flight RPC check (via proxy)
      try {
        const resp = await fetch('/api/rpc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
          signal: AbortSignal.timeout(10000),
        });
        const data = await resp.json();
        console.log('[deposit] RPC health:', data.result ? 'OK' : 'FAIL', data);
      } catch (rpcErr) {
        console.error('[deposit] RPC UNREACHABLE from browser:', rpcErr);
        toast('⚠ RPC unreachable from your browser — try a different network or VPN', 'error');
        return;
      }

      // Step 0: Add USDG token to MetaMask so it's not "Unknown"
      toast('Adding USDG token to wallet...', 'info');
      try {
        await window.ethereum?.request({
          method: 'wallet_watchAsset',
          params: [{
            type: 'ERC20',
            options: {
              address: USDG_TOKEN,
              symbol: 'USDG',
              decimals: USDG_DECIMALS,
              image: '',
            },
          }],
        });
      } catch (_) {
        // Non-fatal if wallet doesn't support watchAsset
        console.log('[deposit] watchAsset skipped or failed');
      }

      // Step 1: Approve USDG
      toast('Step 1/2: Approving USDG...', 'info');
      console.log('[deposit] sending approve tx...');
      const approveHash = await walletClient!.writeContract({
        address: USDG_TOKEN as `0x${string}`,
        abi: ERC20_APPROVE,
        functionName: 'approve',
        args: [poolAddr as `0x${string}`, amount],
        account: address as `0x${string}`,
      });
      console.log('[deposit] approve tx sent:', approveHash);

      // Step 2: Deposit
      toast('Step 2/2: Depositing...', 'info');
      console.log('[deposit] sending deposit tx...');
      const depositHash = await walletClient!.writeContract({
        address: poolAddr as `0x${string}`,
        abi: POOL_ABI,
        functionName: 'deposit',
        args: [teamId, amount],
        account: address as `0x${string}`,
      });
      console.log('[deposit] deposit tx sent:', depositHash);

      toast(`✅ Deposited ${depositAmount} USDG on ${match!.homeTeam} vs ${match!.awayTeam}`, 'success');
    } catch (err: any) {
      console.error('[deposit] FULL ERROR:', err);
      const msg = err?.message || err?.code || String(err);
      toast(`❌ ${msg}`, 'error');
    }
  };

  /* ─── Loading state ─── */
  if (isFirstLoad) {
    return (
      <ToastProvider>
        <Nav />
        <div className="main-content" style={{ textAlign: 'center', padding: '80px 20px', color: '#666' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚽</div>
          <p>Starting matches...</p>
        </div>
      </ToastProvider>
    );
  }

  if (!match) {
    return (
      <ToastProvider>
        <Nav />
        <div className="main-content" style={{ textAlign: 'center', padding: '80px 20px', color: '#666' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <p>Preparing next match...</p>
        </div>
      </ToastProvider>
    );
  }

  const homeTeam = match.homeTeam;
  const awayTeam = match.awayTeam;
  const homeFlag = FLAGS[homeTeam] || '';
  const awayFlag = FLAGS[awayTeam] || '';
  const momentumData = simToMomentum(match);
  const eventItems = simToEventItems(match.events);
  const totalPool = match.deposits.home + match.deposits.away;
  const phaseMax = PHASE_DURATION[match.phase] || 120;
  const phasePct = Math.min(100, (match.phaseElapsed / phaseMax) * 100);

  return (
    <ToastProvider>
      <Nav />
      <div className="main-content">
        <div className="match-selector">
          <div className="match-selector-header">
            <h2>{match.phase === 'open' ? 'Deposit Phase' : match.phase === 'live' ? 'Live Now' : 'Settled'}</h2>
            <div className="live-indicator" style={{ color: match.phase === 'live' ? '#ff4444' : match.phase === 'open' ? '#ffcc00' : 'var(--bright-green)' }}>
              {PHASE_LABEL[match.phase]}
            </div>
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
              <TeamLogo name={homeTeam} badge={homeFlag} code={homeTeam.slice(0, 3).toUpperCase()} size={40} />
              <span>{homeTeam}</span>
            </div>
            <div className="match-header-vs">
              <small className="match-group-label">Group Stage</small>
              VS
            </div>
            <div className="match-header-team">
              <TeamLogo name={awayTeam} badge={awayFlag} code={awayTeam.slice(0, 3).toUpperCase()} size={40} />
              <span>{awayTeam}</span>
            </div>
          </div>

          {/* Momentum bar */}
          <MomentumBar
            data={momentumData}
            loading={false}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            actualHomeScore={match.score.home}
            actualAwayScore={match.score.away}
          />

          {/* Phase timer bar */}
          <div className="phase-timer">
            <div className="phase-timer-info">
              <span className="phase-timer-label">{PHASE_LABEL[match.phase]}</span>
              <span className="phase-timer-time">{formatTime(match.phaseElapsed)}</span>
            </div>
            <div className="phase-timer-track">
              <div className={`phase-timer-fill phase-fill-${match.phase}`} style={{ width: `${phasePct}%` }} />
            </div>
          </div>

          {/* How it Works button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            <button className="how-it-works-btn" onClick={() => setShowHowItWorks(true)}>
              ⓘ How it Works
            </button>
          </div>

          {/* Pool section */}
          <div className="pool-section">
            <div className="pool-info-header">
              <img src="/assets/usdg-logo.png" alt="USDG" className="pool-info-logo" />
              Pool Info
            </div>
            <div className="pool-deposit">
              <div className="pool-total-row">
                <span className="pool-total-label">Total Pool</span>
                <span className="pool-total-amount">{totalPool.toFixed(4)} USDG</span>
              </div>
              <div className="pool-deposit-teams">
                <div className="pool-deposit-team">
                  <span className="pool-deposit-team-name">{homeTeam}</span>
                  <span className="pool-deposit-amount">{match.deposits.home.toFixed(4)} USDG</span>
                  <button
                    className="pool-deposit-btn"
                    onClick={() => handleDeposit('home')}
                    disabled={match.phase !== 'open'}
                  >
                    {match.phase === 'open' ? 'Deposit' : match.phase === 'settled' ? 'Closed' : 'Live'}
                  </button>
                </div>
                <div className="pool-deposit-divider" />
                <div className="pool-deposit-team">
                  <span className="pool-deposit-team-name">{awayTeam}</span>
                  <span className="pool-deposit-amount">{match.deposits.away.toFixed(4)} USDG</span>
                  <button
                    className="pool-deposit-btn"
                    onClick={() => handleDeposit('away')}
                    disabled={match.phase !== 'open'}
                  >
                    {match.phase === 'open' ? 'Deposit' : match.phase === 'settled' ? 'Closed' : 'Live'}
                  </button>
                </div>
              </div>
              {match.phase === 'open' && (
                <div className="pool-deposit-input">
                  <label>Amount (USDG)</label>
                  <div className="pool-deposit-input-row">
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={e => setDepositAmount(e.target.value)}
                      min="0.0001"
                      step="0.001"
                    />
                    <a
                      href="https://www.okx.com/xlayer/faucet"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="faucet-btn"
                    >
                      Get Test Token
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Event feed */}
          <EventFeed events={eventItems} homeTeam={homeTeam} awayTeam={awayTeam} />
        </div>

        <footer className="app-footer">
          <p>
            Built on <a href="https://www.xlayer.tech/" target="_blank" rel="noopener">X Layer</a> &middot;
            {' '}<a href="https://x.com/XLayerOfficial" target="_blank" rel="noopener">@XLayerOfficial</a> &middot;
            {' '}<a href="https://github.com/latest63/Latest-MomentumPool" target="_blank" rel="noopener">GitHub</a>
          </p>
        </footer>
      </div>

      {/* How it Works modal */}
      {showHowItWorks && (
        <div className="how-modal-overlay" onClick={() => setShowHowItWorks(false)}>
          <div className="how-modal" onClick={e => e.stopPropagation()}>
            <button className="how-modal-close" onClick={() => setShowHowItWorks(false)}>✕</button>
            <h3>How it Works</h3>
            <ol className="how-steps">
              <li><strong>Pick a Match</strong> — 5 World Cup matchups cycle one at a time</li>
              <li><strong>Deposit Phase (2 min)</strong> — Enter your amount and pick a side. Timer counts down.</li>
              <li><strong>Live Phase (2 min)</strong> — Watch random events (goals, cards, corners) swing the momentum bar in real time</li>
              <li><strong>Settlement</strong> — The team with more momentum wins. Winners split the pot. Next match starts immediately.</li>
            </ol>
            <p className="how-footnote">
              Use the <strong>Get Test Token</strong> button to claim USDG from the faucet.
            </p>
          </div>
        </div>
      )}
    </ToastProvider>
  );
}
