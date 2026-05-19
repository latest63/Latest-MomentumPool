'use client';

import { useEffect, useState } from 'react';
import { MomentumBar, EventFeed, PoolCard } from '@/components/MomentumMeter';
import { WORLD_CUP_MATCHES } from '@/lib/momentum';

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
  host?: string;
}

const FLAGS: Record<string, string> = {
  USA: '🇺🇸',
  Canada: '🇨🇦',
  Mexico: '🇲🇽',
  Brazil: '🇧🇷',
  Nigeria: '🇳🇬',
  Ghana: '🇬🇭',
  Argentina: '🇦🇷',
  Japan: '🇯🇵',
};

export default function Home() {
  const fallbackMatches = WORLD_CUP_MATCHES.map((m) => ({
    matchId: m.matchId,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    venue: m.venue,
    host: m.host,
  }));

  const [matches, setMatches] = useState<MatchSummary[]>(fallbackMatches);
  const [selected, setSelected] = useState(fallbackMatches[0].matchId);
  const [momentum, setMomentum] = useState<MomentumData | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);

  useEffect(() => {
    fetch('/api/matches')
      .then((r) => r.json())
      .then((data) => {
        if (data.matches?.length) setMatches(data.matches);
      })
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
      <section className="wc-hero">
        <div className="wc-pattern" />
        <img className="brand-logo" src="/assets/logo.svg" alt="Momentum Pool logo" />
        <div className="wc-kicker">WE ARE 26</div>
        <div className="wc26-mark">
          <span>2</span><span>6</span>
        </div>
        <h1>Momentum Pool</h1>
        <p>World Cup 2026 energy. Pick the team controlling the half — built on X Layer.</p>
        <div className="host-row">
          <span>WE ARE 26</span>
          <span>🇺🇸 USA</span>
          <span>🇨🇦 CANADA</span>
          <span>🇲🇽 MEXICO</span>
        </div>
      </section>

      <section className="xlayer-strip">
        <span>⚡ X Layer native</span>
        <span>WE ARE 26 theme</span>
        <span>Half-time settlement</span>
        <span>No prediction market</span>
      </section>

      <div className="match-tabs">
        {matches.map((m) => (
          <button
            key={m.matchId}
            className={`match-tab ${selected === m.matchId ? 'active' : ''}`}
            onClick={() => setSelected(m.matchId)}
          >
            <div className="tab-teams">
              <span>{FLAGS[m.homeTeam] || '🏳️'} {m.homeTeam}</span>
              <span className="tab-vs">vs</span>
              <span>{FLAGS[m.awayTeam] || '🏳️'} {m.awayTeam}</span>
            </div>
            <small>{m.venue || 'World Cup 2026'}</small>
          </button>
        ))}
      </div>

      {selectedMatch && (
        <div className="match-view">
          <div className="match-title">
            <span>{FLAGS[selectedMatch.homeTeam] || '🏳️'} {selectedMatch.homeTeam}</span>
            <b>VS</b>
            <span>{FLAGS[selectedMatch.awayTeam] || '🏳️'} {selectedMatch.awayTeam}</span>
          </div>
          <MomentumBar data={momentum} loading={!momentum} />
          <PoolCard
            matchId={selectedMatch.matchId}
            homeTeam={selectedMatch.homeTeam}
            awayTeam={selectedMatch.awayTeam}
            onDeposit={handleDeposit}
          />
          <EventFeed events={events} homeTeam={selectedMatch.homeTeam} awayTeam={selectedMatch.awayTeam} />
        </div>
      )}

      <footer className="app-footer">
        <p>2026 World Cup theme • Built on X Layer • OKX Build-X Hackathon</p>
        <p><a href="https://x.com/XLayerOfficial" target="_blank" rel="noopener">@XLayerOfficial</a> • #BuildX • #XLayer</p>
      </footer>

      <style>{`
        :root {
          --wc-black: #030303;
          --wc-white: #f7f7f2;
          --wc-blue: #0047ff;
          --wc-red: #e4162b;
          --wc-green: #00a651;
          --wc-yellow: #ffce00;
          --wc-cyan: #00b7ff;
        }
        .app-shell {
          min-height: 100vh;
          background:
            radial-gradient(circle at 15% 8%, rgba(0, 71, 255, 0.18), transparent 30%),
            radial-gradient(circle at 85% 12%, rgba(228, 22, 43, 0.16), transparent 28%),
            radial-gradient(circle at 50% 100%, rgba(0, 166, 81, 0.14), transparent 35%),
            #050505;
          color: var(--wc-white);
          max-width: 680px;
          margin: 0 auto;
          padding: 0 18px 40px;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .wc-hero {
          position: relative;
          overflow: hidden;
          text-align: center;
          padding: 36px 18px 24px;
          border-radius: 0 0 28px 28px;
          background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.01));
          border: 1px solid rgba(255,255,255,0.08);
          border-top: 0;
        }
        .wc-pattern {
          position: absolute;
          inset: 0;
          opacity: 0.25;
          background:
            linear-gradient(135deg, transparent 0 18%, var(--wc-blue) 18% 22%, transparent 22% 38%, var(--wc-red) 38% 42%, transparent 42% 58%, var(--wc-green) 58% 62%, transparent 62%),
            repeating-linear-gradient(90deg, transparent 0 24px, rgba(255,255,255,0.08) 24px 26px);
          pointer-events: none;
        }
        .brand-logo {
          position: relative;
          width: 86px;
          height: 86px;
          border-radius: 22px;
          margin-bottom: 12px;
          box-shadow: 0 18px 50px rgba(0,0,0,.35);
        }
        .wc-kicker {
          position: relative;
          display: inline-block;
          color: #111;
          background: var(--wc-white);
          padding: 5px 14px;
          border-radius: 999px;
          font-size: 0.68rem;
          letter-spacing: 2px;
          font-weight: 900;
        }
        .wc26-mark {
          position: relative;
          display: flex;
          justify-content: center;
          gap: 4px;
          margin: 12px auto 4px;
          font-size: 5rem;
          line-height: 0.85;
          font-weight: 950;
          letter-spacing: -10px;
          color: var(--wc-white);
          text-shadow: 0 0 24px rgba(255,255,255,0.2);
        }
        .wc26-mark span:first-child { color: var(--wc-white); }
        .wc26-mark span:last-child {
          color: transparent;
          -webkit-text-stroke: 3px var(--wc-white);
        }
        .wc-hero h1 {
          position: relative;
          margin: 0;
          font-size: 2rem;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: -1px;
        }
        .wc-hero p {
          position: relative;
          margin: 8px auto 14px;
          color: rgba(247,247,242,0.72);
          font-size: 0.92rem;
          max-width: 420px;
        }
        .host-row {
          position: relative;
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 8px;
          font-size: 0.72rem;
          font-weight: 800;
        }
        .host-row span {
          border: 1px solid rgba(255,255,255,0.16);
          border-radius: 999px;
          padding: 5px 10px;
          background: rgba(0,0,0,0.3);
        }
        .xlayer-strip {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          margin: 14px 0;
          scrollbar-width: none;
        }
        .xlayer-strip::-webkit-scrollbar { display: none; }
        .xlayer-strip span {
          flex-shrink: 0;
          padding: 7px 10px;
          border-radius: 8px;
          color: #0b0b0b;
          font-size: 0.72rem;
          font-weight: 900;
          background: linear-gradient(90deg, var(--wc-yellow), var(--wc-cyan));
        }
        .match-tabs {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          padding: 8px 0 14px;
          scrollbar-width: none;
        }
        .match-tabs::-webkit-scrollbar { display: none; }
        .match-tab {
          min-width: 175px;
          text-align: left;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.055);
          color: var(--wc-white);
          border-radius: 16px;
          padding: 12px;
          cursor: pointer;
          transition: 0.2s ease;
        }
        .match-tab.active {
          background: var(--wc-white);
          color: #050505;
          box-shadow: 0 0 0 2px var(--wc-blue), 0 12px 30px rgba(0,71,255,0.18);
        }
        .tab-teams { display: flex; flex-direction: column; gap: 2px; font-weight: 900; font-size: 0.82rem; }
        .tab-vs { color: var(--wc-red); font-size: 0.62rem; text-transform: uppercase; }
        .match-tab small { display: block; margin-top: 8px; opacity: 0.65; font-size: 0.68rem; }
        .match-view { display: flex; flex-direction: column; gap: 14px; }
        .match-title {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
          font-weight: 950;
          font-size: 1rem;
          padding: 12px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
        }
        .match-title b { color: var(--wc-yellow); font-size: 0.75rem; }

        .wc-bar, .wc-pool, .wc-feed {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 20px;
          padding: 18px;
          backdrop-filter: blur(8px);
        }
        .wc-teams { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        .wc-left, .wc-right { display: flex; align-items: center; gap: 8px; }
        .wc-right { flex-direction: row-reverse; }
        .wc-name { font-weight: 900; font-size: 0.92rem; }
        .wc-score { font-size: 2rem; font-weight: 950; color: var(--wc-yellow); min-width: 36px; text-align: center; }
        .wc-half-badge { background: var(--wc-white); color: #050505; padding: 4px 10px; border-radius: 999px; font-size: 0.6rem; font-weight: 950; }
        .wc-track { position: relative; height: 30px; border-radius: 999px; overflow: hidden; display: flex; background: #111; }
        .wc-fill { background: linear-gradient(90deg, var(--wc-blue), var(--wc-cyan)); transition: width .5s ease; }
        .wc-fill-away { background: linear-gradient(90deg, var(--wc-red), var(--wc-yellow)); }
        .wc-divider { position: absolute; left: 50%; top: 0; width: 3px; height: 100%; background: var(--wc-white); transform: translateX(-50%); }
        .wc-marker { position: absolute; top: -8px; transform: translateX(-50%); transition: left .5s ease; }
        .wc-dom { text-align: center; margin-top: 10px; color: rgba(247,247,242,.72); font-size: .78rem; }
        .wc-empty { text-align: center; color: rgba(247,247,242,.6); padding: 30px; }
        .wc-skel-bar { height: 30px; border-radius: 999px; background: rgba(255,255,255,.12); }

        .wc-pool-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; font-weight: 950; color: var(--wc-yellow); font-size: .72rem; letter-spacing: 1px; }
        .wc-pool-half { color: #050505; background: var(--wc-white); border-radius: 999px; padding: 3px 9px; font-size: .6rem; }
        .wc-pool-teams { display: flex; align-items: center; gap: 10px; }
        .wc-pool-btn { flex: 1; border: 1px solid rgba(255,255,255,.16); background: rgba(0,0,0,.25); color: var(--wc-white); border-radius: 16px; padding: 15px 10px; cursor: pointer; display: flex; flex-direction: column; gap: 4px; align-items: center; transition: .2s; }
        .wc-pool-btn:hover { background: var(--wc-white); color: #050505; transform: translateY(-1px); }
        .wc-pool-name { font-weight: 950; }
        .wc-pool-label { font-size: .62rem; opacity: .65; }
        .wc-pool-bet { font-size: .6rem; background: var(--wc-yellow); color: #050505; padding: 2px 8px; border-radius: 999px; font-weight: 950; }
        .wc-pool-vs { min-width: 42px; text-align: center; font-weight: 950; color: var(--wc-yellow); }
        .wc-pool-vs-sub { display: block; color: rgba(247,247,242,.45); font-size: .55rem; }
        .wc-pool-clock { text-align: center; margin-top: 12px; color: rgba(247,247,242,.65); font-family: monospace; font-size: .78rem; }

        .wc-feed-title { margin: 0 0 10px; font-size: .9rem; }
        .wc-feed-empty { color: rgba(247,247,242,.55); text-align: center; padding: 18px; }
        .wc-events { display: flex; flex-direction: column; gap: 5px; }
        .wc-ev { display: flex; align-items: center; gap: 8px; padding: 7px 9px; border-radius: 10px; background: rgba(255,255,255,.06); font-size: .78rem; }
        .wc-ev-away { flex-direction: row-reverse; }
        .wc-ev-min { font-family: monospace; color: var(--wc-yellow); min-width: 28px; }
        .wc-ev-type { font-weight: 950; }
        .wc-ev-player, .wc-ev-team { color: rgba(247,247,242,.55); }
        .wc-ev-team { margin-left: auto; }
        .wc-ev-away .wc-ev-team { margin-left: 0; margin-right: auto; }

        .app-footer { text-align: center; margin-top: 34px; padding-top: 18px; border-top: 1px solid rgba(255,255,255,.1); font-size: .72rem; color: rgba(247,247,242,.55); }
        .app-footer a { color: var(--wc-yellow); text-decoration: none; }
      `}</style>
    </main>
  );
}
