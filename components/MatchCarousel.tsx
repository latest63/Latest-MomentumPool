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

  const calcOffset = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp || selectedIdx < 0) return;
    const vw = vp.offsetWidth;
    // Push track so selected item sits dead center
    const center = vw / 2 - ITEM_W / 2;
    const off = center - selectedIdx * (ITEM_W + GAP);
    setOffset(off);
  }, [selectedIdx]);

  useEffect(() => {
    calcOffset();
    window.addEventListener('resize', calcOffset);
    return () => window.removeEventListener('resize', calcOffset);
  }, [calcOffset]);

  // If only 1 match, nothing to slide — just show it centered
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

      {/* Edge fade gradients */}
      <div className="mc-fade mc-fade-left" />
      <div className="mc-fade mc-fade-right" />
    </div>
  );
}
