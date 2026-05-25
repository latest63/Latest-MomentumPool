'use client';

import { useRef, useEffect, useState, useLayoutEffect } from 'react';

interface MatchSummary { matchId: string; homeTeam: string; awayTeam: string; venue?: string; }

interface Props {
  matches: MatchSummary[];
  selected: string;
  flags: Record<string, string>;
  logos: Record<string, string>;
  onSelect: (id: string) => void;
}

export default function MatchCarousel({ matches, selected, flags, logos, onSelect }: Props) {
const CARD_W = 160;
const GAP = 20;
const MOBILE_BP = 768;

function calcOffset(wrap: HTMLDivElement | null, idx: number): number {
  if (!wrap || idx < 0) return 0;
  const firstCard = wrap.querySelector('.mc-card') as HTMLElement | null;
  const actualW = firstCard?.offsetWidth ?? CARD_W;
  const step = actualW + GAP;
  return wrap.offsetWidth / 2 - actualW / 2 - idx * step;
}
  const [isMobile, setIsMobile] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  const selectedIdx = matches.findIndex(m => m.matchId === selected);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BP);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useLayoutEffect(() => {
    if (!isMobile) return;
    setOffset(calcOffset(wrapRef.current, selectedIdx));
  }, [selectedIdx, isMobile]);

  useEffect(() => {
    if (!isMobile) return;
    const onResize = () => setOffset(calcOffset(wrapRef.current, selectedIdx));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [selectedIdx, isMobile]);

  const goNext = () => {
    const next = Math.min(selectedIdx + 1, matches.length - 1);
    if (next !== selectedIdx) onSelect(matches[next].matchId);
  };

  const goPrev = () => {
    const prev = Math.max(selectedIdx - 1, 0);
    if (prev !== selectedIdx) onSelect(matches[prev].matchId);
  };

  const atStart = selectedIdx <= 0;
  const atEnd = selectedIdx >= matches.length - 1;

  // ─── Desktop: simple horizontal tabs ───
  if (!isMobile) {
    return (
      <div className="match-tabs">
        {matches.map(m => (
          <button
            key={m.matchId}
            className={`match-tab ${selected === m.matchId ? 'active' : ''}`}
            onClick={() => onSelect(m.matchId)}
          >
            <div className="tab-team-row">
              {logos[m.homeTeam] ? <img src={logos[m.homeTeam]} alt="" className="tab-logo" /> : <span className="flag-emoji">{flags[m.homeTeam] || '🏳️'}</span>}
              <span>{m.homeTeam}</span>
            </div>
            <div className="tab-vs-label">vs</div>
            <div className="tab-team-row">
              {logos[m.awayTeam] ? <img src={logos[m.awayTeam]} alt="" className="tab-logo" /> : <span className="flag-emoji">{flags[m.awayTeam] || '🏳️'}</span>}
              <span>{m.awayTeam}</span>
            </div>
            <small>{m.venue || 'WC 2026'}</small>
          </button>
        ))}
      </div>
    );
  }

  // ─── Mobile: game-style carousel ───
  return (
    <div className="mc-wrap" ref={wrapRef}>
      <div
        className="mc-track"
        style={{ transform: `translateX(${offset}px)` }}
      >
        {matches.map((m, i) => (
          <button
            key={m.matchId}
            className={`mc-card ${i === selectedIdx ? 'active' : ''}`}
            onClick={() => onSelect(m.matchId)}
          >
            <div className="mc-flags">
              {logos[m.homeTeam] ? <img src={logos[m.homeTeam]} alt="" className="mc-logo" /> : <span className="flag-emoji">{flags[m.homeTeam] || '🏳️'}</span>}
              {logos[m.awayTeam] ? <img src={logos[m.awayTeam]} alt="" className="mc-logo" /> : <span className="flag-emoji">{flags[m.awayTeam] || '🏳️'}</span>}
            </div>
            <div className="mc-teams">
              <span className="mc-team">{m.homeTeam}</span>
              <span className="mc-vs">VS</span>
              <span className="mc-team">{m.awayTeam}</span>
            </div>
            <small>{m.venue || 'WC 2026'}</small>
          </button>
        ))}
      </div>

      <button
        className={`mc-arrow mc-arrow-left ${atStart ? 'disabled' : ''}`}
        onClick={goPrev}
        disabled={atStart}
        aria-label="Previous match"
      >
        ‹
      </button>
      <button
        className={`mc-arrow mc-arrow-right ${atEnd ? 'disabled' : ''}`}
        onClick={goNext}
        disabled={atEnd}
        aria-label="Next match"
      >
        ›
      </button>
    </div>
  );
}
