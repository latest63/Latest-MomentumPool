/* ═══════════════════════════════════════════════════
   Momentum Pool — Simulation Engine
   5 matches, 2min deposit → 2min live → restart
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
  poolAddress: string | null; // real pool contract (null = mock only)
  settledOnChain: boolean;    // whether settle() has been called
}

export interface SimState {
  matches: SimMatch[];
  tick: number;
  running: boolean;
}

/* ─── 5 Match Pairings ─── */
const MATCHES = [
  { id: 'sim-1', home: 'Nigeria', away: 'Brazil' },
  { id: 'sim-2', home: 'Argentina', away: 'France' },
  { id: 'sim-3', home: 'England', away: 'Germany' },
  { id: 'sim-4', home: 'Portugal', away: 'Spain' },
  { id: 'sim-5', home: 'Morocco', away: 'Senegal' },
];

const PHASE_DURATION = {
  open: 120,     // 2 min deposit window
  live: 120,     // 2 min match
  settled: 15,   // 15s pause before restart
};

/* ─── Player name pools for realistic commentary ─── */
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

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ─── Engine ─── */
export class SimEngine {
  private matches: SimMatch[] = [];
  private tickCount = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private running = false;

  /* Per-match event generation tracking */
  private eventTimers: Map<string, number> = new Map();
  private goalClusters: Map<string, number> = new Map(); // for rarity of second goals close together

  /* Real contract integration */
  private poolAddresses: Map<string, string> = new Map();
  public onSettle: ((matchId: string, winner: TeamSide, homeScore: number, awayScore: number, poolAddress: string) => void) | null = null;

  constructor() {
    this.initMatches();
  }

  private initMatches() {
    this.matches = MATCHES.map((m) => ({
      id: m.id,
      homeTeam: m.home,
      awayTeam: m.away,
      phase: 'open' as SimPhase,
      phaseElapsed: 0,
      score: { home: 0, away: 0 },
      events: [],
      momentumHome: 50,
      deposits: { home: 0, away: 0 },
      round: 1,
      poolAddress: null,
      settledOnChain: false,
    }));
    this.eventTimers.clear();
    this.goalClusters.clear();
    this.tickCount = 0;
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
    this.initMatches();
  }

  getState(): SimState {
    return {
      matches: this.matches.map((m) => {
        const poolAddr = this.poolAddresses.get(m.id) || m.poolAddress;
        return {
          ...m,
          poolAddress: poolAddr,
          events: m.events.slice(-50),
        };
      }),
      tick: this.tickCount,
      running: this.running,
    };
  }

  /* ─── Deposit ─── */
  deposit(matchId: string, team: TeamSide, amount: number): boolean {
    const match = this.matches.find((m) => m.id === matchId);
    if (!match || match.phase !== 'open') return false;
    match.deposits[team] += amount;
    return true;
  }

  /* ─── Set real pool address ─── */
  setPoolAddress(matchId: string, address: string) {
    this.poolAddresses.set(matchId, address);
    const match = this.matches.find((m) => m.id === matchId);
    if (match) match.poolAddress = address;
  }

  /* ─── Claim winnings ─── */
  claim(matchId: string, team: TeamSide): { won: boolean; payout: number } | null {
    const match = this.matches.find((m) => m.id === matchId);
    if (!match || match.phase !== 'settled') return null;
    const total = match.deposits.home + match.deposits.away;
    if (total === 0) return { won: false, payout: 0 };

    const winner: TeamSide =
      match.score.home > match.score.away ? 'home'
      : match.score.away > match.score.home ? 'away'
      : Math.random() < 0.5 ? 'home' : 'away'; // draws settled randomly

    if (team !== winner) return { won: false, payout: 0 };

    // Payout: their share of total pool minus 2% fee
    const myDeposit = match.deposits[team];
    const opponentDeposit = match.deposits[team === 'home' ? 'away' : 'home'];
    const share = total === 0 ? 0 : myDeposit / (myDeposit + opponentDeposit);
    const payout = total * 0.98 * share; // 2% fee
    return { won: true, payout };
  }

  /* ─── Main tick ─── */
  private tick() {
    this.tickCount++;

    for (const match of this.matches) {
      match.phaseElapsed++;

      switch (match.phase) {
        case 'open':
          if (match.phaseElapsed >= PHASE_DURATION.open) {
            this.transitionToLive(match);
          }
          break;
        case 'live':
          this.simulateEvents(match);
          if (match.phaseElapsed >= PHASE_DURATION.live) {
            this.transitionToSettled(match);
          }
          break;
        case 'settled':
          if (match.phaseElapsed >= PHASE_DURATION.settled) {
            this.restartMatch(match);
          }
          break;
      }
    }
  }

  private transitionToLive(match: SimMatch) {
    match.phase = 'live';
    match.phaseElapsed = 0;
    match.momentumHome = 50 + (Math.random() * 20 - 10); // slight initial bias
    match.momentumHome = clamp(match.momentumHome, 20, 80);
  }

  private transitionToSettled(match: SimMatch) {
    match.phase = 'settled';
    match.phaseElapsed = 0;
    // Fire on-chain settlement if a pool is attached
    if (match.poolAddress && !match.settledOnChain && this.onSettle) {
      match.settledOnChain = true;
      const winner: TeamSide =
        match.score.home > match.score.away ? 'home'
        : match.score.away > match.score.home ? 'away'
        : Math.random() < 0.5 ? 'home' : 'away';
      this.onSettle(match.id, winner, match.score.home, match.score.away, match.poolAddress);
    }
  }

  private restartMatch(match: SimMatch) {
    match.phase = 'open';
    match.phaseElapsed = 0;
    match.score = { home: 0, away: 0 };
    match.momentumHome = 50;
    match.deposits = { home: 0, away: 0 };
    match.round++;
    match.events = [];
    match.poolAddress = null;
    match.settledOnChain = false;
    this.eventTimers.set(match.id, 0);
    this.goalClusters.delete(match.id);
  }

  /* ─── Event Generation ─── */
  private simulateEvents(match: SimMatch) {
    const minute = match.phaseElapsed;

    // Every match tick has varying probability of an event
    // We use a timer so events are spaced out randomly (1-5s apart)
    let timer = this.eventTimers.get(match.id) ?? 0;
    timer -= 1;
    if (timer > 0) {
      this.eventTimers.set(match.id, timer);
      return;
    }

    // Set a random delay until next event (1-5 seconds)
    const nextDelay = randomInt(1, 5);
    this.eventTimers.set(match.id, nextDelay);

    // Late match urgency: higher event frequency in final 30s
    const lateBonus = minute > PHASE_DURATION.live - 30 ? 1.5 : 1.0;

    // Pick event type
    const roll = Math.random() * 100;

    // Decide which team (weighted by momentum)
    const homeProb = match.momentumHome / 100;
    const team: TeamSide = Math.random() < homeProb ? 'home' : 'away';
    const opponent: TeamSide = team === 'home' ? 'away' : 'home';

    // Generate events with dynamic probabilities
    if (roll < 4 * lateBonus) {
      // ⚽ GOAL!
      match.score[team]++;
      match.events.push({ minute, type: 'goal', team, player: getRandomPlayer(team === 'home' ? match.homeTeam : match.awayTeam) });
      // Goal cluster protection: 25% chance of another goal within 2 events if not recently clustered
      if (Math.random() < 0.25 && !this.goalClusters.has(match.id)) {
        this.goalClusters.set(match.id, 1);
        setTimeout(() => this.goalClusters.delete(match.id), 8000);
      }
      // Momentum: big swing toward scoring team
      match.momentumHome += team === 'home' ? 12 : -12;
    } else if (roll < 10 * lateBonus) {
      // 🟥 RED CARD
      match.events.push({ minute, type: 'red_card', team, player: getRandomPlayer(team === 'home' ? match.homeTeam : match.awayTeam) });
      // Red card = big momentum swing to opponent
      match.momentumHome += team === 'home' ? -15 : 15;
    } else if (roll < 22 * lateBonus) {
      // 🟨 YELLOW CARD
      match.events.push({ minute, type: 'yellow_card', team, player: getRandomPlayer(team === 'home' ? match.homeTeam : match.awayTeam) });
      match.momentumHome += team === 'home' ? -5 : 5;
    } else if (roll < 35 * lateBonus) {
      // 🚩 CORNER
      match.events.push({ minute, type: 'corner', team, player: '' });
      match.momentumHome += team === 'home' ? 1 : -1;
    } else if (roll < 55 * lateBonus) {
      // 💥 WOODWORK
      match.events.push({ minute, type: 'woodwork', team, player: getRandomPlayer(team === 'home' ? match.homeTeam : match.awayTeam) });
      match.momentumHome += team === 'home' ? 2 : -2;
    } else if (roll < 75 * lateBonus) {
      // 🎯 SHOT ON TARGET
      match.events.push({ minute, type: 'shot_on_target', team, player: getRandomPlayer(team === 'home' ? match.homeTeam : match.awayTeam) });
      match.momentumHome += team === 'home' ? 1.5 : -1.5;
    } else {
      // FOUL
      match.events.push({ minute, type: 'foul', team, player: getRandomPlayer(team === 'home' ? match.homeTeam : match.awayTeam) });
      match.momentumHome += team === 'home' ? -0.5 : 0.5;
    }

    // Clamp momentum between 0 and 100
    match.momentumHome = clamp(match.momentumHome, 0, 100);

    // Random drift: momentum slowly equalizes over time
    match.momentumHome += (Math.random() - 0.5) * 2;
    match.momentumHome = clamp(match.momentumHome, 5, 95);
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
