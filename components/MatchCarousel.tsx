'use client';

import { useRef, useEffect, useState } from 'react';

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
  const trackRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const selectedIdx = matches.findIndex(m => m.matchId === selected);

  useEffect(() => {
    if (selectedIdx < 0) return;
    // Each item step = ITEM_W + GAP
    const step = ITEM_W + GAP;
    // We want item at selectedIdx centered in the frame.
    // The frame shows one item at a time. Item 0 sits at left=0 of the track.
    // To show item N, we shift track left by N * step.
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

  if (matches.length <= 1) {
    return (
      <div className="mc-frame">
        <div className="mc-frame-inner">
          {matches.map(m => (
            <div key={m.matchId} className="mc-card active">
              <div className="mc-flags"><span className="flag-emoji">{flags[m.homeTeam] || '🏳️'}</span><span className="flag-emoji">{flags[m.awayTeam] || '🏳️'}</span></div>
              <div className="mc-teams"><span>{m.homeTeam}</span><span className="mc-vs">vs</span><span>{m.awayTeam}</span></div>
              <small>{m.venue || 'WC 2026'}</small>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mc-frame">
      {/* Fixed center frame border glow */}
      <div className="mc-frame-glow" />

      <div className="mc-frame-inner" ref={trackRef}>
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
                <span className="mc-vs">vs</span>
                <span className="mc-team">{m.awayTeam}</span>
              </div>
              <small>{m.venue || 'WC 2026'}</small>
            </button>
          ))}
        </div>
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
