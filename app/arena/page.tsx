'use client';

import { useEffect, useState } from 'react';
import { MomentumBar, EventFeed, type MomentumData, type EventItem } from '@/components/MomentumMeter';
import Nav from '@/components/Nav';
import { useAccount, useReadContract, useSwitchChain } from 'wagmi';
import { formatEther } from 'viem';
import { playSelect } from '@/lib/playSound';
import MatchCarousel from '@/components/MatchCarousel';
import TeamLogo from '@/components/TeamLogo';

const POOL_ABI = [
  { name: 'deposit', type: 'function', inputs: [{ name: 'teamId', type: 'uint8' }, { name: 'amount', type: 'uint256' }], stateMutability: 'nonpayable', outputs: [] },
  { name: 'state', type: 'function', inputs: [], outputs: [{ name: '', type: 'uint8' }], stateMutability: 'view' },
  { name: 'winnerTeamId', type: 'function', inputs: [], outputs: [{ name: '', type: 'uint8' }], stateMutability: 'view' },
  { name: 'team0', type: 'function', inputs: [], outputs: [{ name: 'total', type: 'uint256' }], stateMutability: 'view' },
  { name: 'team1', type: 'function', inputs: [], outputs: [{ name: 'total', type: 'uint256' }], stateMutability: 'view' },
] as const;

const USDG_ADDRESS = '0xa78e2baabaf5c4f36b7fc394725deb68d332eec1';
const POOL_FACTORY = process.env.NEXT_PUBLIC_POOL_FACTORY || '';

/* ─── Flag badge URLs (flagcdn.com) ─── */
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

/* ─── 5 World Cup matchups ─── */
const SIM_MATCHUPS = [
  { id: 'sim-1', homeTeam: 'Nigeria',   awayTeam: 'Brazil',    homeCode: 'NGA', awayCode: 'BRA' },
  { id: 'sim-2', homeTeam: 'Argentina', awayTeam: 'France',   homeCode: 'ARG', awayCode: 'FRA' },
  { id: 'sim-3', homeTeam: 'England',   awayTeam: 'Germany',  homeCode: 'ENG', awayCode: 'GER' },
  { id: 'sim-4', homeTeam: 'Portugal',  awayTeam: 'Spain',    homeCode: 'POR', awayCode: 'ESP' },
  { id: 'sim-5', homeTeam: 'Morocco',   awayTeam: 'Senegal',  homeCode: 'MAR', awayCode: 'SEN' },
];

/* ─── Mock event generator ─── */
const EVENTS_POOL: { type: EventItem['type']; team: EventItem['team']; label: string }[] = [
  { type: 'goal',            team: 'home', label: '' },
  { type: 'goal',            team: 'away', label: '' },
  { type: 'yellow_card',     team: 'home', label: '' },
  { type: 'yellow_card',     team: 'away', label: '' },
  { type: 'corner',          team: 'home', label: '' },
  { type: 'corner',          team: 'away', label: '' },
  { type: 'shot_on_target',  team: 'home', label: '' },
  { type: 'shot_on_target',  team: 'away', label: '' },
  { type: 'foul',            team: 'home', label: '' },
  { type: 'foul',            team: 'away', label: '' },
  { type: 'woodwork',        team: 'home', label: '' },
  { type: 'red_card',        team: 'away', label: '' },
];

function generateMockMomentum(): MomentumData {
  const homeScore = Math.floor(Math.random() * 4);
  const awayScore = Math.floor(Math.random() * 4);
  return {
    homeScore,
    awayScore,
    homeTeam: '',
    awayTeam: '',
    half: Math.random() > 0.5 ? '1st Half' : '2nd Half',
    diff: homeScore - awayScore,
  };
}

function generateMockEvents(): EventItem[] {
  const count = 3 + Math.floor(Math.random() * 6);
  const events: EventItem[] = [];
  for (let i = 0; i < count; i++) {
    const pick = EVENTS_POOL[Math.floor(Math.random() * EVENTS_POOL.length)];
    events.push({
      type: pick.type,
      team: pick.team,
      minute: 5 + Math.floor(Math.random() * 85),
    });
  }
  return events.sort((a, b) => a.minute - b.minute);
}
/* ─── Types ─── */
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

function formatTime(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' });
}

/* ═══════════════════════════════════════ PAGE ═══════════════════════════════════════ */
export default function ArenaPage() {
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [selected, setSelected] = useState('');
  const [momentum, setMomentum] = useState<MomentumData | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const [mounted, setMounted] = useState(false);
  const [depositAmount, setDepositAmount] = useState('0.001');
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  useEffect(() => setMounted(true), []);

  // Load 5 matchups with flags
  useEffect(() => {
    const mapped = SIM_MATCHUPS.map(m => ({
      matchId: m.id,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      homeCode: m.homeCode,
      awayCode: m.awayCode,
      homeBadge: FLAGS[m.homeTeam] || '',
      awayBadge: FLAGS[m.awayTeam] || '',
      homeScore: 0,
      awayScore: 0,
      status: 'scheduled' as const,
      half: '',
      kickoff: Math.floor(Date.now() / 1000) + 3600,
      competition: 'Momentum Pool — World Cup 2026',
      group: 'Group Stage',
      isLive: false,
      poolAddress: '',
      settled: false,
    }));
    setMatches(mapped);
    if (!selected) setSelected(mapped[0].matchId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (matches.length && !matches.find(m => m.matchId === selected)) {
      setSelected(matches[0].matchId);
    }
  }, [matches, selected]);

  // Regenerate mock momentum + events when selected match changes
  useEffect(() => {
    if (!selected) return;
    setMomentum(generateMockMomentum());
    setEvents(generateMockEvents());
  }, [selected]);

  const selectedMatch = matches.find(m => m.matchId === selected);
  const activePoolAddress = (selectedMatch?.poolAddress || POOL_FACTORY) as `0x${string}`;

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
    if (chainId !== 195) {
      alert('Switch to X Layer testnet in your wallet');
      switchChain?.({ chainId: 195 });
      return;
    }
    const parsed = parseFloat(depositAmount);
    if (isNaN(parsed) || parsed <= 0) return alert('Enter a valid amount');
    // Mock deposit — no pool deployed yet
    alert(`Deposited ${depositAmount} USDg on ${selectedMatch?.homeTeam ?? ''} vs ${selectedMatch?.awayTeam ?? ''} (mock)`);
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
              {selectedMatch.group && <small className="match-group-label">{selectedMatch.group}</small>}
              VS
            </div>
            <div className="match-header-team">
              <TeamLogo name={awayTeam} badge={selectedMatch.awayBadge} code={selectedMatch.awayCode} size={40} />
              <span>{awayTeam}</span>
            </div>
          </div>

          {/* Momentum bar */}
          <MomentumBar
            data={momentum}
            loading={false}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            actualHomeScore={selectedMatch.homeScore}
            actualAwayScore={selectedMatch.awayScore}
          />

          {/* How it Works button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            <button className="how-it-works-btn" onClick={() => setShowHowItWorks(true)}>
              ⓘ How it Works
            </button>
          </div>

          {/* Pool section */}
          <div className="pool-section">
            {isMatchSettled ? (
              <>
                {homePool > 0 || awayPool > 0 ? (
                  <div className="pool-settled">
                    <div className="pool-settled-winner">
                      🏆 <strong>{winnerName}</strong> won — Total pool: {totalPool.toFixed(4)} USDg
                    </div>
                  </div>
                ) : (
                  <div className="pool-empty">Pool settled — no deposits</div>
                )}
                {isConnected && (
                  <div className="position-action" style={{ textAlign: 'center', marginTop: 12 }}>
                    <a href="/arena/positions" className="claim-btn" style={{ textDecoration: 'none', display: 'inline-block' }}>
                      Claim in Positions
                    </a>
                  </div>
                )}
              </>
            ) : (
              <div className="pool-deposit">
                <div className="pool-deposit-teams">
                  <div className="pool-deposit-team">
                    <TeamLogo name={homeTeam} badge={selectedMatch.homeBadge} code={selectedMatch.homeCode} size={32} />
                    <span className="pool-deposit-team-name">{homeTeam}</span>
                    <span className="pool-deposit-amount">{homePool.toFixed(4)} USDg</span>
                    <button className="pool-deposit-btn" onClick={() => handleDeposit(0)}>
                      Deposit
                    </button>
                  </div>
                  <div className="pool-deposit-vs">VS</div>
                  <div className="pool-deposit-team">
                    <TeamLogo name={awayTeam} badge={selectedMatch.awayBadge} code={selectedMatch.awayCode} size={32} />
                    <span className="pool-deposit-team-name">{awayTeam}</span>
                    <span className="pool-deposit-amount">{awayPool.toFixed(4)} USDg</span>
                    <button className="pool-deposit-btn" onClick={() => handleDeposit(1)}>
                      Deposit
                    </button>
                  </div>
                </div>
                <div className="pool-deposit-input">
                  <label>Amount (USDg)</label>
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

      {/* How it Works modal */}
      {showHowItWorks && (
        <div className="how-modal-overlay" onClick={() => setShowHowItWorks(false)}>
          <div className="how-modal" onClick={e => e.stopPropagation()}>
            <button className="how-modal-close" onClick={() => setShowHowItWorks(false)}>✕</button>
            <h3>How it Works</h3>
            <ol className="how-steps">
              <li><strong>Pick a Match</strong> — Browse the 5 World Cup matchups in the carousel</li>
              <li><strong>Deposit USDg</strong> — Choose your team and enter your deposit amount</li>
              <li><strong>Watch Momentum</strong> — The bar swings as mock match events play out</li>
              <li><strong>Win the Pool</strong> — The team with more momentum when the match settles splits the pot</li>
            </ol>
            <p className="how-footnote">
              Token: <strong>USDg</strong> on X Layer testnet (chain 195).
              Use the <strong>Get Test Token</strong> button to claim from the faucet.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
