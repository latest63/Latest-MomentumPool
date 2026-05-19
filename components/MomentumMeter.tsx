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

/* ─── Event config ─── */
const EVENT_ICONS: Record<string, string> = {
  goal: '⚽', woodwork: '💥', shot_on_target: '🎯',
  corner: '🚩', foul: '🟨', yellow_card: '🟨', red_card: '🟥',
};

const EVENT_LABELS: Record<string, string> = {
  goal: 'GOAL', woodwork: 'WOODWORK', shot_on_target: 'SHOT',
  corner: 'CORNER', foul: 'FOUL', yellow_card: 'YELLOW', red_card: 'RED',
};

/* ════════════════════════════════════ MOMENTUM BAR ════════════════════════════════════ */
interface MomentumBarProps {
  data: MomentumData | null;
  loading?: boolean;
}

export function MomentumBar({ data, loading }: MomentumBarProps) {
  if (loading) {
    return (
      <div className="wc-bar wc-skeleton" style={{ padding: 0 }}>
        <div className="wc-skel-bar" />
      </div>
    );
  }
  if (!data) {
    return <div className="wc-bar wc-empty">⏳ Waiting for kickoff...</div>;
  }

  const total = Math.abs(data.homeScore) + Math.abs(data.awayScore) || 1;
  const homePct = (data.homeScore / total) * 100 || 50;

  return (
    <div className="wc-bar">
      <div className="wc-teams">
        <div className="wc-left">
          <span className="wc-name">{data.homeTeam}</span>
          <span className="wc-score">{data.homeScore}</span>
        </div>
        <span className="wc-half-badge">{data.half} HALF</span>
        <div className="wc-right">
          <span className="wc-score">{data.awayScore}</span>
          <span className="wc-name">{data.awayTeam}</span>
        </div>
      </div>
      <div className="wc-track">
        <div className="wc-fill" style={{ width: `${homePct}%` }} />
        <div className="wc-fill wc-fill-away" style={{ width: `${100 - homePct}%` }} />
        <div className="wc-divider" />
      </div>
      <div className="wc-dom">
        {data.homeScore > data.awayScore
          ? `${data.homeTeam} Leading`
          : data.awayScore > data.homeScore
            ? `${data.awayTeam} Leading`
            : 'Level'}
      </div>
    </div>
  );
}

/* ════════════════════════════════════ EVENT FEED ════════════════════════════════════ */
interface EventFeedProps {
  events: EventItem[];
  homeTeam: string;
  awayTeam: string;
}

export function EventFeed({ events, homeTeam, awayTeam }: EventFeedProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollTo(0, 0); }, [events.length]);

  return (
    <div className="wc-feed" ref={ref}>
      <h3 className="wc-feed-title">
        Events
        {events.length > 0 && <span className="feed-live">LIVE</span>}
      </h3>
      {events.length === 0 ? (
        <p className="wc-feed-empty">No events yet — match action incoming</p>
      ) : (
        <div className="wc-events">
          {events.map((ev, i) => {
            const home = ev.team === 'home';
            return (
              <div key={`${ev.minute}-${i}`} className={`wc-ev ${home ? '' : 'wc-ev-away'}`}>
                <span className="wc-ev-min">{ev.minute}&apos;</span>
                <span className="wc-ev-icon">{EVENT_ICONS[ev.type] || '•'}</span>
                <span className="wc-ev-type">{EVENT_LABELS[ev.type] || ev.type}</span>
                {ev.player && <span className="wc-ev-player">{ev.player}</span>}
                <span className="wc-ev-team">{home ? homeTeam : awayTeam}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════ POOL CARD ════════════════════════════════════ */
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
    <div className="wc-pool">
      <div className="wc-pool-header">
        <h3>Deposit Pool</h3>
        <span className="wc-pool-half">1ST HALF</span>
      </div>
      <div className="wc-pool-teams">
        <button className="wc-pool-btn" disabled={!isOpen} onClick={() => onDeposit(matchId, 0)}>
          <div className="btn-content">
            <span className="wc-pool-name">{homeTeam}</span>
            <span className="wc-pool-label">Home</span>
            {isOpen && <span className="wc-pool-bet">PLACE BET</span>}
          </div>
        </button>
        <div className="wc-pool-vs">
          <span>VS</span>
          <span className="wc-pool-vs-sub">2% Fee</span>
        </div>
        <button className="wc-pool-btn" disabled={!isOpen} onClick={() => onDeposit(matchId, 1)}>
          <div className="btn-content">
            <span className="wc-pool-name">{awayTeam}</span>
            <span className="wc-pool-label">Away</span>
            {isOpen && <span className="wc-pool-bet">PLACE BET</span>}
          </div>
        </button>
      </div>
      {isOpen ? (
        <div className="wc-pool-clock">
          Deposit closes in {Math.floor(timeLeft / 60)}m {timeLeft % 60}s
        </div>
      ) : (
        <div className="wc-pool-clock wc-pool-closed">Pool closed — awaiting settlement</div>
      )}
    </div>
  );
}
