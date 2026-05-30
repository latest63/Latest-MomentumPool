'use client';

import { useRef, useEffect, useState, useLayoutEffect } from 'react';
import TeamLogo from '@/components/TeamLogo';

interface MatchSummary {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  venue?: string;
  status?: string;
  competition?: string;
  homeColors?: { primary: string; secondary: string; text: string };
  awayColors?: { primary: string; secondary: string; text: string };
  homeCode?: string;
  awayCode?: string;
  homeBadge?: string;
  awayBadge?: string;
  isLive?: boolean;
  settled?: boolean;
}

interface Props {
  matches: MatchSummary[];
  selected: string;
  onSelect: (id: string) => void;
}

const CARD_W = 160;
const GAP = 20;
const MOBILE_BP = 768;

export default function MatchCarousel({ matches, selected, onSelect }: Props) {
  const [isMobile, setIsMobile] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  // Desktop-only hooks (always declared at top level)
  const tabsRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BP);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const selectedIdx = matches.findIndex(m => m.matchId === selected);

  // Mobile carousel offset
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

  // Desktop scroll state
  const updateScrollState = () => {
    const el = tabsRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useLayoutEffect(() => {
    if (isMobile) return;
    updateScrollState();
    const el = tabsRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState);
    return () => el.removeEventListener('scroll', updateScrollState);
  }, [matches, isMobile]);

  // Auto-scroll to selected tab on desktop
  useLayoutEffect(() => {
    if (isMobile) return;
    const el = tabsRef.current;
    if (!el) return;
    const activeTab = el.querySelector('.match-tab.active') as HTMLElement | null;
    if (!activeTab) return;
    const containerRect = el.getBoundingClientRect();
    const tabRect = activeTab.getBoundingClientRect();
    if (tabRect.left < containerRect.left || tabRect.right > containerRect.right) {
      activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [selected, isMobile]);

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

  const scrollTabs = (dir: 'left' | 'right') => {
    const el = tabsRef.current;
    if (!el) return;
    const card = el.querySelector('.match-tab') as HTMLElement | null;
    const step = (card?.offsetWidth ?? 170) + 12;
    el.scrollBy({ left: dir === 'left' ? -step * 3 : step * 3, behavior: 'smooth' });
  };

  // ─── Desktop: horizontal tabs ───
  if (!isMobile) {
    return (
      <div className="match-tabs-wrap">
        <button
          className={`mc-arrow mc-arrow-left ${atStart ? 'disabled' : ''}`}
          onClick={goPrev}
          disabled={atStart}
          aria-label="Previous match"
        >‹</button>
        <div className="match-tabs" ref={tabsRef}>
          {matches.map(m => (
            <button
              key={m.matchId}
              className={`match-tab ${selected === m.matchId ? 'active' : ''} ${m.settled ? 'settled' : ''}`}
              onClick={() => onSelect(m.matchId)}
            >
              <div className="tab-status-row">
                {m.isLive && <span className="tab-live-dot" />}
                {m.settled && <span className="tab-settled-label">FT</span>}
                {!m.isLive && !m.settled && selected === m.matchId && <span className="tab-open-label">OPEN</span>}
                {!m.isLive && !m.settled && selected !== m.matchId && <span className="tab-upcoming-label">Next</span>}
              </div>
              <div className="tab-team-row">
                <TeamLogo name={m.homeTeam} badge={m.homeBadge} code={m.homeCode} size={28} />
                <span>{m.homeTeam}</span>
              </div>
              <div className="tab-vs-label">vs</div>
              <div className="tab-team-row">
                <TeamLogo name={m.awayTeam} badge={m.awayBadge} code={m.awayCode} size={28} />
                <span>{m.awayTeam}</span>
              </div>
              <small>{m.competition || m.venue || 'Football'}</small>
            </button>
          ))}
        </div>
        <button
          className={`mc-arrow mc-arrow-right ${atEnd ? 'disabled' : ''}`}
          onClick={goNext}
          disabled={atEnd}
          aria-label="Next match"
        >›</button>
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
              <TeamLogo name={m.homeTeam} badge={m.homeBadge} code={m.homeCode} size={36} />
              <TeamLogo name={m.awayTeam} badge={m.awayBadge} code={m.awayCode} size={36} />
            </div>
            <div className="mc-teams">
              <span className="mc-team">{m.homeTeam}</span>
              <span className="mc-vs">VS</span>
              <span className="mc-team">{m.awayTeam}</span>
            </div>
            <small>{m.competition || m.venue || 'Football'}</small>
            <div className="mc-status-row">
              {m.isLive && <span className="mc-live-badge">LIVE</span>}
              {m.settled && <span className="mc-ft-badge">FT</span>}
              {!m.isLive && !m.settled && selected === m.matchId && <span className="mc-open-badge">OPEN</span>}
              {!m.isLive && !m.settled && selected !== m.matchId && <span className="mc-next-badge">Next</span>}
            </div>
          </button>
        ))}
      </div>
      <button
        className={`mc-arrow mc-arrow-left ${atStart ? 'disabled' : ''}`}
        onClick={goPrev}
        disabled={atStart}
        aria-label="Previous match"
      >‹</button>
      <button
        className={`mc-arrow mc-arrow-right ${atEnd ? 'disabled' : ''}`}
        onClick={goNext}
        disabled={atEnd}
        aria-label="Next match"
      >›</button>
    </div>
  );
}

function calcOffset(wrap: HTMLDivElement | null, idx: number): number {
  if (!wrap || idx < 0) return 0;
  const firstCard = wrap.querySelector('.mc-card') as HTMLElement | null;
  const actualW = firstCard?.offsetWidth ?? CARD_W;
  const step = actualW + GAP;
  return wrap.offsetWidth / 2 - actualW / 2 - idx * step;
}
