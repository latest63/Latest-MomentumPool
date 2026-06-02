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

import { saveMatchState, loadMatchState, MatchState } from '@/lib/supabase';

/* ─── Player name pools (last names for clean display) ─── */
const PLAYERS: Record<string, string[]> = {
  Nigeria: ['Osimhen','Lookman','Iwobi','Chukwueze','Boniface','Simon','Nwabali','Bassey','Ndidi','Onyeka','Aina','Yusuf'],
  Brazil: ['Vinicius','Rodrygo','Raphinha','Neymar','Martinelli','Casemiro','Militao','Alisson','Paqueta','Guimaraes','Jesus','Endrick'],
  Argentina: ['Messi','Alvarez','Martinez','Fernandez','MacAllister','Romero','Molina','Dybala','Di Maria','Paredes','De Paul','Garnacho'],
  France: ['Mbappe','Griezmann','Dembele','Tchouameni','Camavinga','Kolo Muani','Thuram','Upamecano','Hernandez','Kante','Olise','Zaire-Emery'],
  England: ['Kane','Bellingham','Saka','Foden','Rice','Palmer','Rashford','Stones','Alexander-Arnold','Gordon','Watkins','Grealish'],
  Germany: ['Musiala','Wirtz','Havertz','Kimmich','Sane','Gundogan','Fullkrug','Tah','Raum','Andrich','Muller','Neuer'],
  Portugal: ['Ronaldo','Fernandes','Leao','Bernardo','Dias','Jota','Neto','Vitinha','Palhinha','Cancelo','Conceicao','Ramos'],
  Spain: ['Rodri','Yamal','Williams','Olmo','Morata','Ruiz','Pedri','Gavi','Carvajal','Oyarzabal','Merino','Cucurella'],
  Morocco: ['Hakimi','Ziyech','En-Nesyri','Amrabat','Bounou','Saiss','Harit','Chair','El Khannouss','Mazraoui','Aguerd','Rahimi'],
  Senegal: ['Mane','Sarr','Koulibaly','Gueye','Mendy','Diallo','Ndiaye','Jakobs','Diatta','Camara','Sarr Jr','Kouyate'],
};

function pick(arr: string[]): string { return arr[Math.floor(Math.random() * arr.length)]; }
function getPlayer(team: string): string {
  const pool = PLAYERS[team] || PLAYERS['Nigeria'];
  return pick(pool);
}
function coinFlip(): boolean { return Math.random() < 0.5; }

/* ─── Team playstyle fingerprints (subtly bias event probabilities) ─── */
type StyleKey = 'attack'|'flair'|'defense'|'cards'|'physical';
const STYLE: Record<string, Record<StyleKey, number>> = {
  Nigeria:  { attack: 1.25, flair: 1.10, defense: 0.85, cards: 0.8,  physical: 0.9 },
  Brazil:   { attack: 1.30, flair: 1.40, defense: 0.70, cards: 0.75, physical: 0.8 },
  Argentina:{ attack: 1.15, flair: 1.20, defense: 0.95, cards: 1.15, physical: 1.0 },
  France:   { attack: 1.20, flair: 1.15, defense: 1.00, cards: 0.9,  physical: 1.1 },
  England:  { attack: 1.10, flair: 0.90, defense: 1.05, cards: 1.2,  physical: 1.15 },
  Germany:  { attack: 1.15, flair: 0.95, defense: 1.10, cards: 0.85, physical: 1.05 },
  Portugal: { attack: 1.20, flair: 1.25, defense: 0.90, cards: 1.0,  physical: 0.95 },
  Spain:    { attack: 1.10, flair: 1.30, defense: 1.00, cards: 0.75, physical: 0.8 },
  Morocco:  { attack: 0.90, flair: 0.85, defense: 1.25, cards: 1.3,  physical: 1.25 },
  Senegal:  { attack: 1.05, flair: 0.90, defense: 1.15, cards: 1.35, physical: 1.3 },
};

/* ─── Event type catalog (26 types) ───
   Each: [baseWeight, scoreImpact, momentumShift, description template]
   {player} and {team} are interpolated at generation time.              */
const EVENT_CATALOG: [string, number, number, number, string][] = [
  ['goal',               6.0,  10, +18, 'GOAL! {player} finds the net!'],
  ['penalty_goal',       1.2,   8, +22, 'PENALTY! {player} converts!'],
  ['header_goal',        2.5,  10, +16, 'HEADER! {player} rises highest!'],
  ['free_kick_goal',     0.8,   9, +24, 'INCREDIBLE FREE KICK! {player} curls it in!'],
  ['long_range_goal',    0.6,  10, +26, 'WHAT A STRIKE! {player} from distance!'],
  ['own_goal',           0.4,  -8, -22, 'OWN GOAL! Disaster for {player}!'],
  ['missed_penalty',     0.6,   0, -14, 'MISSED PENALTY! {player} skies it!'],
  ['goal_disallowed',    0.5,   0,  -6, 'GOAL DISALLOWED! VAR rules it out!'],
  ['woodwork',           4.0,   3,  +6, 'OFF THE POST! {player} inches away!'],
  ['shot_on_target',     9.0,   1,  +3, '{player} forces a save from the keeper.'],
  ['shot_off_target',    8.0,   0,  +1, '{player} drags it wide of the post.'],
  ['big_chance_missed',  3.5,  -1,  -5, 'HUGE MISS! {player} should have scored!'],
  ['great_save',         3.0,   0,  +7, 'INCREDIBLE SAVE to deny {player}!'],
  ['save',               6.0,   0,  +3, 'Keeper gathers {player}\'s effort.'],
  ['corner',             7.0,   0,  +1, 'Corner to {team}.'],
  ['dangerous_cross',    5.0,   0,  +3, 'Dangerous ball in from {player}!'],
  ['through_ball',       4.0,   0,  +3, 'Brilliant through ball by {player}!'],
  ['counter_attack',     3.0,   0,  +5, 'Lightning counter led by {player}!'],
  ['dribble',            5.0,   0,  +2, '{player} dances past two defenders!'],
  ['offside',            4.0,   0,  -2, 'Flag up! {player} strayed offside.'],
  ['yellow_card',        3.5,   0,  -5, 'Yellow card for {player}.'],
  ['second_yellow',      0.5,   0, -20, 'SECOND YELLOW! {player} is off!'],
  ['red_card',           1.0,   0, -22, 'RED CARD! {player} sent off!'],
  ['foul',               8.0,   0,  -2, 'Foul by {player} — free kick.'],
  ['injury',             1.5,   0,  -3, '{player} is down receiving treatment.'],
  ['var_review',         1.0,   0,   0, 'VAR check in progress…'],
] as const;
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

/* ─── Fixed UTC schedule (10hr cycle → 12 matches/day) ───
   Each slot = 2 hours: 30min deposit + 60min match + 30min cooldown
   5 matches × 2hr = 10hr cycle → 2.4× per day = 12 pools/day
   No gaps — always a match running                              */
const MATCH_DURATION = 2 * 3600;   // 2 hours per match slot
const OPEN_DURATION   = 1800;      // 30min deposit window
const LIVE_DURATION   = 3600;      // 60min match
const SETTLED_DURATION = 1800;     // 30min cooldown

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

    const elapsed = now - midnight;
    const slotMs = MATCH_DURATION * 1000;
    const totalSlots = Math.floor((24 * 3600 * 1000) / slotMs); // 12
    const slotNumber = Math.floor(elapsed / slotMs);
    if (slotNumber >= totalSlots) return null;

    const matchIdx = slotNumber % 5;
    const depositStart = midnight + slotNumber * slotMs;
    const kickoff = depositStart + OPEN_DURATION * 1000;
    const matchEnd = kickoff + LIVE_DURATION * 1000;
    const slotEnd = depositStart + slotMs;
    return { idx: matchIdx, depositStart, kickoff, matchEnd, slotEnd };
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
    const sameMatch = !!(this.match && this.match.id === pairing.id);
    const phaseStartedAt = phase === 'open' ? slot.depositStart
      : phase === 'live' ? slot.kickoff
      : slot.matchEnd;

    // Load persisted events from Supabase for this match (fire-and-forget)
    if (!sameMatch) {
      loadMatchState(pairing.id).then(s => {
        if (s && this.match && this.match.id === pairing.id) {
          this.match.events = s.events as any[];
          this.match.score = s.score;
          this.match.goals = s.goals;
          this.match.momentumHome = s.momentumHome;
        }
      }).catch(() => {});
    }

    // Preserve events if same match but new phase
    const existingEvents = sameMatch ? this.match!.events : [];
    const existingScore = sameMatch ? { ...this.match!.score } : { home: 0, away: 0 };
    const existingGoals = sameMatch ? { ...this.match!.goals } : { home: 0, away: 0 };
    const existingMomentum = sameMatch ? this.match!.momentumHome : 35 + Math.random() * 30; // 35–65 initial

    // Check for today's pool in registry (keyed by matchId + date)
    const todayKey = `${pairing.id}-${new Date().toISOString().slice(0, 10)}`;
    const poolAddr = this.poolRegistry.get(todayKey) || null;

    // Trigger auto-settle: either cold-start (new match already settled) or live→settled transition
    const shouldSettle = phase === 'settled' && poolAddr && this.onSettle &&
      (!sameMatch || this.match!.phase === 'live');
    if (shouldSettle) {
      const winner: TeamSide =
        existingScore.home > existingScore.away ? 'home'
        : existingScore.away > existingScore.home ? 'away'
        : Math.random() < 0.5 ? 'home' : 'away';
      this.onSettle!(pairing.id, winner, existingScore.home, existingScore.away, poolAddr);
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
    }

    // Trigger pool deploy if needed (deploy fresh each day — timestamps are per-occurrence)
    if (phase === 'open' && !poolAddr && this.deployPoolForMatch) {
      this.deployPoolForMatch(pairing.id, pairing.home, pairing.away, pairing.token).then(addr => {
        if (addr && this.match && this.match.id === pairing.id) {
          this.match.poolAddress = addr;
          const todayKey = `${pairing.id}-${new Date().toISOString().slice(0, 10)}`;
          this.poolRegistry.set(todayKey, addr);
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

    // Find next upcoming match (always the next slot in the cycle)
    let nextUp: { id: string; homeTeam: string; awayTeam: string } | null = null;
    const slot = this.getCurrentSlot();
    if (slot) {
      const nextSlot = (slot.idx + 1) % 5;
      const nextMatch = MATCHES[nextSlot];
      nextUp = { id: nextMatch.id, homeTeam: nextMatch.home, awayTeam: nextMatch.away };
    } else {
      nextUp = { id: MATCHES[0].id, homeTeam: MATCHES[0].home, awayTeam: MATCHES[0].away };
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
     Event Generation with catch-up + persistence
     ═══════════════════════════════════════════ */
  private simulateEvents() {
    if (!this.match) return;

    // Catch-up: compute expected event count based on elapsed match time
    const elapsedSinceLast = this.match.phaseElapsed - (this.match.events.length > 0
      ? this.match.events[this.match.events.length - 1].minute
      : 0);
    const expectedNew = Math.floor(elapsedSinceLast / 80); // ~1 event per 80s average

    // Generate any missing events (cold start catch-up)
    for (let i = 0; i < expectedNew; i++) {
      this.generateEvent();
    }

    // Normal per-tick event generation (rate-limited)
    this.eventTimer -= 1;
    if (this.eventTimer > 0) return;
    this.eventTimer = randomInt(60, 240);

    this.generateEvent();

    // Persist to Supabase after each new event (fire-and-forget)
    if (this.match.events.length > 0) {
      const state: MatchState = {
        events: this.match.events.map(e => ({ minute: e.minute, type: e.type, team: e.team, player: e.player })),
        score: { ...this.match.score },
        goals: { ...this.match.goals },
        momentumHome: this.match.momentumHome,
      };
      saveMatchState(this.match.id, state).catch(() => {});
    }
  }

  /* ─── Dynamic event generation — 26 types, match-state-aware, unpredictably varied ─── */
  private generateEvent() {
    if (!this.match) return;
    const minute = this.match.phaseElapsed;
    const isLateMatch = minute > LIVE_DURATION - 600;   // last 10 min
    const isStoppageTime = minute > LIVE_DURATION - 120; // last 2 min
    const homeScore = this.match.score.home;
    const awayScore = this.match.score.away;
    const diff = homeScore - awayScore;

    // Determine which team is "attacking" based on current momentum + randomness
    const homeWeight = this.match.momentumHome + (Math.random() * 20 - 10);
    const team: TeamSide = homeWeight > 50 ? 'home' : 'away';

    // Get playstyle modifiers for BOTH teams (events can come from either side)
    const attackerStyle = STYLE[team === 'home' ? this.match.homeTeam : this.match.awayTeam] || STYLE['Nigeria'];
    const defenderStyle = STYLE[team === 'home' ? this.match.awayTeam : this.match.homeTeam] || STYLE['Nigeria'];

    // ── Context multipliers ──
    const isAttackerHome = team === 'home';
    const attackerDiff = isAttackerHome ? diff : -diff;
    const isBehind = attackerDiff < 0;
    const isAhead = attackerDiff > 10;
    const isBlowout = Math.abs(diff) > 20;

    // Build weighted event pool
    const pool: { idx: number; weight: number }[] = [];
    let totalWeight = 0;

    for (let i = 0; i < EVENT_CATALOG.length; i++) {
      const [type, baseW] = EVENT_CATALOG[i];
      let w = baseW;

      // ── Attacking team style modifiers ──
      const isAttackingEvent = ['goal','penalty_goal','header_goal','free_kick_goal','long_range_goal','woodwork','shot_on_target','shot_off_target','big_chance_missed','dangerous_cross','through_ball','counter_attack','dribble'].includes(type);
      const isDefensiveEvent = ['save','great_save','clearance','tackle','interception'].includes(type);
      const isCardEvent = ['yellow_card','second_yellow','red_card'].includes(type);
      const isFoulEvent = ['foul','injury'].includes(type);

      if (isAttackingEvent) w *= attackerStyle.attack * attackerStyle.flair;
      if (isDefensiveEvent) w *= defenderStyle.defense;
      if (isCardEvent) w *= attackerStyle.cards;
      if (isFoulEvent) w *= attackerStyle.physical * defenderStyle.physical;

      // ── Match-situation modifiers ──
      // Team behind → more attacking, more desperation
      if (isBehind && isAttackingEvent) w *= 1.3 + Math.abs(attackerDiff) * 0.02;
      if (isBehind) {
        if (type === 'long_range_goal') w *= 1.5;
        if (type === 'counter_attack') w *= 1.3;
      }

      // Team ahead → control the game, fewer risks
      if (isAhead && isAttackingEvent) w *= 0.7;
      if (isAhead && isDefensiveEvent) w *= 1.3;

      // Blowout → chaos, cards, drama
      if (isBlowout && isCardEvent) w *= 1.5;
      if (isBlowout && type === 'red_card') w *= 2.0;
      if (isBlowout && type === 'injury') w *= 1.4;

      // Late match → everything amplified
      if (isLateMatch) {
        if (['goal','header_goal','penalty_goal'].includes(type)) w *= 1.4;
        if (isCardEvent) w *= 1.3;
        if (type === 'big_chance_missed') w *= 1.5;
      }

      // Stoppage time → maximum drama
      if (isStoppageTime) {
        if (['goal','free_kick_goal','long_range_goal','penalty_goal'].includes(type)) w *= 1.8;
        if (type === 'goal_disallowed') w *= 2.0;
        if (type === 'red_card') w *= 1.8;
      }

      // Rare events stay rare (but slightly more likely in drama moments)
      if (['own_goal','missed_penalty','second_yellow','goal_disallowed'].includes(type)) {
        if (!isLateMatch && !isBlowout) w *= 0.7;
      }

      w = Math.max(0.05, w); // never zero — any event is possible at any time
      pool.push({ idx: i, weight: w });
      totalWeight += w;
    }

    // Weighted random pick
    let roll = Math.random() * totalWeight;
    let picked: (typeof EVENT_CATALOG)[number] = EVENT_CATALOG[0];
    let eventIdx = 0;
    for (const entry of pool) {
      roll -= entry.weight;
      if (roll <= 0) { picked = EVENT_CATALOG[entry.idx]; eventIdx = entry.idx; break; }
      picked = EVENT_CATALOG[entry.idx]; eventIdx = entry.idx; // fallback
    }

    const [type, scoreImpact, momentumShift, descTemplate] = picked;

    // ── Apply effects ──
    // Score: additive per-event. Goals give big increments.
    if (scoreImpact !== 0) {
      this.match.score[team] += scoreImpact;
      // own_goal gives score to opponent (handled by negative impact)
      if (type === 'own_goal') {
        const opp: TeamSide = team === 'home' ? 'away' : 'home';
        this.match.score[opp] += Math.abs(scoreImpact);
      }
    }

    // Goal tracking (actual goals, not score events)
    const isGoalEvent = ['goal','penalty_goal','header_goal','free_kick_goal','long_range_goal'].includes(type);
    if (isGoalEvent) {
      this.match.goals[team] += 1;
    }
    if (type === 'own_goal') {
      const opp: TeamSide = team === 'home' ? 'away' : 'home';
      this.match.goals[opp] += 1;
    }

    // Momentum
    let momentumChange = momentumShift;
    // Randomize momentum shift for unpredictability
    momentumChange += (Math.random() - 0.5) * 6;
    if (isStoppageTime) momentumChange *= 1.3;
    this.match.momentumHome += team === 'home' ? momentumChange : -momentumChange;

    // Second yellow / red card → reduce player count effect on momentum
    if (type === 'red_card' || type === 'second_yellow') {
      const extraMomentumPenalty = randomInt(3, 8);
      this.match.momentumHome += team === 'home' ? -extraMomentumPenalty : extraMomentumPenalty;
    }

    // Clamp momentum
    this.match.momentumHome = Math.max(5, Math.min(95, this.match.momentumHome));

    // Natural momentum drift (biased toward 50)
    this.match.momentumHome += (Math.random() - 0.5) * 3;
    this.match.momentumHome = Math.max(5, Math.min(95, this.match.momentumHome));

    // ── Build event ──
    const eventTeam = team === 'home' ? this.match.homeTeam : this.match.awayTeam;
    const desc = String(descTemplate)
      .replace('{player}', getPlayer(eventTeam))
      .replace('{team}', eventTeam);

    this.match.events.push({ minute, type, team, player: getPlayer(eventTeam), description: desc } as any);
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
    const today = new Date().toISOString().slice(0, 10);
    for (const row of rows) {
      const poolAddr = row.pool_address.toLowerCase();
      const createdDate = new Date(row.created_at).toISOString().slice(0, 10);
      const key = `${row.match_id}-${createdDate}`;
      // Registry: key by matchId+date to avoid redeploying today
      if (!engine.poolRegistry.has(key)) {
        engine.poolRegistry.set(key, poolAddr);
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
    // Also check the deployedPools array for today's pools
    const existingDeployed = engine['deployedPools'] as DeployedPool[] || [];
    for (const p of existingDeployed) {
      const d = new Date(p.deployedAt).toISOString().slice(0, 10);
      const key = `${p.matchId}-${d}`;
      if (!engine.poolRegistry.has(key)) {
        engine.poolRegistry.set(key, p.poolAddress);
      }
    }
    engine['deployedPools'] = deployed;
  } catch { /* silence */ }
}
