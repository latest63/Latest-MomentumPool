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

// 2026 FIFA World Cup matches (first round of group stage)
const WORLD_CUP_MATCHES = [
  { matchId: 'wc01', homeTeam: 'USA', awayTeam: 'Canada', kickoff: 1750000000 },
  { matchId: 'wc02', homeTeam: 'Mexico', awayTeam: 'Ghana', kickoff: 1750086400 },
  { matchId: 'wc03', homeTeam: 'Brazil', awayTeam: 'Nigeria', kickoff: 1750172800 },
  { matchId: 'wc04', homeTeam: 'Argentina', awayTeam: 'Japan', kickoff: 1750259200 },
  { matchId: 'wc05', homeTeam: 'England', awayTeam: 'Senegal', kickoff: 1750345600 },
  { matchId: 'wc06', homeTeam: 'France', awayTeam: 'Morocco', kickoff: 1750432000 },
];

export default function Home() {
  const [matches, setMatches] = useState(WORLD_CUP_MATCHES);
  const [selected, setSelected] = useState(WORLD_CUP_MATCHES[0].matchId);
  const [momentum, setMomentum] = useState<MomentumData | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Try loading matches from API, fallback to static data
  useEffect(() => {
    setLoading(true);
    fetch('/api/matches')
      .then((r) => r.json())
      .then((data) => {
        if (data.matches?.length) setMatches(data.matches);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Auto-select first match
  useEffect(() => {
    if (matches.length > 0 && !matches.find((m) => m.matchId === selected)) {
      setSelected(matches[0].matchId);
    }
  }, [matches, selected]);

  // Poll every 15s
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
        setError(null);
      } catch {
        // silent for now
      }
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
      {/* Hero */}
      <header className="hero">
        <div className="hero-badge">2026 FIFA WORLD CUP</div>
        <h1 className="hero-title">⚡ Momentum Pool</h1>
        <p className="hero-sub">
          Pick the dominant team in each half. No predictions — pure momentum.
        </p>
        <div className="hero-cta">
          <span>🏆</span>
          <span>Built on X Layer for OKX Build-X</span>
        </div>
      </header>

      {/* Match selector */}
      <div className="match-tabs">
        {matches.map((m) => (
          <button
            key={m.matchId}
            className={`match-tab ${selected === m.matchId ? 'active' : ''}`}
            onClick={() => setSelected(m.matchId)}
          >
            <span className="flag">{m.homeTeam === 'USA' ? '🇺🇸' : m.homeTeam === 'Mexico' ? '🇲🇽' : m.homeTeam === 'Brazil' ? '🇧🇷' : m.homeTeam === 'Argentina' ? '🇦🇷' : m.homeTeam === 'England' ? '🏴󠁧󠁢󠁥󠁮󠁧󠁿' : m.homeTeam === 'France' ? '🇫🇷' : '🏳️'}</span>
            {m.homeTeam} vs {m.awayTeam}
          </button>
        ))}
      </div>

      {/* Main content */}
      {selectedMatch && (
        <div className="match-view">
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

      {/* Footer */}
      <footer className="app-footer">
        <p>🇺🇸🇨🇦🇲🇽 FIFA World Cup 2026 • Hosted by USA • Canada • Mexico</p>
        <p className="footer-twitter">
          Follow{' '}
          <a href="https://x.com/XLayerOfficial" target="_blank" rel="noopener">
            @XLayerOfficial
          </a>{' '}
          • #BuildX • #XLayer
        </p>
      </footer>

      <style>{`
        .app-shell {
          min-height: 100vh;
          background: linear-gradient(180deg, #0a0a1a 0%, #0f172a 100%);
          color: #e2e8f0;
          max-width: 640px;
          margin: 0 auto;
          padding: 0 20px 40px;
        }

        /* ── Hero ── */
        .hero {
          text-align: center;
          padding: 40px 20px 24px;
          position: relative;
        }
        .hero::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 10%;
          width: 80%;
          height: 1px;
          background: linear-gradient(90deg, transparent, #f59e0b, transparent);
        }
        .hero-badge {
          display: inline-block;
          background: linear-gradient(135deg, #1e3a5f, #0f172a);
          border: 1px solid #f59e0b44;
          color: #fbbf24;
          padding: 4px 16px;
          border-radius: 20px;
          font-size: 0.7rem;
          letter-spacing: 2px;
          font-weight: 700;
          margin-bottom: 12px;
        }
        .hero-title {
          margin: 0;
          font-size: 2rem;
          font-weight: 800;
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero-sub {
          margin: 8px 0;
          color: #94a3b8;
          font-size: 0.9rem;
        }
        .hero-cta {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 8px;
          padding: 6px 16px;
          border-radius: 20px;
          background: #1e293b;
          font-size: 0.75rem;
          color: #64748b;
        }

        /* ── Match Tabs ── */
        .match-tabs {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding: 16px 0 12px;
          margin-bottom: 16px;
          scrollbar-width: none;
        }
        .match-tabs::-webkit-scrollbar { display: none; }
        .match-tab {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 8px;
          border: 1px solid #334155;
          background: transparent;
          color: #94a3b8;
          cursor: pointer;
          white-space: nowrap;
          font-size: 0.8rem;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .match-tab.active {
          background: linear-gradient(135deg, #1e3a5f, #0f172a);
          border-color: #f59e0b;
          color: #fbbf24;
        }
        .match-tab:hover:not(.active) {
          border-color: #6366f1;
          color: #e2e8f0;
        }
        .flag { font-size: 1rem; }

        /* ── Match View ── */
        .match-view {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* ── Momentum Bar ── */
        .wc-bar {
          background: linear-gradient(135deg, #1a1a3e, #0f172a);
          border: 1px solid #334155;
          border-radius: 16px;
          padding: 24px;
          position: relative;
          overflow: hidden;
        }
        .wc-bar::before {
          content: '🏆';
          position: absolute;
          top: -10px;
          right: -10px;
          font-size: 3rem;
          opacity: 0.08;
        }
        .wc-teams {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .wc-left, .wc-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .wc-right { flex-direction: row-reverse; }
        .wc-name { font-weight: 700; font-size: 1rem; color: #e2e8f0; }
        .wc-score {
          font-size: 2rem; font-weight: 800;
          min-width: 36px; text-align: center;
        }
        .wc-left .wc-score { color: #fbbf24; }
        .wc-right .wc-score { color: #fbbf24; }
        .wc-half-badge {
          background: #1e3a5f; color: #fbbf24;
          padding: 4px 12px; border-radius: 20px;
          font-size: 0.65rem; letter-spacing: 1px; font-weight: 700;
          border: 1px solid #f59e0b33;
        }
        .wc-track {
          position: relative; height: 28px;
          border-radius: 14px; overflow: hidden;
          background: #1e293b; display: flex;
        }
        .wc-fill {
          height: 100%;
          background: linear-gradient(90deg, #2563eb, #3b82f6);
          transition: width 0.5s ease-out;
        }
        .wc-fill-away {
          background: linear-gradient(90deg, #dc2626, #ef4444);
        }
        .wc-divider {
          position: absolute; left: 50%; top: 0;
          width: 3px; height: 100%;
          background: #fbbf24; transform: translateX(-50%);
          z-index: 2;
        }
        .wc-marker {
          position: absolute; top: -8px;
          transform: translateX(-50%);
          font-size: 0.8rem; z-index: 3;
          transition: left 0.5s ease-out;
        }
        .wc-dom { text-align: center; font-size: 0.8rem; color: #94a3b8; margin-top: 10px; }
        .wc-skeleton .wc-skel-bar {
          height: 28px; border-radius: 14px;
          background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%);
          background-size: 200% 100%; animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .wc-empty { text-align: center; color: #64748b; padding: 40px; font-size: 1rem; }

        /* ── Pool Card ── */
        .wc-pool {
          background: linear-gradient(135deg, #1a1a3e, #0f172a);
          border: 1px solid #334155;
          border-radius: 16px; padding: 20px;
        }
        .wc-pool-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 16px;
          font-size: 0.75rem; color: #fbbf24; font-weight: 700; letter-spacing: 1px;
        }
        .wc-pool-half {
          background: #1e293b; color: #64748b;
          padding: 2px 10px; border-radius: 10px; font-size: 0.65rem;
        }
        .wc-pool-teams { display: flex; align-items: center; gap: 12px; }
        .wc-pool-btn {
          flex: 1; padding: 16px; border-radius: 12px;
          border: 2px solid #334155; background: transparent;
          color: #e2e8f0; cursor: pointer;
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          transition: all 0.2s; position: relative;
        }
        .wc-pool-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .wc-pool-btn:not(:disabled):hover {
          border-color: #f59e0b;
          background: rgba(245, 158, 11, 0.08);
          box-shadow: 0 0 20px rgba(245, 158, 11, 0.15);
        }
        .wc-pool-name { font-size: 1.1rem; font-weight: 700; }
        .wc-pool-label { font-size: 0.65rem; color: #64748b; letter-spacing: 1px; }
        .wc-pool-bet {
          font-size: 0.6rem; color: #fbbf24;
          background: rgba(245, 158, 11, 0.15);
          padding: 2px 10px; border-radius: 10px;
          margin-top: 4px;
        }
        .wc-pool-vs {
          display: flex; flex-direction: column; align-items: center;
          gap: 2px; font-weight: 800; font-size: 1.1rem;
          color: #475569; min-width: 40px;
        }
        .wc-pool-vs-sub { font-size: 0.55rem; color: #334155; }
        .wc-pool-clock {
          text-align: center; font-size: 0.8rem;
          margin-top: 14px; color: #94a3b8;
          font-family: monospace;
        }
        .wc-pool-closed { color: #ef4444; }

        /* ── Event Feed ── */
        .wc-feed {
          background: linear-gradient(135deg, #1a1a3e, #0f172a);
          border: 1px solid #334155;
          border-radius: 16px; padding: 16px;
          max-height: 350px; overflow-y: auto;
        }
        .wc-feed-title { margin: 0 0 12px; font-size: 0.9rem; color: #e2e8f0; }
        .wc-feed-empty { color: #64748b; text-align: center; padding: 20px; font-size: 0.85rem; }
        .wc-events { display: flex; flex-direction: column; gap: 4px; }
        .wc-ev {
          display: flex; align-items: center; gap: 8px;
          padding: 6px 10px; border-radius: 8px; font-size: 0.8rem;
        }
        .wc-ev-home { background: rgba(37, 99, 235, 0.1); }
        .wc-ev-away { background: rgba(220, 38, 38, 0.1); flex-direction: row-reverse; }
        .wc-ev-min { color: #64748b; font-family: monospace; font-size: 0.75rem; min-width: 28px; }
        .wc-ev-icon { font-size: 0.9rem; }
        .wc-ev-type { color: #e2e8f0; font-weight: 600; font-size: 0.7rem; text-transform: uppercase; }
        .wc-ev-player { color: #94a3b8; font-size: 0.75rem; }
        .wc-ev-team { color: #475569; font-size: 0.65rem; margin-left: auto; }
        .wc-ev-away .wc-ev-team { margin-left: 0; margin-right: auto; }

        /* ── Footer ── */
        .app-footer {
          text-align: center;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #1e293b;
          font-size: 0.75rem;
          color: #475569;
        }
        .app-footer a {
          color: #f59e0b;
          text-decoration: none;
        }
        .app-footer a:hover { text-decoration: underline; }
        .footer-twitter { margin-top: 4px; }
      `}</style>
    </main>
  );
}
