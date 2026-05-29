'use client';

import { useEffect, useState } from 'react';
import { MomentumBar, EventFeed, PoolCard } from '@/components/MomentumMeter';
import Nav from '@/components/Nav';
import { useAccount, useWriteContract } from 'wagmi';
import { parseEther } from 'viem';
import { useLoading } from '@/components/LoadingOverlay';
import { playSelect } from '@/lib/playSound';
import MatchCarousel from '@/components/MatchCarousel';
import TeamLogo from '@/components/TeamLogo';

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
}

const POOL_ADDRESS = '0xEC817c04C503A8B641bfdD0CDC105135d13Eb590';

export default function ArenaPage() {
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [selected, setSelected] = useState('');
  const [momentum, setMomentum] = useState<MomentumData | null>(null);
  const [momLoaded, setMomLoaded] = useState(false);
  const [events, setEvents] = useState<EventItem[]>([]);
  const { address, isConnected } = useAccount();
  const { writeContract, isPending } = useWriteContract();
  const { setLoading } = useLoading();

  useEffect(() => { setLoading(isPending); }, [isPending, setLoading]);

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
            <h2>World Cup 2026</h2>
            <div className="live-indicator">LIVE</div>
          </div>
          <MatchCarousel
            matches={matches}
            selected={selected}
            onSelect={(id) => { playSelect(); setSelected(id); }}
          />
        </div>

        {selectedMatch && (
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
            <MomentumBar data={momentum} loading={!momLoaded} homeTeam={selectedMatch.homeTeam} awayTeam={selectedMatch.awayTeam} />
            <PoolCard
              matchId={selectedMatch.matchId}
              homeTeam={selectedMatch.homeTeam}
              awayTeam={selectedMatch.awayTeam}
              kickoff={selectedMatch.kickoff}
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
