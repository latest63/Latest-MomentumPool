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
  const [playerIdx, setPlayerIdx] = useState(0);
  const appRef = useRef<HTMLDivElement>(null);

  // Rotate player every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => setPlayerIdx(i => (i + 1) % 3), 5000);
    return () => clearInterval(timer);
  }, []);

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

  const playerPoses = [
    { label: 'Kicking', svg: '/assets/players.svg#player-kick' },
    { label: 'Dribbling', svg: '/assets/players.svg#player-dribble' },
    { label: 'Celebrating', svg: '/assets/players.svg#player-celebrate' },
  ];

  return (
    <main className="app-shell">
      {/* ══════════ UNIFIED COLOR BG ══════════ */}
      <div className="color-bg">
        <div className="bg-blob bg-blob-1" /><div className="bg-blob bg-blob-2" />
        <div className="bg-blob bg-blob-3" /><div className="bg-blob bg-blob-4" />
        <div className="bg-blob bg-blob-5" /><div className="bg-blob bg-blob-6" />
      </div>

      {/* ══════════ BOLD ABSTRACT LINES — thick, energetic ══════════ */}
      <div className="abs-lines">
        <svg viewBox="0 0 1200 3000" preserveAspectRatio="xMidYMax slice" className="abs-lines-svg">
          {/* Thick electric blue curve */}
          <path d="M0,0 C100,500 0,1000 100,1500 C200,2000 50,2500 100,3000"
            stroke="rgba(36, 83, 190, 0.25)" fill="none" strokeWidth="12" strokeLinecap="round" />
          <path d="M0,0 C100,500 0,1000 100,1500 C200,2000 50,2500 100,3000"
            stroke="rgba(36, 83, 190, 0.08)" fill="none" strokeWidth="24" strokeLinecap="round" />

          {/* Thick red curve */}
          <path d="M250,0 C400,400 200,900 350,1400 C500,1900 280,2400 350,3000"
            stroke="rgba(230, 26, 10, 0.2)" fill="none" strokeWidth="10" strokeLinecap="round" />
          <path d="M250,0 C400,400 200,900 350,1400 C500,1900 280,2400 350,3000"
            stroke="rgba(230, 26, 10, 0.06)" fill="none" strokeWidth="22" strokeLinecap="round" />

          {/* Thick cyan curve */}
          <path d="M500,0 C650,600 450,1200 600,1800 C750,2400 550,2700 600,3000"
            stroke="rgba(0, 229, 255, 0.18)" fill="none" strokeWidth="10" strokeLinecap="round" />
          <path d="M500,0 C650,600 450,1200 600,1800 C750,2400 550,2700 600,3000"
            stroke="rgba(0, 229, 255, 0.06)" fill="none" strokeWidth="20" strokeLinecap="round" />

          {/* Thick orange curve */}
          <path d="M750,0 C850,400 700,1000 800,1500 C900,2000 780,2500 800,3000"
            stroke="rgba(255, 71, 2, 0.18)" fill="none" strokeWidth="10" strokeLinecap="round" />
          <path d="M750,0 C850,400 700,1000 800,1500 C900,2000 780,2500 800,3000"
            stroke="rgba(255, 71, 2, 0.06)" fill="none" strokeWidth="20" strokeLinecap="round" />

          {/* Thick neon green curve */}
          <path d="M950,0 C1050,500 920,1100 980,1700 C1040,2300 960,2600 980,3000"
            stroke="rgba(40, 193, 108, 0.18)" fill="none" strokeWidth="10" strokeLinecap="round" />
          <path d="M950,0 C1050,500 920,1100 980,1700 C1040,2300 960,2600 980,3000"
            stroke="rgba(40, 193, 108, 0.06)" fill="none" strokeWidth="20" strokeLinecap="round" />

          {/* Thick yellow curve */}
          <path d="M1100,0 C1180,600 1080,1200 1150,1800 C1220,2400 1120,2700 1150,3000"
            stroke="rgba(190, 238, 79, 0.15)" fill="none" strokeWidth="10" strokeLinecap="round" />
          <path d="M1100,0 C1180,600 1080,1200 1150,1800 C1220,2400 1120,2700 1150,3000"
            stroke="rgba(190, 238, 79, 0.05)" fill="none" strokeWidth="20" strokeLinecap="round" />

          {/* Extra bold accent streaks */}
          <path d="M120,0 C250,700 80,1400 200,2100 C320,2800 180,2900 200,3000"
            stroke="rgba(36, 83, 190, 0.07)" fill="none" strokeWidth="30" strokeLinecap="round" />
          <path d="M850,0 C1000,800 800,1600 950,2400 C1050,2800 920,2900 950,3000"
            stroke="rgba(230, 26, 10, 0.06)" fill="none" strokeWidth="25" strokeLinecap="round" />
          <path d="M450,0 C580,700 420,1400 550,2100 C680,2800 520,2900 550,3000"
            stroke="rgba(0, 229, 255, 0.05)" fill="none" strokeWidth="18" strokeLinecap="round" />
        </svg>
      </div>

      {/* ══════════ LANDING PAGE ══════════ */}

      {page === 'landing' && (
        <>
          {/* ────────── HERO with player rotation ────────── */}
          <div className="hero-wrap">
            {/* Player showcase — switching every 5s */}
            <div className="player-showcase">
              <div className={`player-fig ${playerIdx === 0 ? 'active' : ''}`} style={{ opacity: playerIdx === 0 ? 1 : 0 }}>
                <img src="/assets/player-kick.svg" alt="Kicking" />
              </div>
              <div className={`player-fig ${playerIdx === 1 ? 'active' : ''}`} style={{ opacity: playerIdx === 1 ? 1 : 0 }}>
                <img src="/assets/player-dribble.svg" alt="Dribbling" />
              </div>
              <div className={`player-fig ${playerIdx === 2 ? 'active' : ''}`} style={{ opacity: playerIdx === 2 ? 1 : 0 }}>
                <img src="/assets/player-celebrate.svg" alt="Celebrating" />
              </div>
            </div>

            {/* Hero overlay gradient */}
            <div className="hero-overlay" />

            {/* Stadium beams */}
            <div className="hero-beams" />

            {/* Nav */}
            <nav className="hero-nav">
              <div className="top-bar-brand">
                <img className="top-bar-logo" src="/assets/logo.svg" alt="" />
                <div className="top-bar-title">
                  Momentum<span>Pool</span>
                </div>
              </div>
            </nav>

            {/* Hero text */}
            <div className="hero-content">
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
              <p className="hero-hint">Powered by X Layer &middot; 2% pool fee</p>
            </div>
          </div>

          {/* ────────── HOW IT WORKS with stadium image ────────── */}
          <section className="section">
            <div className="section-inner">
              <div className="section-label">How It Works</div>
              <div className="section-title">Three Steps to Own the Half</div>
              <div className="section-desc">Pick your side, watch the momentum shift, and win the pool at half-time.</div>
              <div className="features-grid">
                <div className="feature-card">
                  <img src="/assets/design-1.jpeg" alt="Pick your side" className="feature-img" />
                  <h3>Pick a Side</h3>
                  <p>Deposit into Team A or B before the half starts. Your pick, your call.</p>
                </div>
                <div className="feature-card">
                  <img src="/assets/football.svg" alt="Football" className="feature-img" style={{ objectFit: 'contain', background: 'rgba(0,0,0,0.3)', padding: '20px' }} />
                  <h3>Live Momentum</h3>
                  <p>Goals, shots, cards, corners — every event updates the momentum bar in real time.</p>
                </div>
                <div className="feature-card">
                  <img src="/assets/design-2.jpeg" alt="Win the pool" className="feature-img" />
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
            <p>Momentum Pool &mdash; Powered by X Layer</p>
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
            <div className="top-bar-brand">
              <img className="top-bar-logo" src="/assets/logo.svg" alt="" />
              <div className="top-bar-title">Momentum<span>Pool</span></div>
            </div>
            <button className="app-back-btn" onClick={() => setPage('landing')}>&larr; Back</button>
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
