'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

interface MatchSummary { matchId: string; homeTeam: string; awayTeam: string; venue?: string; }

interface Props {
  matches: MatchSummary[];
  selected: string;
  flags: Record<string, string>;
  onSelect: (id: string) => void;
}

const ITEM_W = 190;
const GAP = 16;

export default function MatchCarousel({ matches, selected, flags, onSelect }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const selectedIdx = matches.findIndex(m => m.matchId === selected);

  const calcOffset = useCallback((idx: number) => {
    const vp = viewportRef.current;
    if (!vp || idx < 0) return;
    const vw = vp.offsetWidth;
    const style = getComputedStyle(vp);
    const pl = parseFloat(style.paddingLeft);
    const center = vw / 2 - ITEM_W / 2;
    const off = center - idx * (ITEM_W + GAP) - pl;
    setOffset(off);
  }, []);

  useEffect(() => {
    calcOffset(selectedIdx);
    const handleResize = () => calcOffset(selectedIdx);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedIdx, calcOffset]);

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

  // Single match — just show it
  if (matches.length <= 1) {
    return (
      <div className="mc-viewport" ref={viewportRef}>
        <div className="mc-track" style={{ transform: 'translateX(0)' }}>
          {matches.map(m => (
            <button key={m.matchId} className="mc-item active">
              <div className="mc-flags"><span className="flag-emoji">{flags[m.homeTeam] || '🏳️'}</span><span className="flag-emoji">{flags[m.awayTeam] || '🏳️'}</span></div>
              <div className="mc-teams"><span>{m.homeTeam}</span><span className="mc-vs">vs</span><span>{m.awayTeam}</span></div>
              <small>{m.venue || 'WC 2026'}</small>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mc-viewport" ref={viewportRef}>
      <div
        className="mc-track"
        style={{ transform: `translateX(${offset}px)` }}
      >
        {matches.map((m, i) => (
          <button
            key={m.matchId}
            className={`mc-item ${i === selectedIdx ? 'active' : ''}`}
            onClick={() => onSelect(m.matchId)}
          >
            <div className="mc-flags">
              <span className="flag-emoji">{flags[m.homeTeam] || '🏳️'}</span>
              <span className="flag-emoji">{flags[m.awayTeam] || '🏳️'}</span>
            </div>
            <div className="mc-teams">
              <span className="mc-team">{m.homeTeam}</span>
              <span className="mc-vs">vs</span>
              <span className="mc-team">{m.awayTeam}</span>
            </div>
            <small>{m.venue || 'WC 2026'}</small>
          </button>
        ))}
      </div>

      {/* Arrow buttons */}
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
