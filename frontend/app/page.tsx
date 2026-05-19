import { LiveMatchPage } from '@/components/MomentumMeter';

// Example matches — replace with dynamic data from your backend
const EXAMPLE_MATCHES = [
  { matchId: '12345', homeTeam: 'Nigeria', awayTeam: 'Brazil' },
  { matchId: '12346', homeTeam: 'Argentina', awayTeam: 'Germany' },
];

export default function Home() {
  // In real app — show a list of matches, then route to a detail page
  // For now, render the first match as the live page

  return (
    <main style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0' }}>
      <header style={{ padding: '20px', borderBottom: '1px solid #1e293b' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>
          ⚡ Momentum Pool
        </h1>
        <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>
          Pick the dominant team in each half
        </p>
      </header>

      <LiveMatchPage
        matchId={EXAMPLE_MATCHES[0].matchId}
        homeTeam={EXAMPLE_MATCHES[0].homeTeam}
        awayTeam={EXAMPLE_MATCHES[0].awayTeam}
      />
    </main>
  );
}
