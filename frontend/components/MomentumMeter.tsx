'use client';

import { useEffect, useRef } from 'react';

/* ─── Types ─── */

export interface MomentumData {
  homeScore: number;
  awayScore: number;
  homeTeam: string;
  awayTeam: string;
  half: string;
  diff: number;
}

export interface EventItem {
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

const TEAM_COLORS: Record<string, { primary: string }> = {};

function getTeamColor(team: string): string {
  return TEAM_COLORS[team]?.primary || '#6366f1';
}

/* ══════════════════════════ MOMENTUM BAR ══════════════════════════ */

interface MomentumBarProps {
  data: MomentumData | null;
  loading?: boolean;
}

export function MomentumBar({ data, loading }: MomentumBarProps) {
  if (loading) {
    return <div className="momentum-skeleton"><div className="skeleton-bar"/></div>;
  }

  if (!data) {
    return <div className="momentum-empty">Waiting for kickoff...</div>;
  }

  const total = Math.abs(data.homeScore) + Math.abs(data.awayScore) || 1;
  const homePct = ((data.homeScore / total) * 100) || 50;
  const homeColor = getTeamColor(data.homeTeam);
  const awayColor = getTeamColor(data.awayTeam);

  return (
    <div className="mom-bar">
      <div className="mom-teams">
        <div className="mom-left">
          <span className="mom-name">{data.homeTeam}</span>
          <span className="mom-score">{data.homeScore}</span>
        </div>
        <span className="mom-half">{data.half}</span>
        <div className="mom-right">
          <span className="mom-score">{data.awayScore}</span>
          <span className="mom-name">{data.awayTeam}</span>
        </div>
      </div>
      <div className="mom-track">
        <div className="mom-fill" style={{ width: `${homePct}%`, background: homeColor }} />
        <div className="mom-fill" style={{ width: `${100 - homePct}%`, background: awayColor }} />
        <div className="mom-divider" />
      </div>
      <div className="mom-label">
        {data.homeScore > data.awayScore
          ? `${data.homeTeam} dominant`
          : data.awayScore > data.homeScore
            ? `${data.awayTeam} dominant`
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

  useEffect(() => {
    feedRef.current?.scrollTo(0, 0);
  }, [events.length]);

  return (
    <div className="ev-feed" ref={feedRef}>
      <h3 className="ev-title">📊 Live Events</h3>
      {events.length === 0 ? (
        <p className="ev-empty">No events yet</p>
      ) : (
        <div className="ev-list">
          {events.map((ev, i) => {
            const home = ev.team === 'home';
            return (
              <div key={`${ev.minute}-${i}`} className={`ev-item ${home ? 'ev-home' : 'ev-away'}`}>
                <span className="ev-min">{ev.minute}&apos;</span>
                <span className="ev-icon">{EVENT_ICONS[ev.type] || '•'}</span>
                <span className="ev-type">{EVENT_LABELS[ev.type] || ev.type}</span>
                {ev.player && <span className="ev-player">{ev.player}</span>}
                <span className="ev-team">{home ? homeTeam : awayTeam}</span>
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

export function PoolCard({ matchId, homeTeam, awayTeam, depositDeadline, onDeposit }: PoolCardProps) {
  const now = Math.floor(Date.now() / 1000);
  const isOpen = depositDeadline ? now < depositDeadline : true;
  const timeLeft = depositDeadline ? depositDeadline - now : 0;

  return (
    <div className="pool-card">
      <div className="pool-vs-row">
        <button className="pool-btn" disabled={!isOpen} onClick={() => onDeposit(matchId, 0)}>
          <span className="pool-btn-name">{homeTeam}</span>
          <span className="pool-btn-label">HOME</span>
        </button>
        <div className="pool-vs">VS</div>
        <button className="pool-btn" disabled={!isOpen} onClick={() => onDeposit(matchId, 1)}>
          <span className="pool-btn-name">{awayTeam}</span>
          <span className="pool-btn-label">AWAY</span>
        </button>
      </div>
      {isOpen ? (
        <div className="pool-clock">Deposit: {Math.floor(timeLeft / 60)}m {timeLeft % 60}s</div>
      ) : (
        <div className="pool-clock closed">Deposit closed</div>
      )}
    </div>
  );
}
