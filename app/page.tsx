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
    const interval = setInterval(fetchLive, 15_000);
    if (page === 'app') fetchLive();
    return () => clearInterval(interval);
  }, [selected, page]);

  const selectedMatch = matches.find((m) => m.matchId === selected);
  const handleDeposit = async (id: string, t: number) => console.log(`[Deposit] match=${id} team=${t}`);
  const handleEnter = () => {
    setPage('app');
    setTimeout(() => appRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  return (
    <main className="app-shell">
      <div className="stadium-bg">
        <div className="stadium-beam" /><div className="stadium-beam" /><div className="stadium-beam" />
      </div>

      {/* ════════════════════ LANDING ════════════════════ */}
      {page === 'landing' && (
        <>
          {/* ─── HERO — Indigo → Navy → Teal gradient ─── */}
          <header className="landing-hero">
            <div className="hero-curves">
              <svg viewBox="0 0 1200 800" preserveAspectRatio="none">
                <path d="M0,300 C200,420 600,160 1200,300 L1200,0 L0,0 Z" fill="rgba(54,89,252,0.1)" />
                <path d="M0,420 C300,280 800,480 1200,260 L1200,0 L0,0 Z" fill="rgba(181,224,82,0.05)" />
                <path d="M0,500 C400,380 700,540 1200,340 L1200,0 L0,0 Z" fill="rgba(230,26,10,0.04)" />
              </svg>
            </div>

            <nav className="landing-nav">
              <div className="top-bar-brand">
                <img className="top-bar-logo" src="/assets/logo.svg" alt="" />
                <div className="top-bar-title">
                  Momentum<span>Pool</span>
                </div>
              </div>
            </nav>

            <div className="landing-center">
              <div className="landing-tag">
                <span className="live-dot" /> WORLD CUP 2026
              </div>
              <h1 className="landing-title">
                Pick the<br />
                <span className="highlight">Momentum</span>
              </h1>
              <p className="landing-sub">
                Deposit on the team that controls the half.<br />
                At half-time, the team with more momentum points wins the pool.
              </p>
              <button className="landing-cta" onClick={handleEnter}>
                Enter the Arena
              </button>
              <p className="landing-hint">Powered by X Layer · Winners split the pool</p>
            </div>
          </header>

          {/* ─── HOW IT WORKS — Indigo → Navy section ─── */}
          <section className="section-indigo">
            <div className="section-header">
              <h2>How It Works</h2>
              <p>Three simple steps to own the half</p>
            </div>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#708FD1" strokeWidth="2"/>
                    <path d="M12 6v6l4 2" stroke="#708FD1" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <h3>Pick a Side</h3>
                <p>Deposit into Team A or Team B before the half starts. You&apos;re betting on which team controls the momentum.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#40C08F" strokeWidth="2" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3>Live Scoreboard</h3>
                <p>Goals, shots, cards, corners — every event updates the momentum bar in real time before half-time.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="7" width="20" height="14" rx="2" stroke="#E61A0A" strokeWidth="2"/>
                    <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" stroke="#E61A0A" strokeWidth="2"/>
                  </svg>
                </div>
                <h3>Win the Pool</h3>
                <p>Winners split the losers&apos; pool. All settled on-chain instantly at half-time. The momentum never stops.</p>
              </div>
            </div>
          </section>

          {/* ─── MATCHES PREVIEW — Black section ─── */}
          <section className="section-black">
            <div className="matches-preview">
              <div className="section-header">
                <h2>Match Schedule</h2>
                <p>Upcoming World Cup 2026 fixtures</p>
              </div>
              {FALLBACK.map((m) => (
                <div key={m.matchId} className="match-row" onClick={handleEnter}>
                  <div className="match-row-teams">
                    <span>{FLAGS[m.homeTeam] || '🏳️'} {m.homeTeam}</span>
                    <span className="vs">VS</span>
                    <span>{FLAGS[m.awayTeam] || '🏳️'} {m.awayTeam}</span>
                  </div>
                  <span className="match-row-venue">{m.venue}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ─── CTA — Dark Teal section ─── */}
          <section className="section-dark-teal">
            <div className="cta-section">
              <h2>Ready to Play?</h2>
              <p>Connect your wallet and start depositing. The next half is coming.</p>
              <button className="landing-cta landing-cta-secondary" onClick={handleEnter}>
                Launch App
              </button>
            </div>
          </section>

          <footer className="app-footer" style={{ background: '#000' }}>
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

      {/* ════════════════════ APP ════════════════════ */}
      {page === 'app' && (
        <div ref={appRef}>
          <div className="top-bar">
            <div className="top-bar-brand">
              <img className="top-bar-logo" src="/assets/logo.svg" alt="" />
              <div className="top-bar-title">
                Momentum<span>Pool</span>
              </div>
            </div>
            <button className="app-back-btn" onClick={() => setPage('landing')}>
              &larr; Back
            </button>
          </div>

          <div className="main-content">
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
                    <div className="tab-team-row">
                      <span>{FLAGS[m.homeTeam] || '🏳️'}</span>
                      <span>{m.homeTeam}</span>
                    </div>
                    <div className="tab-vs-label">vs</div>
                    <div className="tab-team-row">
                      <span>{FLAGS[m.awayTeam] || '🏳️'}</span>
                      <span>{m.awayTeam}</span>
                    </div>
                    <small>{m.venue || 'WC 2026'}</small>
                  </button>
                ))}
              </div>
            </div>

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
