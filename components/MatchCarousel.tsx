'use client';

import { useRef, useEffect, useState, useLayoutEffect } from 'react';

interface MatchSummary { matchId: string; homeTeam: string; awayTeam: string; venue?: string; }

interface Props {
  matches: MatchSummary[];
  selected: string;
  flags: Record<string, string>;
  onSelect: (id: string) => void;
}

const CARD_W = 160;
const GAP = 20;

function calcOffset(wrap: HTMLDivElement | null, idx: number): number {
  if (!wrap || idx < 0) return 0;
  const firstCard = wrap.querySelector('.mc-card') as HTMLElement | null;
  const actualW = firstCard?.offsetWidth ?? CARD_W;
  const step = actualW + GAP;
  return wrap.offsetWidth / 2 - actualW / 2 - idx * step;
}

export default function MatchCarousel({ matches, selected, flags, onSelect }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  const selectedIdx = matches.findIndex(m => m.matchId === selected);

  // Calculate before paint so there's no flash
  useLayoutEffect(() => {
    setOffset(calcOffset(wrapRef.current, selectedIdx));
  }, [selectedIdx]);

  // Re-center on resize
  useEffect(() => {
    const onResize = () => setOffset(calcOffset(wrapRef.current, selectedIdx));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [selectedIdx]);

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
              <span className="flag-emoji">{flags[m.homeTeam] || '🏳️'}</span>
              <span className="flag-emoji">{flags[m.awayTeam] || '🏳️'}</span>
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
