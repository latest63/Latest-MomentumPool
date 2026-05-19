'use client';

import { useEffect, useState, useRef } from 'react';
import { MomentumBar, EventFeed, PoolCard } from '@/components/MomentumMeter';

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

export default function Home() {
  const [page, setPage] = useState<'landing' | 'app'>('landing');
  const [matches, setMatches] = useState<MatchSummary[]>(FALLBACK);
  const [selected, setSelected] = useState(FALLBACK[0]?.matchId ?? '');
  const [momentum, setMomentum] = useState<MomentumData | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const appRef = useRef<HTMLDivElement>(null);

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
        const [momRes, evRes] = await Promise.all([fetch(`/api/match/${selected}/momentum`), fetch(`/api/match/${selected}`)]);
        if (momRes.ok) setMomentum(await momRes.json());
        if (evRes.ok) { const d = await evRes.json(); setEvents(d.recentEvents || []); }
      } catch {}
    };
    const interval = setInterval(fetchLive, 15_000);
    if (page === 'app') fetchLive();
    return () => clearInterval(interval);
  }, [selected, page]);

  const selectedMatch = matches.find(m => m.matchId === selected);
  const handleDeposit = (id: string, t: number) => console.log(`deposit ${id} team ${t}`);
  const handleEnter = () => { setPage('app'); setTimeout(() => appRef.current?.scrollIntoView({ behavior: 'smooth' }), 100); };

  return (
    <main className="app-shell">
      {/* ══════════ UNIFIED COLOR BG ══════════ */}
      <div className="color-bg">
        <div className="bg-blob bg-blob-1" /><div className="bg-blob bg-blob-2" />
        <div className="bg-blob bg-blob-3" /><div className="bg-blob bg-blob-4" />
        <div className="bg-blob bg-blob-5" /><div className="bg-blob bg-blob-6" />
      </div>

      {/* ══════════ LANDING PAGE ══════════ */}

      {page === 'landing' && (
        <>
          {/* ────────── HERO split layout with real player image ────────── */}
          <div className="hero-wrap split-hero">
            {/* Hero overlay gradient */}
            <div className="hero-overlay" />

            {/* Stadium beams */}
            <div className="hero-beams" />

            {/* Nav */}
            <nav className="hero-nav">
              <div className="top-bar-brand">
                <img className="top-bar-logo" src="/assets/momentum-logo-transparent.png" alt="Momentum Pool" />
                <div className="top-bar-title">
                  Momentum<span>Pool</span>
                </div>
              </div>
            </nav>

            <div className="hero-split-inner">
              <div className="hero-content hero-content-split">
                <div className="hero-tag">
                  <span className="dot" /> WORLD CUP 2026
                </div>
                <h1 className="hero-title">
                  Pick the<br /><span className="hl">Momentum</span>
                </h1>
                <p className="hero-sub">
                  Deposit on who controls the half.<br />
                  More momentum points wins the pool.
                </p>
                <button className="hero-cta" onClick={handleEnter}>
                  Enter the Arena
                </button>
                <div className="hero-hint powered-by-badge-row">
                  <img src="/assets/x-layer-powered.jpeg" alt="X Layer" className="xlayer-powered-badge" />
                  <span>&middot; 2% pool fee</span>
                </div>
              </div>
            </div>
          </div>

          {/* ────────── INTRODUCTION ────────── */}
          <section className="section">
            <div className="section-inner">
              <div className="section-label">Momentum Pool</div>
              <div className="section-title">World Cup 2026 on X Layer</div>
              <div className="section-desc">
                The first on-chain momentum pool built for football. Pick who controls each half,
                watch live events shift the momentum bar, and split the pot at half-time.
                No oracles. No brackets. Just pure half-by-half action.
              </div>
            </div>
          </section>

          {/* ────────── HOW IT WORKS with stadium image ────────── */}
          <section className="section">
            <div className="section-inner">
              <div className="section-label">How It Works</div>
              <div className="section-title">Three Steps to Own the Half</div>
              <div className="section-desc">Pick your side, watch the momentum shift, and win the pool at half-time.</div>
              <div className="features-grid">
                <div className="feature-card">
                  <img src="/assets/feature-pick-side.jpg" alt="Packed football stadium under floodlights" className="feature-img" />
                  <h3>Pick a Side</h3>
                  <p>Deposit into Team A or B before the half starts. Your pick, your call.</p>
                </div>
                <div className="feature-card">
                  <img src="/assets/feature-live-momentum.jpg" alt="Football on pitch with stadium lights" className="feature-img" />
                  <h3>Live Momentum</h3>
                  <p>Goals, shots, cards, corners — every event updates the momentum bar in real time.</p>
                </div>
                <div className="feature-card">
                  <img src="/assets/feature-win-pool.jpg" alt="Fans celebrating a win with confetti" className="feature-img" />
                  <h3>Win the Pool</h3>
                  <p>Winners split the losers&apos; pool. All settled on-chain at half-time.</p>
                </div>
              </div>
            </div>
          </section>

          {/* ────────── MATCHES ────────── */}
          <section className="section">
            <div className="section-inner">
              <div className="section-label">Schedule</div>
              <div className="section-title">World Cup 2026 Fixtures</div>
              <div className="section-desc">Open matches. Pick your side before the half starts.</div>
              <div className="match-grid">
                {FALLBACK.map((m) => (
                  <div key={m.matchId} className="match-card" onClick={handleEnter}>
                    <div className="match-card-teams">
                      <span>{FLAGS[m.homeTeam] || '🏳️'} {m.homeTeam}</span>
                      <span className="vs">vs</span>
                      <span>{FLAGS[m.awayTeam] || '🏳️'} {m.awayTeam}</span>
                    </div>
                    <span className="match-card-venue">{m.venue}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ────────── STATS ────────── */}
          <section className="section">
            <div className="section-inner">
              <div className="section-label">Built on X Layer</div>
              <div className="section-title">Live on Chain</div>
              <div className="section-desc">Fully on-chain settlement. No oracles. Just pure momentum.</div>
              <div className="stats-row">
                {[
                  { num: '0', label: 'Active Pools' },
                  { num: '14K', label: 'Prize Pool (USDT)' },
                  { num: '4', label: 'Live Matches' },
                ].map((s, i) => (
                  <div key={i} className="stat-card">
                    <div className="stat-number">{s.num}</div>
                    <div className="stat-label">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ────────── CTA ────────── */}
          <section className="section">
            <div className="section-inner">
              <div className="cta-content">
                <h2>Ready to Play?</h2>
                <p>Connect your wallet and start depositing. The next half is coming.</p>
                <button className="cta-btn" onClick={handleEnter}>Launch App</button>
              </div>
            </div>
          </section>

          {/* ────────── FOOTER ────────── */}
          <section className="footer-section">
            <div className="footer-powered">
              <span>Momentum Pool</span>
              <img src="/assets/x-layer-powered.jpeg" alt="X Layer" className="xlayer-powered-badge footer-powered-img" />
            </div>
            <div className="footer-links">
              <a href="https://x.com/XLayerOfficial" target="_blank" rel="noopener">@XLayerOfficial</a>
              <a href="https://github.com/latest63/Latest-MomentumPool" target="_blank" rel="noopener">GitHub</a>
              <a href="https://www.xlayer.tech/" target="_blank" rel="noopener">X Layer</a>
            </div>
          </section>
        </>
      )}

      {/* ══════════ APP PAGE ══════════ */}

      {page === 'app' && (
        <div ref={appRef}>
          <div className="top-bar">
            <button type="button" className="top-bar-brand" onClick={() => setPage('landing')} aria-label="Back to home">
              <img className="top-bar-logo" src="/assets/momentum-logo-transparent.png" alt="Momentum Pool" />
              <div className="top-bar-title">Momentum<span>Pool</span></div>
            </button>
          </div>

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
                <PoolCard matchId={selectedMatch.matchId} homeTeam={selectedMatch.homeTeam} awayTeam={selectedMatch.awayTeam} onDeposit={handleDeposit} />
                <EventFeed events={events} homeTeam={selectedMatch.homeTeam} awayTeam={selectedMatch.awayTeam} />
              </div>
            )}

            <footer className="app-footer">
              <p>Built on <a href="https://www.xlayer.tech/" target="_blank" rel="noopener">X Layer</a> &middot; <a href="https://x.com/XLayerOfficial" target="_blank" rel="noopener">@XLayerOfficial</a> &middot; <a href="https://github.com/latest63/Latest-MomentumPool" target="_blank" rel="noopener">GitHub</a></p>
            </footer>
          </div>
        </div>
      )}
    </main>
  );
}
