'use client';

import Nav from '@/components/Nav';

const FALLBACK = [
  { id: 'usa-canada', home: 'USA', away: 'Canada', venue: 'SoFi Stadium' },
  { id: 'brazil-nigeria', home: 'Brazil', away: 'Nigeria', venue: 'Estadio Azteca' },
  { id: 'argentina-ghana', home: 'Argentina', away: 'Ghana', venue: 'BC Place' },
  { id: 'mexico-japan', home: 'Mexico', away: 'Japan', venue: 'NRG Stadium' },
];

const FLAGS: Record<string, string> = {
  USA: '🇺🇸', Canada: '🇨🇦', Mexico: '🇲🇽',
  Brazil: '🇧🇷', Nigeria: '🇳🇬', Ghana: '🇬🇭',
  Argentina: '🇦🇷', Japan: '🇯🇵',
};

export default function Home() {
  return (
    <>
      <Nav />

      {/* ────────── HERO ────────── */}
      <div className="hero-wrap split-hero">
        <div className="hero-beams" />

        <div className="hero-split-inner">
          <div className="hero-content hero-content-split">
            <div className="hero-tag">
              <span className="dot" /> WORLD CUP 2026
            </div>
            <h1 className="hero-title">
              PICK THE<br />
              <span className="hl">MOMENTUM</span>
            </h1>
            <p className="hero-sub">
              Deposit on who controls the half.<br />
              More momentum points wins the pool.
            </p>
            <a href="/arena" className="hero-cta">
              Enter the Arena
            </a>
          </div>

          {/* ────────── Momentum Emblem ────────── */}
          <div className="hero-emblem-panel">
            <div className="emblem-stadium-light light-left" />
            <div className="emblem-stadium-light light-right" />
            <div className="emblem-rainbow-arc arc-a" />
            <div className="emblem-rainbow-arc arc-b" />
            <div className="emblem-rainbow-arc arc-c" />
            <div className="emblem-particles" aria-hidden="true">
              {[...Array(14)].map((_, i) => (
                <span key={i} style={{ '--p': i } as any} />
              ))}
            </div>
            <div className="emblem-glow-bg" />
            <div className="emblem">
              <div className="emblem-frame emblem-frame-1" />
              <div className="emblem-frame emblem-frame-2" />
              <div className="emblem-frame emblem-frame-3" />
              <div className="emblem-inner">
                <div className="emblem-pitch">
                  <div className="pitch-center-circle" />
                  <div className="pitch-center-line" />
                  <div className="pitch-penalty pitch-penalty-top" />
                  <div className="pitch-penalty pitch-penalty-bot" />
                </div>
                <div className="emblem-core-mark" aria-label="Momentum tracking core">
                  <span className="core-ring core-ring-1" />
                  <span className="core-ring core-ring-2" />
                  <span className="core-pulse" />
                </div>
                <div className="emblem-arc emblem-arc-1" />
                <div className="emblem-arc emblem-arc-2" />
                <div className="emblem-dots">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="emblem-dot" style={{ '--i': i } as any} />
                  ))}
                </div>
              </div>
            </div>
            <div className="emblem-platform" />
          </div>

          {/* ────────── Powered by Badge ────────── */}
          <div className="hero-hint powered-by-badge-row">
            <span>Powered by X Layer</span>
            <img src="/assets/x-layer-powered.jpeg" alt="X Layer logo" className="xlayer-powered-badge" />
            <span>&middot; 2% pool fee</span>
          </div>
        </div>

        {/* ────────── INTRODUCTION (on hero background) ────────── */}
        <div className="hero-intro">
          <div className="hero-intro-inner">
            <div className="section-label">Momentum Pool</div>
            <div className="section-title">World Cup 2026 on X Layer</div>
            <div className="section-desc">
              The first on-chain momentum pool built for football. Pick who controls each half,
              watch live events shift the momentum bar, and split the pot at half-time.
              No oracles. No brackets. Just pure half-by-half action.
            </div>
          </div>
        </div>
      </div>

      {/* ────────── HOW IT WORKS ────────── */}
      <section className="section">
        <div className="section-inner">
          <div className="section-label">How It Works</div>
          <div className="section-title">Three Steps to Own the Half</div>
          <div className="section-desc">Pick your side, watch the momentum shift, and win the pool at half-time.</div>
          <div className="features-grid">
            <div className="feature-card">
              <img src="/assets/feature-pick-side-v2.jpg" alt="Pick a side" className="feature-img" />
              <h3>Pick a Side</h3>
              <p>Deposit into Team A or B before the half starts. Your pick, your call.</p>
            </div>
            <div className="feature-card">
              <img src="/assets/feature-live-momentum-v2.jpg" alt="Live Momentum" className="feature-img" />
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
              <a key={m.id} href="/arena" className="match-card">
                <div className="match-card-teams">
                  <span>{FLAGS[m.home] || '🏳️'} {m.home}</span>
                  <span className="vs">vs</span>
                  <span>{FLAGS[m.away] || '🏳️'} {m.away}</span>
                </div>
                <span className="match-card-venue">{m.venue}</span>
              </a>
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
            <a href="/arena" className="cta-btn">Launch App</a>
          </div>
        </div>
      </section>

      {/* ────────── FOOTER ────────── */}
      <section className="footer-section">
        <div className="footer-powered">
          <span>Momentum Pool</span>
          <span className="footer-powered-text">Powered by X Layer</span>
          <img src="/assets/x-layer-powered.jpeg" alt="X Layer logo" className="xlayer-powered-badge footer-powered-img" />
        </div>
        <div className="footer-links">
          <a href="https://x.com/XLayerOfficial" target="_blank" rel="noopener">@XLayerOfficial</a>
          <a href="https://github.com/latest63/Latest-MomentumPool" target="_blank" rel="noopener">GitHub</a>
          <a href="https://www.xlayer.tech/" target="_blank" rel="noopener">X Layer</a>
        </div>
      </section>
    </>
  );
}
