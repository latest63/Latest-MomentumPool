/* ═══════════════════════════════════════════════════
   Momentum Pool — Simulation Engine
   1 match at a time, cycles through 5 pairings
   ═══════════════════════════════════════════════════ */

export type SimPhase = 'open' | 'live' | 'settled';
export type SimEventType = 'goal' | 'yellow_card' | 'red_card' | 'corner' | 'shot_on_target' | 'foul' | 'woodwork';
export type TeamSide = 'home' | 'away';

export interface SimEvent {
  minute: number;
  type: SimEventType;
  team: TeamSide;
  player: string;
}

export interface SimMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  phase: SimPhase;
  phaseElapsed: number;
  score: { home: number; away: number };
  events: SimEvent[];
  momentumHome: number; // 0-100 (home's momentum share)
  deposits: { home: number; away: number };
  round: number;
  poolAddress: string | null;
  settledOnChain: boolean;
}

export interface SimState {
  match: SimMatch | null;
  nextUp: { id: string; homeTeam: string; awayTeam: string } | null;
  matchIndex: number; // 0-4 which of the 5 pairings is current
  totalMatches: number; // how many matches played this cycle
  tick: number;
  running: boolean;
}

/* ─── 5 Match Pairings (cycling) ─── */
const MATCHES = [
  { id: 'sim-1', home: 'Nigeria', away: 'Brazil', real: true },
  { id: 'sim-2', home: 'Argentina', away: 'France', real: true },
  { id: 'sim-3', home: 'England', away: 'Germany', real: true },
  { id: 'sim-4', home: 'Portugal', away: 'Spain', real: true },
  { id: 'sim-5', home: 'Morocco', away: 'Senegal', real: true },
];

const PHASE_DURATION = {
  open: 120,
  live: 120,
  settled: 15,
};

/* ─── Player name pools ─── */
const FIRST_NAMES = [
  'A.', 'B.', 'C.', 'D.', 'E.', 'F.', 'G.', 'H.', 'I.', 'J.',
  'K.', 'L.', 'M.', 'N.', 'O.', 'P.', 'R.', 'S.', 'T.', 'V.',
];

const SURNAMES: Record<string, string[]> = {
  Nigeria: ['Osimhen', 'Lookman', 'Iwobi', 'Ndidi', 'Aina', 'Bassey', 'Chukwueze', 'Onyeka', 'Ekwah', 'Onana', 'Moses', 'Yusuf'],
  Brazil: ['Silva', 'Jesus', 'Neymar', 'Raphinha', 'Casemiro', 'Marcos', 'Vinicius', 'Rodrygo', 'Martins', 'Gomes', 'Alves', 'Luiz'],
  Argentina: ['Messi', 'Martinez', 'Fernandez', 'MacAllister', 'Alvarez', 'Romero', 'Tagliafico', 'Molina', 'Paredes', 'Correa', 'Palacios'],
  France: ['Mbappe', 'Griezmann', 'Tchouameni', 'Camavinga', 'Dembélé', 'Upamecano', 'Hernandez', 'Pavard', 'Kante', 'Thuram', 'Kolo Muani'],
  England: ['Kane', 'Bellingham', 'Rice', 'Saka', 'Foden', 'Rashford', 'Stones', 'Walker', 'Pickford', 'Palmer', 'Alexander-Arnold'],
  Germany: ['Havertz', 'Musiala', 'Wirtz', 'Kimmich', 'Sané', 'Gündogan', 'Schlotterbeck', 'Tah', 'Andrich', 'Fuellkrug', 'Raum'],
  Portugal: ['Ronaldo', 'Fernandes', 'Leão', 'Silva', 'Dias', 'Cancelo', 'Neves', 'Palhinha', 'Sá', 'Jota', 'Nuno', 'Félix'],
  Spain: ['Yamal', 'Williams', 'Olmo', 'Rodri', 'Ruiz', 'Laporte', 'Carvajal', 'Navas', 'Simón', 'Oyarzabal', 'Merino'],
  Morocco: ['Hakimi', 'Amrabat', 'Ziyech', 'En-Nesyri', 'Saïss', 'Bounou', 'El-Hannous', 'Chair', 'Abde', 'Harit', 'Dari'],
  Senegal: ['Mané', 'Sarr', 'Diallo', 'Gueye', 'Koulibaly', 'Mendy', 'Leão', 'Diagne', 'Jakobs', 'Ndiaye', 'Camara'],
};

function getRandomPlayer(team: string): string {
  const surnames = SURNAMES[team] || SURNAMES['Nigeria'];
  const fn = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const sn = surnames[Math.floor(Math.random() * surnames.length)];
  return `${fn}${sn}`;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/* ─── Engine: one match at a time ─── */
export class SimEngine {
  private match: SimMatch | null = null;
  private queue: typeof MATCHES = [];
  private matchIndex = 0;
  private totalMatches = 0;
  private round = 1;
  private tickCount = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private running = false;

  /* per-match event timing */
  private eventTimer = 0;
  private goalCluster = 0;

  /* Real contract integration */
  public onSettle: ((matchId: string, winner: TeamSide, homeScore: number, awayScore: number, poolAddress: string) => void) | null = null;
  /* Called when a new real match is about to start — should return the pool address */
  public onNewMatch: ((matchId: string, homeTeam: string, awayTeam: string) => Promise<string | null>) | null = null;

  constructor() {
    this.fillQueue();
    this.advanceToNext();
  }

  private fillQueue() {
    // Shuffle for first round, then rotate through sequentially
    if (this.queue.length === 0 && this.totalMatches === 0) {
      this.queue = [...MATCHES].sort(() => Math.random() - 0.5);
    } else if (this.queue.length === 0) {
      this.queue = [...MATCHES];
    }
  }

  private advanceToNext() {
    this.fillQueue();
    if (this.queue.length === 0) return;

    const pairing = this.queue.shift()!;
    this.matchIndex = MATCHES.findIndex(m => m.id === pairing.id);
    this.totalMatches++;

    this.match = {
      id: pairing.id,
      homeTeam: pairing.home,
      awayTeam: pairing.away,
      phase: 'open',
      phaseElapsed: 0,
      score: { home: 0, away: 0 },
      events: [],
      momentumHome: 50,
      deposits: { home: 0, away: 0 },
      round: this.round,
      poolAddress: null,
      settledOnChain: false,
    };
    this.eventTimer = 0;
    this.goalCluster = 0;

    // Auto-deploy pool for real matches
    if (pairing.real && this.onNewMatch) {
      this.onNewMatch(pairing.id, pairing.home, pairing.away).then(addr => {
        if (addr && this.match && this.match.id === pairing.id) {
          this.match.poolAddress = addr;
        }
      }).catch(err => {
        console.error(`[sim] Failed to deploy pool for ${pairing.id}:`, err);
      });
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.intervalId = setInterval(() => this.tick(), 1000);
  }

  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.running = false;
    this.intervalId = null;
  }

  reset() {
    this.stop();
    this.queue = [];
    this.totalMatches = 0;
    this.round = 1;
    this.matchIndex = 0;
    this.tickCount = 0;
    this.match = null;
    this.eventTimer = 0;
    this.goalCluster = 0;
    this.fillQueue();
    this.advanceToNext();
  }

  getState(): SimState {
    const nextPairing = this.queue[0] || null;
    return {
      match: this.match ? { ...this.match, events: this.match.events.slice(-50) } : null,
      nextUp: nextPairing ? { id: nextPairing.id, homeTeam: nextPairing.home, awayTeam: nextPairing.away } : null,
      matchIndex: this.matchIndex,
      totalMatches: this.totalMatches,
      tick: this.tickCount,
      running: this.running,
    };
  }

  /* ─── Deposit (mock) ─── */
  deposit(team: TeamSide, amount: number): boolean {
    if (!this.match || this.match.phase !== 'open') return false;
    this.match.deposits[team] += amount;
    return true;
  }

  setPoolAddress(address: string) {
    if (this.match) this.match.poolAddress = address;
  }

  /* ─── Claim (mock) ─── */
  claim(team: TeamSide): { won: boolean; payout: number } | null {
    if (!this.match || this.match.phase !== 'settled') return null;
    const total = this.match.deposits.home + this.match.deposits.away;
    if (total === 0) return { won: false, payout: 0 };

    const winner: TeamSide =
      this.match.score.home > this.match.score.away ? 'home'
      : this.match.score.away > this.match.score.home ? 'away'
      : Math.random() < 0.5 ? 'home' : 'away';

    if (team !== winner) return { won: false, payout: 0 };

    const myDeposit = this.match.deposits[team];
    const opponentDeposit = this.match.deposits[team === 'home' ? 'away' : 'home'];
    const share = total === 0 ? 0 : myDeposit / (myDeposit + opponentDeposit);
    const payout = total * 0.98 * share;
    return { won: true, payout };
  }

  /* ─── Main tick ─── */
  private tick() {
    if (!this.match) return;
    this.tickCount++;
    this.match.phaseElapsed++;

    switch (this.match.phase) {
      case 'open':
        if (this.match.phaseElapsed >= PHASE_DURATION.open) this.transitionToLive();
        break;
      case 'live':
        this.simulateEvents();
        if (this.match.phaseElapsed >= PHASE_DURATION.live) this.transitionToSettled();
        break;
      case 'settled':
        if (this.match.phaseElapsed >= PHASE_DURATION.settled) this.restartCycle();
        break;
    }
  }

  private transitionToLive() {
    if (!this.match) return;
    this.match.phase = 'live';
    this.match.phaseElapsed = 0;
    this.match.momentumHome = 50 + (Math.random() * 20 - 10);
    this.match.momentumHome = clamp(this.match.momentumHome, 20, 80);
    this.eventTimer = 0;
  }

  private transitionToSettled() {
    if (!this.match) return;
    this.match.phase = 'settled';
    this.match.phaseElapsed = 0;

    // Auto-settle on-chain if pool attached
    if (this.match.poolAddress && !this.match.settledOnChain && this.onSettle) {
      this.match.settledOnChain = true;
      const winner: TeamSide =
        this.match.score.home > this.match.score.away ? 'home'
        : this.match.score.away > this.match.score.home ? 'away'
        : Math.random() < 0.5 ? 'home' : 'away';
      this.onSettle(this.match.id, winner, this.match.score.home, this.match.score.away, this.match.poolAddress);
    }
  }

  private restartCycle() {
    this.advanceToNext();
    // If queue wrapped around, increment round
    const playedCount = this.totalMatches;
    if (playedCount > 0 && playedCount % 5 === 0) this.round++;
  }

  /* ─── Event Generation ─── */
  private simulateEvents() {
    if (!this.match) return;

    this.eventTimer -= 1;
    if (this.eventTimer > 0) return;

    this.eventTimer = randomInt(1, 5);

    const minute = this.match.phaseElapsed;
    const lateBonus = minute > PHASE_DURATION.live - 30 ? 1.5 : 1.0;
    const roll = Math.random() * 100;
    const homeProb = this.match.momentumHome / 100;
    const team: TeamSide = Math.random() < homeProb ? 'home' : 'away';

    if (roll < 4 * lateBonus) {
      // ⚽ GOAL!
      this.match.score[team]++;
      this.match.events.push({ minute, type: 'goal', team, player: getRandomPlayer(team === 'home' ? this.match.homeTeam : this.match.awayTeam) });
      if (Math.random() < 0.25 && !this.goalCluster) {
        this.goalCluster = 1;
        setTimeout(() => { this.goalCluster = 0; }, 8000);
      }
      this.match.momentumHome += team === 'home' ? 12 : -12;
    } else if (roll < 10 * lateBonus) {
      this.match.events.push({ minute, type: 'red_card', team, player: getRandomPlayer(team === 'home' ? this.match.homeTeam : this.match.awayTeam) });
      this.match.momentumHome += team === 'home' ? -15 : 15;
    } else if (roll < 22 * lateBonus) {
      this.match.events.push({ minute, type: 'yellow_card', team, player: getRandomPlayer(team === 'home' ? this.match.homeTeam : this.match.awayTeam) });
      this.match.momentumHome += team === 'home' ? -5 : 5;
    } else if (roll < 35 * lateBonus) {
      this.match.events.push({ minute, type: 'corner', team, player: '' });
      this.match.momentumHome += team === 'home' ? 1 : -1;
    } else if (roll < 55 * lateBonus) {
      this.match.events.push({ minute, type: 'woodwork', team, player: getRandomPlayer(team === 'home' ? this.match.homeTeam : this.match.awayTeam) });
      this.match.momentumHome += team === 'home' ? 2 : -2;
    } else if (roll < 75 * lateBonus) {
      this.match.events.push({ minute, type: 'shot_on_target', team, player: getRandomPlayer(team === 'home' ? this.match.homeTeam : this.match.awayTeam) });
      this.match.momentumHome += team === 'home' ? 1.5 : -1.5;
    } else {
      this.match.events.push({ minute, type: 'foul', team, player: getRandomPlayer(team === 'home' ? this.match.homeTeam : this.match.awayTeam) });
      this.match.momentumHome += team === 'home' ? -0.5 : 0.5;
    }

    this.match.momentumHome = clamp(this.match.momentumHome, 0, 100);
    this.match.momentumHome += (Math.random() - 0.5) * 2;
    this.match.momentumHome = clamp(this.match.momentumHome, 5, 95);
  }
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/* ─── Singleton access ─── */
export function getEngine(): SimEngine {
  if (!(globalThis as any).__simEngine) {
    (globalThis as any).__simEngine = new SimEngine();
  }
  return (globalThis as any).__simEngine;
}
