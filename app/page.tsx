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
      {/* ═══════════════ UNIFIED COLORED BACKGROUND ═══════════════ */}
      <div className="color-bg">
        <div className="bg-blob bg-blob-1" />
        <div className="bg-blob bg-blob-2" />
        <div className="bg-blob bg-blob-3" />
        <div className="bg-blob bg-blob-4" />
        <div className="bg-blob bg-blob-5" />
        <div className="bg-blob bg-blob-6" />
        <div className="bg-streak" />
        <div className="bg-streak bg-streak-2" />
      </div>

      {/* ═══════════════ ABSTRACT CURVED LINES — football energy ═══════════════ */}
      {/* These span the full page from hero to footer */}
      <div className="abs-lines">
        <svg viewBox="0 0 1200 3000" preserveAspectRatio="xMidYMax slice" className="abs-lines-svg">
          {/* Line 1 — Electric Blue — far left wave */}
          <path d="M0,0 C80,400 60,800 0,1200 C-60,1600 -40,2000 0,3000"
            stroke="rgba(36, 83, 190, 0.3)" fill="none" strokeWidth="3" />
          <path d="M60,0 C140,500 120,900 60,1300 C0,1700 20,2100 60,3000"
            stroke="rgba(36, 83, 190, 0.15)" fill="none" strokeWidth="1.5" />

          {/* Line 2 — Bright Red — mid-left wave */}
          <path d="M200,0 C300,300 150,700 200,1100 C250,1500 100,2000 200,3000"
            stroke="rgba(230, 26, 10, 0.25)" fill="none" strokeWidth="2.5" />

          {/* Line 3 — Cyan — center wave */}
          <path d="M500,0 C600,500 400,1000 500,1500 C600,2000 450,2500 500,3000"
            stroke="rgba(0, 229, 255, 0.2)" fill="none" strokeWidth="2" />

          {/* Line 4 — Orange — center-right wave */}
          <path d="M700,0 C800,400 650,900 700,1400 C750,1900 680,2400 700,3000"
            stroke="rgba(255, 71, 2, 0.2)" fill="none" strokeWidth="2" />

          {/* Line 5 — Neon Green — right wave */}
          <path d="M950,0 C1020,350 900,800 950,1200 C1000,1600 920,2200 950,3000"
            stroke="rgba(40, 193, 108, 0.2)" fill="none" strokeWidth="2" />

          {/* Line 6 — Yellow — far right wave */}
          <path d="M1100,0 C1180,500 1080,1000 1100,1500 C1120,2000 1090,2500 1100,3000"
            stroke="rgba(190, 238, 79, 0.15)" fill="none" strokeWidth="2.5" />
          <path d="M1150,0 C1200,600 1140,1100 1150,1600 C1160,2100 1145,2600 1150,3000"
            stroke="rgba(190, 238, 79, 0.08)" fill="none" strokeWidth="1.5" />

          {/* Thicker accent curves */}
          <path d="M120,0 C260,600 100,1200 200,1800 C300,2400 150,2700 180,3000"
            stroke="rgba(36, 83, 190, 0.12)" fill="none" strokeWidth="6" />

          <path d="M850,0 C950,500 800,1100 900,1700 C1000,2300 880,2600 900,3000"
            stroke="rgba(230, 26, 10, 0.1)" fill="none" strokeWidth="5" />

          <path d="M550,0 C650,600 500,1200 600,1800 C700,2400 580,2700 600,3000"
            stroke="rgba(0, 229, 255, 0.08)" fill="none" strokeWidth="4" />
        </svg>

        {/* Animated flowing dots along the paths */}
        <div className="abs-dot" style={{ left: '4%', top: '0%', background: 'var(--electric-blue)', animationDelay: '0s' }} />
        <div className="abs-dot" style={{ left: '17%', top: '10%', background: 'var(--bright-red)', animationDelay: '-3s' }} />
        <div className="abs-dot" style={{ left: '42%', top: '20%', background: 'var(--cyan)', animationDelay: '-6s' }} />
        <div className="abs-dot" style={{ left: '58%', top: '5%', background: 'var(--orange)', animationDelay: '-2s' }} />
        <div className="abs-dot" style={{ left: '79%', top: '15%', background: 'var(--neon-green)', animationDelay: '-5s' }} />
        <div className="abs-dot" style={{ left: '92%', top: '8%', background: 'var(--yellow)', animationDelay: '-8s' }} />
      </div>

      {/* ═══════════════ LANDING PAGE ═══════════════ */}

      {page === 'landing' && (
        <>
          {/* ─── HERO ─── */}
          <nav className="hero-nav">
            <div className="top-bar-brand">
              <img className="top-bar-logo" src="/assets/logo.svg" alt="" />
              <div className="top-bar-title">
                Momentum<span>Pool</span>
              </div>
            </div>
          </nav>

          <div className="hero-center">
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

          {/* ─── HOW IT WORKS ─── */}
          <section className="section">
            <div className="section-inner">
              <div className="section-label">How It Works</div>
              <div className="section-title">Three Steps to Own the Half</div>
              <div className="section-desc">Pick your side, watch the momentum shift, and win the pool at half-time.</div>
              <div className="features-grid">
                {[
                  { icon: '⏱️', title: 'Pick a Side', desc: 'Deposit into Team A or B before the half starts. Your pick, your call.' },
                  { icon: '📊', title: 'Live Momentum', desc: 'Goals, shots, cards, corners — every event updates the bar in real time.' },
                  { icon: '🏆', title: 'Win the Pool', desc: 'Winners split the losers&apos; pool. All settled on-chain at half-time.' },
                ].map((c, i) => (
                  <div key={i} className="feature-card">
                    <div className="feature-icon">{c.icon}</div>
                    <h3>{c.title}</h3>
                    <p>{c.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ─── MATCHES ─── */}
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

          {/* ─── STATS ─── */}
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

          {/* ─── CTA ─── */}
          <section className="section">
            <div className="section-inner">
              <div className="cta-content">
                <h2>Ready to Play?</h2>
                <p>Connect your wallet and start depositing. The next half is coming.</p>
                <button className="cta-btn" onClick={handleEnter}>Launch App</button>
              </div>
            </div>
          </section>

          {/* ─── FOOTER ─── */}
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

      {/* ═══════════════ APP PAGE ═══════════════ */}

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
