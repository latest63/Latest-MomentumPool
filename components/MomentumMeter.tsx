'use client';

import { useEffect, useRef, useState } from 'react';

/* ─── Types ─── */
export interface MomentumData {
  homeScore: number;   // points
  awayScore: number;
  homeGoals: number;   // actual goal count
  awayGoals: number;
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
  homeTeam?: string;
  awayTeam?: string;
  actualHomeScore?: number;
  actualAwayScore?: number;
}

export function MomentumBar({ data, loading, homeTeam = '', awayTeam = '', actualHomeScore, actualAwayScore }: MomentumBarProps) {
  if (loading) {
    return (
      <div className="wc-bar wc-skeleton" style={{ padding: 0 }}>
        <div className="wc-skel-bar" />
      </div>
    );
  }

  // When no live data, show a default 50/50 bar with team names
  const displayHome = data?.homeTeam || homeTeam;
  const displayAway = data?.awayTeam || awayTeam;
  if (!data) {
    return (
      <div className="wc-bar">
        <div className="wc-teams">
          <div className="wc-left">
            <span className="wc-name">{displayHome}</span>
            <span className="wc-score">0</span>
          </div>
          <span className="wc-half-badge">1ST HALF</span>
          <div className="wc-right">
            <span className="wc-score">0</span>
            <span className="wc-name">{displayAway}</span>
          </div>
        </div>
        <div className="wc-track">
          <div className="wc-fill" style={{ width: '50%' }} />
          <div className="wc-fill wc-fill-away" style={{ width: '50%' }} />
          <div className="wc-divider" />
        </div>
        <div className="wc-dom">Level — awaiting kickoff</div>
      </div>
    );
  }

  const displayHomeScore = actualHomeScore ?? data.homeScore;
  const displayAwayScore = actualAwayScore ?? data.awayScore;
  const homeGoals = actualHomeScore !== undefined ? Math.floor(actualHomeScore / 3) : data.homeGoals;
  const awayGoals = actualAwayScore !== undefined ? Math.floor(actualAwayScore / 3) : data.awayGoals;
  const total = Math.abs(displayHomeScore) + Math.abs(displayAwayScore) || 1;
  const homePct = (displayHomeScore / total) * 100 || 50;
  const showActual = actualHomeScore !== undefined && actualAwayScore !== undefined;

  return (
    <div className="wc-bar">
      <div className="wc-teams">
        <div className="wc-left">
          <span className="wc-name">{data.homeTeam}</span>
          <span className="wc-score">{showActual ? homeGoals : data.homeGoals}</span>
        </div>
        <span className="wc-half-badge">{data.half} HALF</span>
        <div className="wc-right">
          <span className="wc-score">{showActual ? awayGoals : data.awayGoals}</span>
          <span className="wc-name">{data.awayTeam}</span>
        </div>
      </div>
      <div className="wc-points">
        <span>{displayHomeScore} pts</span>
        <span>{displayAwayScore} pts</span>
      </div>
      <div className="wc-track">
        <div className="wc-fill" style={{ width: `${homePct}%` }} />
        <div className="wc-fill wc-fill-away" style={{ width: `${100 - homePct}%` }} />
        <div className="wc-divider" />
      </div>
      <div className="wc-dom">
        {homeGoals > awayGoals
          ? `${data.homeTeam} Leading`
          : awayGoals > homeGoals
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
  kickoff?: number;
  onDeposit: (matchId: string, teamId: number, amount: string) => void;
}

const DEPOSIT_WINDOW = 3600; // 1 hour before kickoff

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

export function PoolCard({ matchId, homeTeam, awayTeam, kickoff, onDeposit }: PoolCardProps) {
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const [amount, setAmount] = useState('0.001');

  useEffect(() => {
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  const depositOpensAt = kickoff ? kickoff - DEPOSIT_WINDOW : 0;
  const depositClosesAt = kickoff || 0;

  let phase: 'pre' | 'open' | 'closed';
  if (!kickoff || now < depositOpensAt) phase = 'pre';
  else if (now < depositClosesAt) phase = 'open';
  else phase = 'closed';

  const isOpen = phase === 'open';

  return (
    <div className="wc-pool">
      <div className="wc-pool-header">
        <h3>Deposit Pool</h3>
        <span className="wc-pool-half">1ST HALF</span>
      </div>
      <div className="wc-pool-amount">
        <label className="wc-amount-label">Amount (OKB)</label>
        <input
          type="number"
          className="wc-amount-input"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          min="0.0001"
          step="0.001"
          placeholder="0.001"
        />
      </div>
      <div className="wc-pool-teams">
        <button className="wc-pool-btn" disabled={!isOpen} onClick={() => onDeposit(matchId, 0, amount)}>
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
        <button className="wc-pool-btn" disabled={!isOpen} onClick={() => onDeposit(matchId, 1, amount)}>
          <div className="btn-content">
            <span className="wc-pool-name">{awayTeam}</span>
            <span className="wc-pool-label">Away</span>
            {isOpen && <span className="wc-pool-bet">PLACE BET</span>}
          </div>
        </button>
      </div>
      {phase === 'pre' && kickoff ? (
        <div className="wc-pool-clock">
          Deposit starts in {formatCountdown(depositOpensAt - now)}
        </div>
      ) : phase === 'open' && kickoff ? (
        <div className="wc-pool-clock wc-pool-open">
          Deposit closes in {formatCountdown(depositClosesAt - now)}
        </div>
      ) : (
        <div className="wc-pool-clock wc-pool-closed">Pool closed — awaiting settlement</div>
      )}
    </div>
  );
}
