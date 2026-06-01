/* ═══════════════════════════════════════════════════
   Momentum Pool — Schedule-Based Engine
   5 matches on a fixed UTC schedule, cycling daily
   Phase is computed from wall clock — cold starts have zero impact
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
  phaseStartedAt: number;
  score: { home: number; away: number };
  goals: { home: number; away: number };
  events: SimEvent[];
  momentumHome: number;
  deposits: { home: number; away: number };
  round: number;
  poolAddress: string | null;
  tokenAddress: string;
  settledOnChain: boolean;
}

export interface SimState {
  match: SimMatch | null;
  nextUp: { id: string; homeTeam: string; awayTeam: string } | null;
  matchIndex: number;
  totalMatches: number;
  tick: number;
  running: boolean;
  deployedPools: DeployedPool[];
}

export interface DeployedPool {
  poolAddress: string;
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  tokenAddress: string;
  deployedAt: number;
}

/* ─── Player name pools ─── */
const FIRST_NAMES = ['A.','B.','C.','D.','E.','F.','G.','H.','I.','J.','K.','L.','M.','N.','O.','P.','R.','S.','T.','V.'];
const SURNAMES: Record<string, string[]> = {
  Nigeria: ['Osimhen','Lookman','Iwobi','Ndidi','Aina','Bassey','Chukwueze','Onyeka','Ekwah','Onana','Moses','Yusuf'],
  Brazil: ['Silva','Jesus','Neymar','Raphinha','Casemiro','Marcos','Vinicius','Rodrygo','Martins','Gomes','Alves','Luiz'],
  Argentina: ['Messi','Martinez','Fernandez','MacAllister','Alvarez','Romero','Tagliafico','Molina','Paredes','Correa','Palacios'],
  France: ['Mbappe','Griezmann','Tchouameni','Camavinga','Dembélé','Upamecano','Hernandez','Pavard','Kante','Thuram','Kolo Muani'],
  England: ['Kane','Bellingham','Rice','Saka','Foden','Rashford','Stones','Walker','Pickford','Palmer','Alexander-Arnold'],
  Germany: ['Havertz','Musiala','Wirtz','Kimmich','Sané','Gündogan','Schlotterbeck','Tah','Andrich','Fuellkrug','Raum'],
  Portugal: ['Ronaldo','Fernandes','Leão','Silva','Dias','Cancelo','Neves','Palhinha','Sá','Jota','Nuno','Félix'],
  Spain: ['Yamal','Williams','Olmo','Rodri','Ruiz','Laporte','Carvajal','Navas','Simón','Oyarzabal','Merino'],
  Morocco: ['Hakimi','Amrabat','Ziyech','En-Nesyri','Saïss','Bounou','El-Hannous','Chair','Abde','Harit','Dari'],
  Senegal: ['Mané','Sarr','Diallo','Gueye','Koulibaly','Mendy','Leão','Diagne','Jakobs','Ndiaye','Camara'],
};

function getRandomPlayer(team: string): string {
  const surnames = SURNAMES[team] || SURNAMES['Nigeria'];
  const fn = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  return `${fn}${surnames[Math.floor(Math.random() * surnames.length)]}`;
}
function randomInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }

/* ─── 5 Match Pairings ─── */
const USDG = '0xa78e2baabaf5c4f36b7fc394725deb68d332eec1';

const MATCHES = [
  { id: 'sim-1', home: 'Nigeria', away: 'Brazil', token: USDG },
  { id: 'sim-2', home: 'Argentina', away: 'France', token: USDG },
  { id: 'sim-3', home: 'England', away: 'Germany', token: USDG },
  { id: 'sim-4', home: 'Portugal', away: 'Spain', token: USDG },
  { id: 'sim-5', home: 'Morocco', away: 'Senegal', token: USDG },
];

/* ─── Fixed UTC schedule (daily cycling) ───
   Each slot = 3.5 hours: 1hr deposit + 1.5hr match + 1hr cooldown
   First match deposit opens at 00:00 UTC each day          */
const MATCH_DURATION = 3.5 * 3600; // 3.5 hours per match slot
const OPEN_DURATION   = 3600;      // 1hr deposit window
const LIVE_DURATION   = 5400;      // 1.5hr match
const SETTLED_DURATION = 3600;     // 1hr cooldown

function getScheduleForDay(dayTs: number) {
  // dayTs = midnight UTC of some day
  return MATCHES.map((m, i) => ({
    ...m,
    depositStart: dayTs + i * MATCH_DURATION * 1000,
    kickoff:      dayTs + (i * MATCH_DURATION + OPEN_DURATION) * 1000,
    matchEnd:     dayTs + (i * MATCH_DURATION + OPEN_DURATION + LIVE_DURATION) * 1000,
    slotEnd:      dayTs + (i + 1) * MATCH_DURATION * 1000,
  }));
}

/* ══════════════════════════════════════════════════
   Engine — schedule-driven, no tick loop needed
   ══════════════════════════════════════════════════ */
export class SimEngine {
  private match: SimMatch | null = null;
  private matchIndex = 0;
  private totalMatches = 0;
  private round = 1;
  private running = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private deployedPools: DeployedPool[] = [];
  private eventTimer = 0;
  private goalCluster = 0;

  /* Real contract integration */
  public onSettle: ((matchId: string, winner: TeamSide, homeScore: number, awayScore: number, poolAddress: string) => void) | null = null;
  public deployPoolForMatch: ((matchId: string, homeTeam: string, awayTeam: string, token: string) => Promise<string | null>) | null = null;
  /** Pre-loaded pool addresses from Supabase / on-chain — keyed by matchId */
  public poolRegistry: Map<string, string> = new Map();
  /** Pre-loaded pool addresses — aliased for backward compat */
  public onNewMatch: ((matchId: string, homeTeam: string, awayTeam: string, tokenAddress: string) => Promise<string | null>) | null = null;

  constructor() {
    this.syncFromSchedule();
    this.start();
  }

  /* ─── Schedule computation ─── */
  private getCurrentSlot(): { idx: number; depositStart: number; kickoff: number; matchEnd: number; slotEnd: number } | null {
    const now = Date.now();
    const midnight = new Date(Date.UTC(
      new Date(now).getUTCFullYear(),
      new Date(now).getUTCMonth(),
      new Date(now).getUTCDate(),
    )).getTime();

    // Check today's slots
    for (let i = 0; i < 5; i++) {
      const depositStart = midnight + i * MATCH_DURATION * 1000;
      const kickoff = midnight + (i * MATCH_DURATION + OPEN_DURATION) * 1000;
      const matchEnd = midnight + (i * MATCH_DURATION + OPEN_DURATION + LIVE_DURATION) * 1000;
      const slotEnd = midnight + (i + 1) * MATCH_DURATION * 1000;
      if (now >= depositStart && now < slotEnd) {
        return { idx: i, depositStart, kickoff, matchEnd, slotEnd };
      }
    }
    return null; // between last slot and midnight — gap
  }

  /** Sync match state from the wall-clock schedule */
  private syncFromSchedule(): boolean {
    const slot = this.getCurrentSlot();
    if (!slot) {
      this.match = null;
      this.matchIndex = -1;
      return false;
    }

    const now = Date.now();
    const pairing = MATCHES[slot.idx];
    const phase: SimPhase = now < slot.kickoff ? 'open'
      : now < slot.matchEnd ? 'live'
      : 'settled';

    // Check if we already have the right match
    if (this.match && this.match.id === pairing.id && this.match.phase === phase) {
      // Same match and phase — just update elapsed
      this.match.phaseElapsed = Math.floor((now - this.match.phaseStartedAt) / 1000);
      return true;
    }

    // New match or phase change
    const phaseStartedAt = phase === 'open' ? slot.depositStart
      : phase === 'live' ? slot.kickoff
      : slot.matchEnd;

    // Preserve events if same match but new phase
    const sameMatch = !!(this.match && this.match.id === pairing.id);
    const existingEvents = sameMatch ? this.match!.events : [];
    const existingScore = sameMatch ? { ...this.match!.score } : { home: 0, away: 0 };
    const existingGoals = sameMatch ? { ...this.match!.goals } : { home: 0, away: 0 };
    const existingMomentum = sameMatch ? this.match!.momentumHome : 50;

    const poolAddr = this.poolRegistry.get(pairing.id) || null;

    // Trigger auto-settle if moving into settled phase
    if (phase === 'settled' && !sameMatch && poolAddr && this.onSettle) {
      const winner: TeamSide =
        existingScore.home > existingScore.away ? 'home'
        : existingScore.away > existingScore.home ? 'away'
        : Math.random() < 0.5 ? 'home' : 'away';
      this.onSettle(pairing.id, winner, existingScore.home, existingScore.away, poolAddr);
    }

    this.match = {
      id: pairing.id,
      homeTeam: pairing.home,
      awayTeam: pairing.away,
      phase,
      phaseElapsed: Math.floor((now - phaseStartedAt) / 1000),
      phaseStartedAt,
      score: existingScore,
      goals: existingGoals,
      events: existingEvents,
      momentumHome: existingMomentum,
      deposits: { home: 0, away: 0 },
      round: this.round,
      poolAddress: poolAddr,
      tokenAddress: pairing.token,
      settledOnChain: phase === 'settled',
    };

    this.matchIndex = slot.idx;
    if (!sameMatch) {
      this.totalMatches++;
      this.eventTimer = 0;
      this.goalCluster = 0;
    }

    // Trigger pool deploy if needed (only when entering open phase for the first time)
    if (phase === 'open' && !poolAddr && this.deployPoolForMatch) {
      this.deployPoolForMatch(pairing.id, pairing.home, pairing.away, pairing.token).then(addr => {
        if (addr && this.match && this.match.id === pairing.id) {
          this.match.poolAddress = addr;
          this.poolRegistry.set(pairing.id, addr);
          this.deployedPools.push({
            poolAddress: addr,
            matchId: pairing.id,
            homeTeam: pairing.home,
            awayTeam: pairing.away,
            tokenAddress: pairing.token,
            deployedAt: Date.now(),
          });
        }
      }).catch(err => console.error(`[sim] Pool deploy failed for ${pairing.id}:`, err));
    }

    return true;
  }

  /* ─── Lifecycle ─── */
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

  /* ─── Tick — sync schedule + simulate live events ─── */
  private tick() {
    this.syncFromSchedule();
    if (this.match && this.match.phase === 'live') {
      this.match.phaseElapsed = Math.floor((Date.now() - this.match.phaseStartedAt) / 1000);
      this.simulateEvents();
    }
  }

  /* ─── State ─── */
  getState(): SimState {
    const now = Date.now();
    const midnight = new Date(Date.UTC(
      new Date(now).getUTCFullYear(),
      new Date(now).getUTCMonth(),
      new Date(now).getUTCDate(),
    )).getTime();

    // Find next upcoming match
    let nextUp: { id: string; homeTeam: string; awayTeam: string } | null = null;
    const slot = this.getCurrentSlot();
    const nextIdx = slot ? (slot.idx + 1) % 5 : 0;
    const nextMatch = MATCHES[nextIdx];
    const nextStart = slot
      ? midnight + (nextIdx < 5 ? nextIdx : 0) * MATCH_DURATION * 1000
      : midnight; // no current match means next is match 0 at midnight

    if (!slot) {
      // In the gap — next match is midnight
      nextUp = { id: MATCHES[0].id, homeTeam: MATCHES[0].home, awayTeam: MATCHES[0].away };
    } else {
      nextUp = { id: nextMatch.id, homeTeam: nextMatch.home, awayTeam: nextMatch.away };
    }

    const match = this.match ? {
      ...this.match,
      phaseElapsed: Math.floor((Date.now() - this.match.phaseStartedAt) / 1000),
      events: this.match.events.slice(-50),
    } : null;

    return {
      match,
      nextUp,
      matchIndex: this.matchIndex,
      totalMatches: this.totalMatches,
      tick: 0,
      running: this.running,
      deployedPools: this.deployedPools,
    };
  }

  /* ─── Deposit (mock) ─── */
  deposit(team: TeamSide, amount: number): boolean {
    if (!this.match || this.match.phase !== 'open') return false;
    this.match.deposits[team] += amount;
    return true;
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
    return { won: true, payout: total * 0.98 * share };
  }

  /* ─── Pool management ─── */
  setPoolAddress(address: string) {
    if (this.match) {
      this.match.poolAddress = address;
      this.poolRegistry.set(this.match.id, address);
      this.deployedPools.push({
        poolAddress: address,
        matchId: this.match.id,
        homeTeam: this.match.homeTeam,
        awayTeam: this.match.awayTeam,
        tokenAddress: this.match.tokenAddress,
        deployedAt: Date.now(),
      });
    }
  }

  /* ═══════════════════════════════════════════
     Event Generation (unchanged from original)
     ═══════════════════════════════════════════ */
  private simulateEvents() {
    if (!this.match) return;
    this.eventTimer -= 1;
    if (this.eventTimer > 0) return;
    this.eventTimer = randomInt(60, 240);

    const minute = this.match.phaseElapsed;
    const lateBonus = minute > LIVE_DURATION - 600 ? 1.5 : 1.0;
    const roll = Math.random() * 100;
    const homeProb = this.match.momentumHome / 100;
    const team: TeamSide = Math.random() < homeProb ? 'home' : 'away';

    if (roll < 4 * lateBonus) {
      this.match.score[team] += 3;
      this.match.goals[team] += 1;
      this.match.events.push({ minute, type: 'goal', team, player: getRandomPlayer(team === 'home' ? this.match.homeTeam : this.match.awayTeam) });
      if (Math.random() < 0.25 && !this.goalCluster) {
        this.goalCluster = 1;
        setTimeout(() => { this.goalCluster = 0; }, 8000);
      }
      this.match.momentumHome += team === 'home' ? 12 : -12;
    } else if (roll < 10 * lateBonus) {
      const opp: TeamSide = team === 'home' ? 'away' : 'home';
      this.match.score[opp] += 2;
      this.match.events.push({ minute, type: 'red_card', team, player: getRandomPlayer(team === 'home' ? this.match.homeTeam : this.match.awayTeam) });
      this.match.momentumHome += team === 'home' ? -15 : 15;
    } else if (roll < 22 * lateBonus) {
      const opp: TeamSide = team === 'home' ? 'away' : 'home';
      this.match.score[opp] += 1;
      this.match.events.push({ minute, type: 'yellow_card', team, player: getRandomPlayer(team === 'home' ? this.match.homeTeam : this.match.awayTeam) });
      this.match.momentumHome += team === 'home' ? -5 : 5;
    } else if (roll < 35 * lateBonus) {
      this.match.score[team] += 1;
      this.match.events.push({ minute, type: 'corner', team, player: '' });
      this.match.momentumHome += team === 'home' ? 1 : -1;
    } else if (roll < 55 * lateBonus) {
      this.match.score[team] += 1;
      this.match.events.push({ minute, type: 'woodwork', team, player: getRandomPlayer(team === 'home' ? this.match.homeTeam : this.match.awayTeam) });
      this.match.momentumHome += team === 'home' ? 2 : -2;
    } else if (roll < 75 * lateBonus) {
      this.match.score[team] += 1;
      this.match.events.push({ minute, type: 'shot_on_target', team, player: getRandomPlayer(team === 'home' ? this.match.homeTeam : this.match.awayTeam) });
      this.match.momentumHome += team === 'home' ? 1.5 : -1.5;
    } else {
      this.match.events.push({ minute, type: 'foul', team, player: getRandomPlayer(team === 'home' ? this.match.homeTeam : this.match.awayTeam) });
      this.match.momentumHome += team === 'home' ? -0.5 : 0.5;
    }

    this.match.momentumHome = Math.max(0, Math.min(100, this.match.momentumHome));
    this.match.momentumHome += (Math.random() - 0.5) * 2;
    this.match.momentumHome = Math.max(5, Math.min(95, this.match.momentumHome));
  }
}

/* ─── Singleton access ─── */
export function getEngine(): SimEngine {
  if (!(globalThis as any).__simEngine) {
    (globalThis as any).__simEngine = new SimEngine();
  }
  return (globalThis as any).__simEngine;
}

/** Load pool addresses from Supabase into the engine registry */
export async function loadPoolRegistry(): Promise<void> {
  try {
    const { getDeployedPools } = await import('@/lib/supabase');
    const rows = await getDeployedPools();
    const engine = getEngine();
    const deployed: DeployedPool[] = [];
    for (const row of rows) {
      const poolAddr = row.pool_address.toLowerCase();
      if (!engine.poolRegistry.has(row.match_id)) {
        engine.poolRegistry.set(row.match_id, poolAddr);
      }
      deployed.push({
        poolAddress: poolAddr,
        matchId: row.match_id,
        homeTeam: row.home_team,
        awayTeam: row.away_team,
        tokenAddress: row.token_address,
        deployedAt: new Date(row.created_at).getTime(),
      });
    }
    engine['deployedPools'] = deployed;
  } catch { /* silence */ }
}
