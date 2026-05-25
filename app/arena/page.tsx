'use client';

import { useEffect, useState } from 'react';
import { MomentumBar, EventFeed, PoolCard } from '@/components/MomentumMeter';
import Nav from '@/components/Nav';
import { useAccount, useWriteContract } from 'wagmi';
import { parseEther } from 'viem';
import { useLoading } from '@/components/LoadingOverlay';
import { playSelect } from '@/lib/playSound';
import MatchCarousel from '@/components/MatchCarousel';

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
  { matchId: 'usa-canada', homeTeam: 'IK Start', awayTeam: 'Vålerenga', venue: 'Sør Arena' },
  { matchId: 'brazil-nigeria', homeTeam: 'HamKam', awayTeam: 'Lillestrøm', venue: 'Briskeby Stadion' },
  { matchId: 'argentina-ghana', homeTeam: 'Elfsborg', awayTeam: 'BK Häcken', venue: 'Borås Arena' },
  { matchId: 'mexico-japan', homeTeam: 'Paderborn', awayTeam: 'Wolfsburg', venue: 'Home Deluxe Arena' },
];

const FLAGS: Record<string, string> = {
  'IK Start': '🇳🇴', Vålerenga: '🇳🇴',
  HamKam: '🇳🇴', 'Lillestrøm': '🇳🇴',
  Elfsborg: '🇸🇪', 'BK Häcken': '🇸🇪',
  Paderborn: '🇩🇪', Wolfsburg: '🇩🇪',
};

// Pool address from on-chain deploy (Nigeria vs Brazil)
const POOL_ADDRESS = '0xEC817c04C503A8B641bfdD0CDC105135d13Eb590';

export default function ArenaPage() {
  const [matches, setMatches] = useState<MatchSummary[]>(FALLBACK);
  const [selected, setSelected] = useState(FALLBACK[0]?.matchId ?? '');
  const [momentum, setMomentum] = useState<MomentumData | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const { address, isConnected } = useAccount();
  const { writeContract, isPending } = useWriteContract();
  const { setLoading } = useLoading();

  useEffect(() => { setLoading(isPending); }, [isPending, setLoading]);

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

  const handleDeposit = (matchId: string, teamId: number, amount: string) => {
    if (!isConnected) return alert('Connect your wallet first');
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) return alert('Enter a valid amount');
    writeContract({
      address: POOL_ADDRESS,
      abi: POOL_ABI,
      functionName: 'deposit',
      args: [teamId],
      value: parseEther(amount),
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
          <MatchCarousel
            matches={matches}
            selected={selected}
            flags={FLAGS}
            onSelect={(id) => { playSelect(); setSelected(id); }}
          />
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
