'use client';

import { useRef, useEffect, useState } from 'react';

interface MatchSummary { matchId: string; homeTeam: string; awayTeam: string; venue?: string; }

interface Props {
  matches: MatchSummary[];
  selected: string;
  flags: Record<string, string>;
  onSelect: (id: string) => void;
}

const CARD_W = 160;
const GAP = 20;

export default function MatchCarousel({ matches, selected, flags, onSelect }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const selectedIdx = matches.findIndex(m => m.matchId === selected);

  useEffect(() => {
    if (selectedIdx < 0) return;
    // Center the selected card under the frame
    // Frame sits at the center of the wrap.
    // We want card at selectedIdx to be centered under the frame.
    const step = CARD_W + GAP;
    setOffset(-selectedIdx * step);
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
      {/* Visual center frame — sits on top */}
      <div className="mc-frame" />

      {/* Track with all cards — slides behind the frame */}
      <div className="mc-track-wrap">
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
      </div>

      {/* Arrows */}
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
