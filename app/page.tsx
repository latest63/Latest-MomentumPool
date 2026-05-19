'use client';

import { useEffect, useState } from 'react';
import { MomentumBar, EventFeed, PoolCard } from '@/components/MomentumMeter';
import { WORLD_CUP_MATCHES } from '@/lib/momentum';

interface MomentumData {
  homeScore: number;
  awayScore: number;
  homeTeam: string;
  awayTeam: string;
  half: string;
  diff: number;
}

interface EventItem {
  type: string;
  team: 'home' | 'away';
  minute: number;
  player?: string;
}

interface MatchSummary {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  venue?: string;
}

const FLAGS: Record<string, string> = {
  USA: '🇺🇸', Canada: '🇨🇦', Mexico: '🇲🇽',
  Brazil: '🇧🇷', Nigeria: '🇳🇬', Ghana: '🇬🇭',
  Argentina: '🇦🇷', Japan: '🇯🇵',
};

export default function Home() {
  const fallbackMatches = WORLD_CUP_MATCHES.map((m) => ({
    matchId: m.matchId,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    venue: m.venue,
  }));

  const [matches, setMatches] = useState<MatchSummary[]>(fallbackMatches);
  const [selected, setSelected] = useState(fallbackMatches[0]?.matchId ?? '');
  const [momentum, setMomentum] = useState<MomentumData | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);

  useEffect(() => {
    fetch('/api/matches')
      .then((r) => r.json())
      .then((data) => { if (data.matches?.length) setMatches(data.matches); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (matches.length > 0 && !matches.find((m) => m.matchId === selected)) {
      setSelected(matches[0].matchId);
    }
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
        if (evRes.ok) {
          const data = await evRes.json();
          setEvents(data.recentEvents || []);
        }
      } catch {}
    };
    fetchLive();
    const interval = setInterval(fetchLive, 15_000);
    return () => clearInterval(interval);
  }, [selected]);

  const selectedMatch = matches.find((m) => m.matchId === selected);

  const handleDeposit = async (_matchId: string, _teamId: number) => {
    console.log(`[Deposit] match=${_matchId} team=${_teamId}`);
  };

  return (
    <main className="app-shell">
      {/* ─── Top Bar ─── */}
      <div className="top-bar">
        <div className="top-bar-brand">
          <img className="top-bar-logo" src="/assets/logo.svg" alt="Momentum Pool" />
          <div className="top-bar-title">
            Momentum<span>Pool</span>
          </div>
        </div>
        <div className="top-bar-hosts">
          <span>🇺🇸 USA</span>
          <span>🇨🇦 Canada</span>
          <span>🇲🇽 Mexico</span>
          <span style={{ opacity: 0.4 }}>· 2026</span>
        </div>
      </div>

      {/* ─── Hero ─── */}
      <div className="hero">
        <div className="hero-badge">⚽ World Cup 2026</div>
        <h1>
          Pick the half.<br />
          <span>Win the pool.</span>
        </h1>
        <p>
          Deposit into Team A or Team B before each half. At half-time,
          the team with more momentum points wins — and you take the pool.
        </p>
      </div>

      {/* ─── Match Selector ─── */}
      <div className="match-tabs">
        {matches.map((m) => (
          <button
            key={m.matchId}
            className={`match-tab ${selected === m.matchId ? 'active' : ''}`}
            onClick={() => setSelected(m.matchId)}
          >
            <div className="tab-teams">
              <span>{FLAGS[m.homeTeam] || '🏳️'} {m.homeTeam}</span>
              <span className="tab-vs">vs</span>
              <span>{FLAGS[m.awayTeam] || '🏳️'} {m.awayTeam}</span>
            </div>
            <small>{m.venue || 'World Cup 2026'}</small>
          </button>
        ))}
      </div>

      {/* ─── Match Detail ─── */}
      {selectedMatch && (
        <div className="match-view">
          <div className="match-header">
            <span>{FLAGS[selectedMatch.homeTeam] || '🏳️'} {selectedMatch.homeTeam}</span>
            <span className="match-header-vs">vs</span>
            <span>{FLAGS[selectedMatch.awayTeam] || '🏳️'} {selectedMatch.awayTeam}</span>
          </div>

          <MomentumBar data={momentum} loading={!momentum} />

          <PoolCard
            matchId={selectedMatch.matchId}
            homeTeam={selectedMatch.homeTeam}
            awayTeam={selectedMatch.awayTeam}
            onDeposit={handleDeposit}
          />

          <EventFeed
            events={events}
            homeTeam={selectedMatch.homeTeam}
            awayTeam={selectedMatch.awayTeam}
          />
        </div>
      )}

      {/* ─── Footer ─── */}
      <footer className="app-footer">
        <p>
          Built on{' '}
          <a href="https://www.xlayer.tech/" target="_blank" rel="noopener">X Layer</a>
          {' · '}
          <a href="https://x.com/XLayerOfficial" target="_blank" rel="noopener">@XLayerOfficial</a>
          {' · '}
          <a href="https://github.com/latest63/Latest-MomentumPool" target="_blank" rel="noopener">GitHub</a>
        </p>
      </footer>
    </main>
  );
}
