'use client';

import { useEffect, useState, useRef } from 'react';
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
  const [page, setPage] = useState<'landing' | 'app'>('landing');
  const [matches, setMatches] = useState<MatchSummary[]>(FALLBACK);
  const [selected, setSelected] = useState(FALLBACK[0]?.matchId ?? '');
  const [momentum, setMomentum] = useState<MomentumData | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const appRef = useRef<HTMLDivElement>(null);

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
    if (page === 'app') fetchLive();
    return () => clearInterval(interval);
  }, [selected, page]);

  const selectedMatch = matches.find((m) => m.matchId === selected);

  const handleDeposit = async (_matchId: string, _teamId: number) => {
    console.log(`[Deposit] match=${_matchId} team=${_teamId}`);
  };

  const handleEnter = () => {
    setPage('app');
    setTimeout(() => appRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  return (
    <main className="app-shell">
      {/* ─── Stadium Lights (global) ─── */}
      <div className="stadium-lights">
        <div className="stadium-beam" />
        <div className="stadium-beam" />
        <div className="stadium-beam" />
      </div>

      {/* ══════════════════════════════════════════════════
          LANDING PAGE
          ══════════════════════════════════════════════════ */}
      {page === 'landing' && (
        <>
          {/* ─── Full-screen Hero Wrap ─── */}
          <div className="hero-wrap landing-hero">
            <div className="hero-glow" />
            <div className="hero-curves">
              <svg viewBox="0 0 1200 600" preserveAspectRatio="none">
                <path d="M0,280 C300,400 700,120 1200,280 L1200,0 L0,0 Z" fill="rgba(55,88,237,0.08)" />
                <path d="M0,360 C400,200 800,400 1200,240 L1200,0 L0,0 Z" fill="rgba(43,37,111,0.06)" />
                <path d="M0,440 C200,320 600,480 1200,300 L1200,0 L0,0 Z" fill="rgba(2,69,58,0.05)" />
              </svg>
            </div>

            {/* Nav */}
            <div className="landing-nav">
              <div className="top-bar-brand">
                <img className="top-bar-logo" src="/assets/logo.svg" alt="Momentum Pool" />
                <div className="top-bar-title">
                  Momentum<span>Pool</span>
                </div>
              </div>
            </div>

            {/* Hero Content */}
            <div className="landing-center">
              <div className="hero-tag landing-tag">
                <span className="live-dot" /> FIFA WORLD CUP 2026
              </div>
              <h1 className="hero-title landing-title">
                Pick the<br />
                <span className="wc-title-highlight">Momentum</span>
              </h1>
              <p className="landing-sub">
                Deposit on the team that controls the half.<br />
                At half-time, the team with more momentum points wins.
              </p>
              <button className="landing-cta" onClick={handleEnter}>
                Enter the Arena
              </button>
              <p className="landing-hint">Powered by X Layer · 2% pool fee</p>
            </div>
          </div>

          {/* ─── Features Section ─── */}
          <div className="features-wrap">
            <div className="features-section">
              <div className="features-grid">
                <div className="feature-card">
                  <div className="feature-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="#3758ED" strokeWidth="2"/>
                      <path d="M12 6v6l4 2" stroke="#3758ED" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <h3>Pick a Side</h3>
                  <p>Deposit into Team A or Team B before the half starts. Simple.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#17CB49" strokeWidth="2" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h3>Live Momentum</h3>
                  <p>Goals, shots, cards — every event shifts the momentum bar in real time.</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <rect x="2" y="7" width="20" height="14" rx="2" stroke="#E61A0A" strokeWidth="2"/>
                      <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" stroke="#E61A0A" strokeWidth="2"/>
                    </svg>
                  </div>
                  <h3>Win the Pool</h3>
                  <p>Winners split the losers&apos; pool. All settled on-chain at half-time.</p>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Host Cities ─── */}
          <div className="hosts-wrap">
            <div className="hosts-section">
              <h2>Host Nations</h2>
              <div className="hosts-grid">
                <div className="host-card host-usa">
                  <span className="host-flag">🇺🇸</span>
                  <span className="host-name">USA</span>
                  <span className="host-venue">11 Stadiums</span>
                </div>
                <div className="host-card host-canada">
                  <span className="host-flag">🇨🇦</span>
                  <span className="host-name">Canada</span>
                  <span className="host-venue">3 Stadiums</span>
                </div>
                <div className="host-card host-mexico">
                  <span className="host-flag">🇲🇽</span>
                  <span className="host-name">Mexico</span>
                  <span className="host-venue">6 Stadiums</span>
                </div>
              </div>
              <button className="landing-cta landing-cta-secondary" onClick={handleEnter}>
                Launch App
              </button>
            </div>
          </div>

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
        </>
      )}

      {/* ══════════════════════════════════════════════════
          APP PAGE
          ══════════════════════════════════════════════════ */}
      {page === 'app' && (
        <div ref={appRef}>
          {/* ─── Top Bar ─── */}
          <div className="top-bar">
            <div className="top-bar-brand">
              <img className="top-bar-logo" src="/assets/logo.svg" alt="Momentum Pool" />
              <div className="top-bar-title">
                Momentum<span>Pool</span>
              </div>
            </div>
            <button className="app-back-btn" onClick={() => setPage('landing')}>
              ← Back
            </button>
          </div>

          <div className="main-content">
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
        </div>
      )}
    </main>
  );
}
