'use client';

import { useEffect, useState } from 'react';
import { MomentumBar, EventFeed, PoolCard } from '@/components/MomentumMeter';

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

export default function Home() {
  const [matches, setMatches] = useState<MatchSummary[]>(FALLBACK);
  const [selected, setSelected] = useState(FALLBACK[0]?.matchId ?? '');
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
      {/* ─── Stadium Lights ─── */}
      <div className="stadium-lights">
        <div className="stadium-beam" />
        <div className="stadium-beam" />
        <div className="stadium-beam" />
      </div>

      {/* ─── Hero Wrap — full-width colored background ─── */}
      <div className="hero-wrap">
        <div className="hero-glow" />

        <div className="hero-curves">
          <svg viewBox="0 0 1200 280" preserveAspectRatio="none">
            <path
              d="M0,140 C300,220 700,60 1200,140 L1200,0 L0,0 Z"
              fill="rgba(55,88,237,0.08)"
            />
            <path
              d="M0,180 C400,100 800,220 1200,120 L1200,0 L0,0 Z"
              fill="rgba(43,37,111,0.06)"
            />
          </svg>
        </div>

        <div className="hero-section">
          <div className="hero-tag">
            <span className="live-dot" /> WORLDCUP 2026
          </div>
          <h1 className="hero-title">
            Pick the<br />Momentum
          </h1>
          <p className="hero-sub">
            Deposit on the team that controls the half. At half-time,
            the team with more momentum points wins. You take the pool.
          </p>
        </div>
      </div>

      <div className="main-content">
        {/* ─── Top Bar ─── */}
        <div className="top-bar">
          <div className="top-bar-brand">
            <img className="top-bar-logo" src="/assets/logo.svg" alt="Momentum Pool" />
            <div className="top-bar-title">
              Momentum<span>Pool</span>
            </div>
          </div>
          <div className="top-bar-hosts">
            <span className="host-pill active">🇺🇸 USA</span>
            <span className="host-pill">🇨🇦 Canada</span>
            <span className="host-pill">🇲🇽 Mexico</span>
          </div>
        </div>

        {/* ─── Match Selector ─── */}
        <div className="match-selector">
          <div className="match-selector-header">
            <h2>Live Matches</h2>
            <div className="live-indicator">LIVE</div>
          </div>

          <div className="match-tabs">
            {matches.map((m) => (
              <button
                key={m.matchId}
                className={`match-tab ${selected === m.matchId ? 'active' : ''}`}
                onClick={() => setSelected(m.matchId)}
              >
                <div className="tab-teams">
                  <div className="tab-team-row">
                    <span>{FLAGS[m.homeTeam] || '🏳️'}</span>
                    <span>{m.homeTeam}</span>
                  </div>
                  <div className="tab-vs-label">vs</div>
                  <div className="tab-team-row">
                    <span>{FLAGS[m.awayTeam] || '🏳️'}</span>
                    <span>{m.awayTeam}</span>
                  </div>
                </div>
                <small>{m.venue || 'World Cup 2026'}</small>
              </button>
            ))}
          </div>
        </div>

        {/* ─── Match Detail ─── */}
        {selectedMatch && (
          <div className="match-view">
            <div className="match-header">
              <div className="match-header-team">
                <span className="flag">{FLAGS[selectedMatch.homeTeam] || '🏳️'}</span>
                <span>{selectedMatch.homeTeam}</span>
              </div>
              <div className="match-header-vs">VS</div>
              <div className="match-header-team">
                <span className="flag">{FLAGS[selectedMatch.awayTeam] || '🏳️'}</span>
                <span>{selectedMatch.awayTeam}</span>
              </div>
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
      </div>
    </main>
  );
}
