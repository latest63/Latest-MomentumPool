'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const COLORS = ['#2453BE', '#28C16C', '#E61A0A', '#FF4702', '#BEEE4F', '#00E5FF'];

export default function Nav() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const poolLetters = 'Pool'.split('');

  return (
    <>
      {/* Top Nav */}
      <nav className="top-nav">
        <div className="top-nav-inner">
          <button
            className="hamburger-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <span /><span /><span />
          </button>

          <Link href="/" className="top-nav-brand">
            <img
              className="top-bar-logo"
              src="/assets/momentum-logo-transparent.png"
              alt="Momentum Pool"
            />
            <div className="top-bar-title">
              <span className="momentum-outline">Momentum</span>
              <span className="pool-colored">
                {poolLetters.map((letter, i) => (
                  <span key={i} style={{ color: 'transparent', WebkitTextStroke: `1.5px ${COLORS[i]}` } as any}>
                    {letter}
                  </span>
                ))}
              </span>
            </div>
          </Link>

          <div className="top-nav-links">
            <Link href="/arena" className={`nav-link ${pathname === '/arena' ? 'active' : ''}`}>
              Arena
            </Link>
          </div>
        </div>
      </nav>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <span className="sidebar-title">Menu</span>
          <button
            className="sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>
        <div className="sidebar-links">
          <Link href="/" className="sidebar-link" onClick={() => setSidebarOpen(false)}>
            🏠 Home
          </Link>
          <Link href="/arena" className="sidebar-link" onClick={() => setSidebarOpen(false)}>
            ⚽ Arena
          </Link>
        </div>
      </aside>
    </>
  );
}
