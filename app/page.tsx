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
    fetch('/api/matches')
      .then(r => r.json())
      .then(d => { if (d.matches?.length) setMatches(d.matches); })
      .catch(() => {});
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
    const interval = setInterval(fetchLive, 15_000);
    if (page === 'app') fetchLive();
    return () => clearInterval(interval);
  }, [selected, page]);

  const selectedMatch = matches.find(m => m.matchId === selected);
  const handleDeposit = (id: string, t: number) => console.log(`deposit ${id} team ${t}`);
  const handleEnter = () => { setPage('app'); setTimeout(() => appRef.current?.scrollIntoView({ behavior: 'smooth' }), 100); };

  return (
    <main className="app-shell">

      {/* ═══════════════════════════════ LANDING ═══════════════════════════════ */}

      {page === 'landing' && (
        <>

          {/* ──────────── SECTION 1: ELECTRIC BLUE HERO ──────────── */}
          <section className="section-wrap hero-section">
            <div className="hero-blob-1" />
            <div className="hero-blob-2" />
            <div className="hero-blob-3" />
            <div className="hero-ring-1" />
            <div className="hero-ring-2" />

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
          </section>

          {/* ──────────── SECTION 2: NEON GREEN — How It Works ──────────── */}
          <section className="section-wrap section-green">
            <div className="green-blob" />
            <div className="green-blob-2" />

            <div className="section-inner">
              <div className="section-label">How It Works</div>
              <div className="section-title">Three Steps to Own the Half</div>
              <div className="section-desc" style={{ marginBottom: 'var(--sp-8)' }}>
                Pick your side, watch the momentum shift, and win the pool at half-time.
              </div>

              <div className="green-grid">
                {[
                  { icon: '⏱️', title: 'Pick a Side', desc: 'Deposit into Team A or B before the half starts. Simple.' },
                  { icon: '📊', title: 'Live Momentum', desc: 'Goals, shots, cards — every event updates the bar in real time.' },
                  { icon: '🏆', title: 'Win the Pool', desc: 'Winners split the pot. Settled on-chain at half-time.' },
                ].map((c, i) => (
                  <div key={i} className="feature-card">
                    <div className="feature-icon" style={{ fontSize: 24 }}>{c.icon}</div>
                    <h3>{c.title}</h3>
                    <p>{c.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ──────────── SECTION 3: ORANGE — Match Schedule ──────────── */}
          <section className="section-wrap section-orange">
            <div className="orange-blob" />
            <div className="orange-blob-2" />

            <div className="section-inner">
              <div className="section-label">Schedule</div>
              <div className="section-title">World Cup 2026 Fixtures</div>
              <div className="section-desc" style={{ marginBottom: 'var(--sp-6)' }}>
                Open matches. Pick your side before the half starts.
              </div>

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

          {/* ──────────── SECTION 4: CYAN — Stats ──────────── */}
          <section className="section-wrap section-cyan">
            <div className="cyan-blob" />
            <div className="cyan-circles" />

            <div className="section-inner">
              <div className="section-label">Built on X Layer</div>
              <div className="section-title">Live on Chain</div>
              <div className="section-desc" style={{ marginBottom: 'var(--sp-6)' }}>
                Fully on-chain settlement. No oracles. Just pure momentum.
              </div>

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

          {/* ──────────── SECTION 5: RED — CTA ──────────── */}
          <section className="section-wrap section-red">
            <div className="red-blob" />
            <div className="red-blob-2" />
            <div className="red-lines" />

            <div className="section-inner">
              <div className="cta-content">
                <h2>Ready to Play?</h2>
                <p>Connect your wallet and start depositing. The next half is coming.</p>
                <button className="cta-btn" onClick={handleEnter}>
                  Launch App
                </button>
              </div>
            </div>
          </section>

          {/* ──────────── SECTION 6: YELLOW — Footer strip ──────────── */}
          <section className="section-wrap section-yellow">
            <div className="yellow-shapes" />
            <div className="yellow-content">
              <p>Momentum Pool &mdash; Powered by X Layer</p>
              <div className="social-links">
                <a href="https://x.com/XLayerOfficial" target="_blank" rel="noopener">X Layer</a>
                <a href="https://github.com/latest63/Latest-MomentumPool" target="_blank" rel="noopener">GitHub</a>
              </div>
            </div>
          </section>

        </>
      )}

      {/* ═══════════════════════════════ APP ═══════════════════════════════ */}

      {page === 'app' && (
        <div ref={appRef}>
          <div className="top-bar">
            <div className="top-bar-brand">
              <img className="top-bar-logo" src="/assets/logo.svg" alt="" />
              <div className="top-bar-title">
                Momentum<span>Pool</span>
              </div>
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
                {matches.map((m) => (
                  <button key={m.matchId} className={`match-tab ${selected === m.matchId ? 'active' : ''}`}
                    onClick={() => setSelected(m.matchId)}>
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
