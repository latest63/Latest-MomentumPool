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

export default function Home() {
  const [matches, setMatches] = useState<{ matchId: string; homeTeam: string; awayTeam: string }[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [momentum, setMomentum] = useState<MomentumData | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Register example matches on mount
  useEffect(() => {
    fetch('/api/matches')
      .then((r) => r.json())
      .then((data) => setMatches(data.matches || []))
      .catch(() => {
        // Fallback — register matches inline if API is empty
        const defaults = [
          { matchId: '12345', homeTeam: 'Nigeria', awayTeam: 'Brazil' },
          { matchId: '12346', homeTeam: 'Argentina', awayTeam: 'Germany' },
        ];
        setMatches(defaults);
        setSelected(defaults[0].matchId);
      })
      .finally(() => setLoading(false));
  }, []);

  // Auto-select first match
  useEffect(() => {
    if (matches.length > 0 && !selected) {
      setSelected(matches[0].matchId);
    }
  }, [matches, selected]);

  // Poll momentum + events every 15s
  useEffect(() => {
    if (!selected) return;

    const fetchData = async () => {
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
      } catch {
        // silent
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 15_000);
    return () => clearInterval(interval);
  }, [selected]);

  const selectedMatch = matches.find((m) => m.matchId === selected);

  const handleDeposit = async (_matchId: string, _teamId: number) => {
    // TODO: wagmi writeContract → MomentumPool.deposit(teamId)
    console.log(`[Deposit] match=${_matchId} team=${_teamId}`);
  };

  if (loading) {
    return (
      <main className="app-shell">
        <div className="loading">Loading matches...</div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>⚡ Momentum Pool</h1>
        <p>Pick the dominant team in each half</p>
      </header>

      {/* Match selector */}
      <div className="match-tabs">
        {matches.map((m) => (
          <button
            key={m.matchId}
            className={`match-tab ${selected === m.matchId ? 'active' : ''}`}
            onClick={() => setSelected(m.matchId)}
          >
            {m.homeTeam} vs {m.awayTeam}
          </button>
        ))}
      </div>

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

      <style>{`
        .app-shell {
          min-height: 100vh;
          background: #0f172a;
          color: #e2e8f0;
          max-width: 640px;
          margin: 0 auto;
          padding: 20px;
        }
        .app-header {
          padding-bottom: 16px;
          border-bottom: 1px solid #1e293b;
          margin-bottom: 20px;
        }
        .app-header h1 {
          margin: 0;
          font-size: 1.5rem;
        }
        .app-header p {
          margin: 4px 0 0;
          color: #94a3b8;
          font-size: 0.85rem;
        }
        .match-tabs {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          margin-bottom: 20px;
          padding-bottom: 4px;
        }
        .match-tab {
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid #334155;
          background: transparent;
          color: #94a3b8;
          cursor: pointer;
          white-space: nowrap;
          font-size: 0.85rem;
          transition: all 0.2s;
        }
        .match-tab.active {
          background: #6366f1;
          color: #fff;
          border-color: #6366f1;
        }
        .match-tab:hover:not(.active) {
          border-color: #6366f1;
          color: #e2e8f0;
        }
        .match-view {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .loading {
          text-align: center;
          padding: 60px;
          color: #64748b;
        }
      `}</style>
    </main>
  );
}
