'use client';

import { useEffect, useState } from 'react';
import Nav from '@/components/Nav';
import TeamBadge from '@/components/TeamBadge';

interface MatchData {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeCode: string;
  awayCode: string;
  homeBadge: string;
  awayBadge: string;
  status: string;
  half: string;
  kickoff: number;
  competition: string;
  group: string;
  matchday: number;
  isLive: boolean;
}

function TeamLogo({ name, badge, code }: { name: string; badge: string; code: string }) {
  const [broken, setBroken] = useState(false);
  if (badge && !broken) {
    return (
      <img
        src={badge}
        alt={name}
        className="team-logo-sm"
        onError={() => setBroken(true)}
      />
    );
  }
  return <TeamBadge name={name} code={code} size={28} />;
}

function formatTime(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' });
}

function timeUntil(ts: number): string {
  const diff = ts * 1000 - Date.now();
  if (diff <= 0) return 'LIVE';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function Home() {
  const [matches, setMatches] = useState<MatchData[]>([]);

  useEffect(() => {
    fetch('/api/matches')
      .then(r => r.json())
      .then(d => { if (d.matches?.length) setMatches(d.matches); })
      .catch(() => {});
  }, []);

  const live = matches.filter(m => m.isLive);
  const upcoming = matches.filter(m => !m.isLive && (m.status === 'timed' || m.status === 'scheduled'));
  const display = [...live, ...upcoming].slice(0, 5);

  return (
    <>
      <Nav />

      {/* ────────── HERO ────────── */}
      <div className="hero-wrap split-hero">
        <div className="hero-beams" />
        <div className="hero-split-inner">
          <div className="hero-content hero-content-split">
            <div className="hero-tag">
              <span className="dot" /> {live.length > 0 ? `${live.length} MATCHES LIVE` : 'FIFA WORLD CUP 2026'}
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

          <div className="hero-emblem-panel">
            <div className="emblem-stadium-light light-left" />
            <div className="emblem-stadium-light light-right" />
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
                <div className="emblem-dots">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="emblem-dot" style={{ '--i': i } as any} />
                  ))}
                </div>
              </div>
            </div>
            <div className="emblem-platform" />
          </div>

          <div className="hero-hint powered-by-badge-row">
            <span>Powered by X Layer</span>
            <img src="/assets/x-layer-powered.jpeg" alt="X Layer logo" className="xlayer-powered-badge" />
            <span>&middot; 2% pool fee</span>
          </div>
        </div>

        <div className="hero-intro">
          <div className="hero-intro-inner">
            <div className="section-label">Momentum Pool</div>
            <div className="section-title">FIFA World Cup 2026</div>
            <div className="section-desc">
              The first on-chain momentum pool built for football. Pick who controls each half,
              watch live events shift the momentum bar, and split the pot.
              No oracles. No brackets. Just pure half-by-half action.
            </div>
          </div>
        </div>
      </div>

      {/* ────────── BRAND BAR ────────── */}
      <div className="brand-bar">
        <div className="brand-bar-inner">
          <span className="brand-item brand-with-logo">
            <img src="/assets/okx-wallet-logo.jpeg" alt="OKX Wallet" className="brand-xlayer" />
            OKX Wallet
          </span>
          <span className="brand-divider" />
          <span className="brand-item brand-with-logo">
            <img src="/assets/x-layer-powered.jpeg" alt="X Layer" className="brand-xlayer" />
            X Layer
          </span>
          <span className="brand-divider" />
          <span className="brand-item brand-with-logo">
            <img src="/assets/okx-explorer-logo.jpeg" alt="OKX Explorer" className="brand-xlayer" />
            OKX Explorer
          </span>
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
              <img src="/assets/feature-win-pool-v2.jpg" alt="Fans celebrating a win with confetti" className="feature-img" />
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
          <div className="section-title">World Cup 2026 Matches</div>
          <div className="section-desc">Open matches. Pick your side before the half starts.</div>
          <div className="match-grid">
            {display.map((m) => (
              <a key={m.matchId} href="/arena" className="match-card">
                <div className="match-card-teams">
                  <span className="match-card-team">
                    <TeamLogo name={m.homeTeam} badge={m.homeBadge} code={m.homeCode} />
                    {m.homeTeam}
                  </span>
                  <span className="vs">vs</span>
                  <span className="match-card-team">
                    <TeamLogo name={m.awayTeam} badge={m.awayBadge} code={m.awayCode} />
                    {m.awayTeam}
                  </span>
                </div>
                <span className="match-card-venue">
                  {m.group} &middot; {m.isLive ? 'LIVE' : formatTime(m.kickoff)}
                </span>
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
              { num: String(matches.length), label: 'World Cup Matches' },
              { num: '14K', label: 'Prize Pool (USDT)' },
              { num: String(live.length), label: 'Live Now' },
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
          <img src="/assets/x-layer-powered.jpeg" alt="X Layer logo" className="xlayer-powered-img footer-powered-img" />
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
