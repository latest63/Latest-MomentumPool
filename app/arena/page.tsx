'use client';

import { useEffect, useState } from 'react';
import { MomentumBar, EventFeed, PoolCard } from '@/components/MomentumMeter';
import Nav from '@/components/Nav';
import { useAccount, useWriteContract } from 'wagmi';

const FACTORY = '0xB61bd43eDf36FA210079725FD2e9b1d6f143BC83';

const POOL_ABI = [
  {
    name: 'deposit',
    type: 'function',
    inputs: [{ name: 'teamId', type: 'uint8' }],
    stateMutability: 'payable',
    outputs: [],
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
] as const;

interface MomentumData { homeScore: number; awayScore: number; homeTeam: string; awayTeam: string; half: string; diff: number; }
interface EventItem { type: string; team: 'home' | 'away'; minute: number; player?: string; }
interface MatchSummary { matchId: string; homeTeam: string; awayTeam: string; venue?: string; }

const FALLBACK: MatchSummary[] = [
  { matchId: 'usa-canada', homeTeam: 'USA', awayTeam: 'Canada', venue: 'SoFi Stadium' },
  { matchId: 'brazil-nigeria', homeTeam: 'Brazil', awayTeam: 'Nigeria', venue: 'Estadio Azteca' },
  { matchId: 'argentina-ghana', homeTeam: 'Argentina', awayTeam: 'Ghana', venue: 'BC Place' },
  { matchId: 'mexico-japan', homeTeam: 'Mexico', awayTeam: 'Japan', venue: 'NRG Stadium' },
];

const FLAGS: Record<string, string> = {
  USA: '🇺🇸', Canada: '🇨🇦', Mexico: '🇲🇽',
  Brazil: '🇧🇷', Nigeria: '🇳🇬', Ghana: '🇬🇭',
  Argentina: '🇦🇷', Japan: '🇯🇵',
};

// Pool address from on-chain deploy (Nigeria vs Brazil)
const POOL_ADDRESS = '0x86ce525510b61d21de8ad122fc7f4e43a66c5f68';

export default function ArenaPage() {
  const [matches, setMatches] = useState<MatchSummary[]>(FALLBACK);
  const [selected, setSelected] = useState(FALLBACK[0]?.matchId ?? '');
  const [momentum, setMomentum] = useState<MomentumData | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const { address, isConnected } = useAccount();
  const { writeContract, isPending } = useWriteContract();

  useEffect(() => {
    fetch('/api/matches').then(r => r.json()).then(d => { if (d.matches?.length) setMatches(d.matches); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (matches.length && !matches.find(m => m.matchId === selected)) setSelected(matches[0].matchId);
  }, [matches, selected]);

  useEffect(() => {
    if (!selected) return;
    const fetchLive = async () => {
      try {
        const [momRes, evRes] = await Promise.all([
          fetch(`/api/match/${selected}/momentum`),
          fetch(`/api/match/${selected}`),
        ]);
        if (momRes.ok) setMomentum(await momRes.json());
        if (evRes.ok) { const d = await evRes.json(); setEvents(d.recentEvents || []); }
      } catch {}
    };
    fetchLive();
    const interval = setInterval(fetchLive, 15_000);
    return () => clearInterval(interval);
  }, [selected]);

  const selectedMatch = matches.find(m => m.matchId === selected);

  const handleDeposit = (matchId: string, teamId: number) => {
    if (!isConnected) return alert('Connect your wallet first');
    writeContract({
      address: POOL_ADDRESS,
      abi: POOL_ABI,
      functionName: 'deposit',
      args: [teamId],
      value: BigInt('1000000000000000'), // 0.001 OKB
    });
  };

  return (
    <>
      <Nav />
      <div className="main-content">
        <div className="match-selector">
          <div className="match-selector-header">
            <h2>Live Matches</h2>
            <div className="live-indicator">LIVE</div>
          </div>
          <div className="match-tabs">
            {matches.map(m => (
              <button key={m.matchId} className={`match-tab ${selected === m.matchId ? 'active' : ''}`} onClick={() => setSelected(m.matchId)}>
                <div className="tab-team-row"><span>{FLAGS[m.homeTeam] || '🏳️'}</span><span>{m.homeTeam}</span></div>
                <div className="tab-vs-label">vs</div>
                <div className="tab-team-row"><span>{FLAGS[m.awayTeam] || '🏳️'}</span><span>{m.awayTeam}</span></div>
                <small>{m.venue || 'WC 2026'}</small>
              </button>
            ))}
          </div>
        </div>

        {selectedMatch && (
          <div className="match-view">
            <div className="match-header">
              <div className="match-header-team"><span className="flag">{FLAGS[selectedMatch.homeTeam] || '🏳️'}</span><span>{selectedMatch.homeTeam}</span></div>
              <div className="match-header-vs">VS</div>
              <div className="match-header-team"><span className="flag">{FLAGS[selectedMatch.awayTeam] || '🏳️'}</span><span>{selectedMatch.awayTeam}</span></div>
            </div>
            <MomentumBar data={momentum} loading={!momentum} />
            <PoolCard
              matchId={selectedMatch.matchId}
              homeTeam={selectedMatch.homeTeam}
              awayTeam={selectedMatch.awayTeam}
              onDeposit={handleDeposit}
            />
            <EventFeed events={events} homeTeam={selectedMatch.homeTeam} awayTeam={selectedMatch.awayTeam} />
          </div>
        )}

        <footer className="app-footer">
          <p>Built on <a href="https://www.xlayer.tech/" target="_blank" rel="noopener">X Layer</a> &middot; <a href="https://x.com/XLayerOfficial" target="_blank" rel="noopener">@XLayerOfficial</a> &middot; <a href="https://github.com/latest63/Latest-MomentumPool" target="_blank" rel="noopener">GitHub</a></p>
        </footer>
      </div>
    </>
  );
}
