'use client';

import { useEffect, useState, useRef } from 'react';

/* ─── Types ─── */

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

/* ─── Icons per event type ─── */

const EVENT_ICONS: Record<string, string> = {
  goal: '⚽',
  woodwork: '💥',
  shot_on_target: '🎯',
  corner: '🚩',
  foul: '🟨',
  yellow_card: '🟨',
  red_card: '🟥',
};

const EVENT_LABELS: Record<string, string> = {
  goal: 'GOAL',
  woodwork: 'WOODWORK',
  shot_on_target: 'SHOT',
  corner: 'CORNER',
  foul: 'FOUL',
  yellow_card: 'YELLOW',
  red_card: 'RED',
};

/* ─── Color config per team ─── */

const TEAM_COLORS: Record<string, { primary: string; secondary: string }> = {
  // Add team colors here — fallback below
};

function getTeamColor(team: string, side: 'primary' | 'secondary'): string {
  return TEAM_COLORS[team]?.[side] || (side === 'primary' ? '#6366f1' : '#a5b4fc');
}

/* ══════════════════════════ MOMENTUM BAR ══════════════════════════ */

interface MomentumBarProps {
  data: MomentumData | null;
  loading?: boolean;
}

export function MomentumBar({ data, loading }: MomentumBarProps) {
  if (loading) {
    return (
      <div className="momentum-skeleton">
        <div className="skeleton-bar" />
      </div>
    );
  }

  if (!data) {
    return <div className="momentum-empty">Waiting for kickoff...</div>;
  }

  const total = Math.abs(data.homeScore) + Math.abs(data.awayScore) || 1;
  const homePct = (data.homeScore / (data.homeScore + data.awayScore)) * 100 || 50;
  const awayPct = 100 - homePct;
  const homeColor = getTeamColor(data.homeTeam, 'primary');
  const awayColor = getTeamColor(data.awayTeam, 'primary');

  return (
    <div className="momentum-bar-container">
      {/* Team labels */}
      <div className="momentum-teams">
        <div className="team-left">
          <span className="team-name">{data.homeTeam}</span>
          <span className="team-score">{data.homeScore}</span>
        </div>
        <div className="half-badge">{data.half}</div>
        <div className="team-right">
          <span className="team-score">{data.awayScore}</span>
          <span className="team-name">{data.awayTeam}</span>
        </div>
      </div>

      {/* The bar */}
      <div className="momentum-bar-track">
        <div
          className="momentum-bar-fill momentum-bar-home"
          style={{ width: `${homePct}%`, backgroundColor: homeColor }}
        />
        <div
          className="momentum-bar-fill momentum-bar-away"
          style={{ width: `${awayPct}%`, backgroundColor: awayColor }}
        />
        {/* Center divider */}
        <div className="momentum-bar-center" />
      </div>

      {/* Dominance label */}
      <div className="momentum-dominance">
        {data.homeScore > data.awayScore
          ? `${data.homeTeam} dominating`
          : data.awayScore > data.homeScore
          ? `${data.awayTeam} dominating`
          : 'Dead even'}
      </div>
    </div>
  );
}

/* ══════════════════════════ EVENT FEED ══════════════════════════ */

interface EventFeedProps {
  events: EventItem[];
  homeTeam: string;
  awayTeam: string;
}

export function EventFeed({ events, homeTeam, awayTeam }: EventFeedProps) {
  const feedRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top (newest first)
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [events.length]);

  return (
    <div className="event-feed" ref={feedRef}>
      <h3 className="event-feed-title">📊 Live Event Feed</h3>
      {events.length === 0 ? (
        <p className="event-feed-empty">No events yet — match hasn't started</p>
      ) : (
        <div className="event-list">
          {events.map((ev, i) => {
            const isHome = ev.team === 'home';
            return (
              <div
                key={`${ev.minute}-${i}`}
                className={`event-item ${isHome ? 'event-home' : 'event-away'}`}
              >
                <span className="event-minute">{ev.minute}&apos;</span>
                <span className="event-icon">{EVENT_ICONS[ev.type] || '•'}</span>
                <span className="event-label">{EVENT_LABELS[ev.type] || ev.type}</span>
                {ev.player && <span className="event-player">{ev.player}</span>}
                <span className="event-team">{isHome ? homeTeam : awayTeam}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════ POOL CARD ══════════════════════════ */

interface PoolCardProps {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  poolAddress?: string;
  depositDeadline?: number;
  halfEnd?: number;
  onDeposit: (matchId: string, teamId: number) => void;
}

export function PoolCard({
  matchId,
  homeTeam,
  awayTeam,
  depositDeadline,
  onDeposit,
}: PoolCardProps) {
  const now = Math.floor(Date.now() / 1000);
  const isOpen = depositDeadline ? now < depositDeadline : false;
  const timeLeft = depositDeadline ? depositDeadline - now : 0;

  return (
    <div className="pool-card">
      <div className="pool-teams">
        <button
          className="pool-team-btn pool-team-home"
          disabled={!isOpen}
          onClick={() => onDeposit(matchId, 0)}
        >
          <span className="pool-team-name">{homeTeam}</span>
          <span className="pool-team-label">HOME</span>
        </button>
        <div className="pool-vs">VS</div>
        <button
          className="pool-team-btn pool-team-away"
          disabled={!isOpen}
          onClick={() => onDeposit(matchId, 1)}
        >
          <span className="pool-team-name">{awayTeam}</span>
          <span className="pool-team-label">AWAY</span>
        </button>
      </div>
      {isOpen ? (
        <div className="pool-countdown">
          Deposit closes in {Math.floor(timeLeft / 60)}m {timeLeft % 60}s
        </div>
      ) : (
        <div className="pool-closed">Deposit closed</div>
      )}
    </div>
  );
}

/* ══════════════════════════ LIVE PAGE (composed) ══════════════════════════ */

interface LiveMatchPageProps {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
}

export function LiveMatchPage({ matchId, homeTeam, awayTeam }: LiveMatchPageProps) {
  const [momentum, setMomentum] = useState<MomentumData | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

  // Poll momentum every 15s
  useEffect(() => {
    const fetchMomentum = async () => {
      try {
        const res = await fetch(`${BACKEND}/api/match/${matchId}/momentum`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setMomentum(data);
        setError(null);
      } catch (err) {
        setError((err as Error).message);
      }
    };

    const fetchEvents = async () => {
      try {
        const res = await fetch(`${BACKEND}/api/match/${matchId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setEvents(data.recentEvents || []);
      } catch {
        // Silent — momentum is the critical path
      }
    };

    fetchMomentum();
    fetchEvents();
    const interval = setInterval(() => {
      fetchMomentum();
      fetchEvents();
    }, 15_000);

    return () => clearInterval(interval);
  }, [matchId, BACKEND]);

  const handleDeposit = async (matchId: string, teamId: number) => {
    // TODO: wagmi writeContract → MomentumPool.deposit(teamId)
    console.log(`[Deposit] match=${matchId} team=${teamId}`);
  };

  return (
    <div className="live-match-page">
      <MomentumBar data={momentum} loading={!momentum && !error} />

      {error && <div className="error-banner">⚠️ {error}</div>}

      <PoolCard
        matchId={matchId}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        onDeposit={handleDeposit}
      />

      <EventFeed events={events} homeTeam={homeTeam} awayTeam={awayTeam} />
    </div>
  );
}

/* ══════════════════════════ CSS ══════════════════════════ */

const styles = `
.momentum-bar-container {
  background: #1a1a2e;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
}

.momentum-teams {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.team-left, .team-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.team-right { flex-direction: row-reverse; }

.team-name {
  font-weight: 700;
  font-size: 1.1rem;
  color: #e2e8f0;
}

.team-score {
  font-size: 2rem;
  font-weight: 800;
  color: #f8fafc;
  min-width: 40px;
  text-align: center;
}

.half-badge {
  background: #334155;
  color: #94a3b8;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.momentum-bar-track {
  position: relative;
  height: 32px;
  border-radius: 16px;
  overflow: hidden;
  background: #0f172a;
  display: flex;
}

.momentum-bar-fill {
  height: 100%;
  transition: width 0.5s ease-out;
}

.momentum-bar-home {
  border-radius: 16px 0 0 16px;
}

.momentum-bar-away {
  border-radius: 0 16px 16px 0;
}

.momentum-bar-center {
  position: absolute;
  left: 50%;
  top: 0;
  width: 3px;
  height: 100%;
  background: #f8fafc;
  transform: translateX(-50%);
  z-index: 2;
}

.momentum-dominance {
  text-align: center;
  font-size: 0.85rem;
  color: #94a3b8;
  margin-top: 12px;
  font-style: italic;
}

.momentum-skeleton .skeleton-bar {
  height: 32px;
  border-radius: 16px;
  background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.momentum-empty {
  text-align: center;
  color: #64748b;
  padding: 40px;
  font-size: 1.1rem;
}

/* Event Feed */
.event-feed {
  background: #1a1a2e;
  border-radius: 16px;
  padding: 20px;
  max-height: 400px;
  overflow-y: auto;
  margin-top: 20px;
}

.event-feed-title {
  margin: 0 0 12px;
  font-size: 1rem;
  color: #e2e8f0;
}

.event-feed-empty {
  color: #64748b;
  text-align: center;
  padding: 20px;
}

.event-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.event-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.9rem;
}

.event-home { background: rgba(99, 102, 241, 0.1); }
.event-away { background: rgba(239, 68, 68, 0.1); flex-direction: row-reverse; }

.event-minute {
  color: #64748b;
  font-family: monospace;
  font-size: 0.8rem;
  min-width: 32px;
}

.event-icon { font-size: 1rem; }

.event-label {
  color: #e2e8f0;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.8rem;
}

.event-player { color: #94a3b8; font-size: 0.85rem; }

.event-team {
  color: #64748b;
  font-size: 0.75rem;
  margin-left: auto;
}

.event-away .event-team { margin-left: 0; margin-right: auto; }

/* Pool Card */
.pool-card {
  background: #1a1a2e;
  border-radius: 16px;
  padding: 24px;
  margin: 20px 0;
}

.pool-teams {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.pool-team-btn {
  flex: 1;
  padding: 20px;
  border-radius: 12px;
  border: 2px solid #334155;
  background: transparent;
  color: #e2e8f0;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.pool-team-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pool-team-btn:not(:disabled):hover {
  border-color: #6366f1;
  background: rgba(99, 102, 241, 0.1);
}

.pool-team-name { font-size: 1.2rem; font-weight: 700; }

.pool-team-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #64748b;
}

.pool-vs {
  font-weight: 800;
  font-size: 1.5rem;
  color: #475569;
}

.pool-countdown {
  text-align: center;
  color: #f59e0b;
  font-family: monospace;
  font-size: 0.9rem;
  margin-top: 16px;
}

.pool-closed {
  text-align: center;
  color: #64748b;
  margin-top: 16px;
}

.error-banner {
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
  text-align: center;
  font-size: 0.85rem;
}

.live-match-page {
  max-width: 640px;
  margin: 0 auto;
  padding: 20px;
}
`;

// Inject CSS once
if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);
}
