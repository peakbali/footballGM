import type { Position } from './data/positions';
import { effectiveOvr } from './ratings';
import { clamp, type Rng } from './rng';
import { autoPick, unitRatings, type Lineup, type UnitRatings } from './selection';
import { computeTraits, finishQ, keeperQ, takerQ, type Traits } from './traits';
import type { Club, MatchEvent, MatchReport, MatchStats, Player } from './types';

/** Tunables (calibrated with scripts/simulate.ts). */
export const TUNE = {
  baseGoals: 1.35,
  k: 0.07,
  homeAdv: 1.13,
  awayAdv: 0.91,
  avgShotXg: 0.11,
  moralePts: 1.6, // OVR points at morale extremes
  // attribute traits (DESIGN 6.2a)
  traitW: 0.4, // share of the strength difference that comes from attribute traits rather than position ratings
  wPace: 0.3, wCreate: 0.4, wAir: 0.3, // weights inside the trait part
  offPace: 1, offCreate: -1.5, offAir: -2, // population means of (attack trait - defence trait), so equal teams stay equal
  finC: 8, // population mean of (finishing quality - keeper quality)
  finK: 0.022, // goal probability change per point of finishing vs keeper quality
  lateK: 0.2, // late-game xG swing per point of stamina edge (per 20 points)
};

export interface Side {
  club: Club;
  lineup: Lineup;
  units: UnitRatings;
  morale: number; // 0..100
  tr: Traits;
}

export function makeSide(club: Club, squad: Player[]): Side {
  const lineup = autoPick(squad, club.formation);
  const units = unitRatings(lineup);
  const xi = lineup.xi.filter(Boolean) as Player[];
  const morale = xi.length ? xi.reduce((s, p) => s + p.morale, 0) / xi.length : 60;
  return { club, lineup, units, morale, tr: computeTraits(lineup) };
}

/** Expected goals for `a` against `b` (shared by full and bulk sim so leagues stay consistent). */
export function expectedGoals(a: UnitRatings, b: UnitRatings, moraleA: number, moraleB: number, home: boolean, ta?: Traits, tb?: Traits): number {
  const mor = ((moraleA - 60) / 40 - (moraleB - 60) / 40) * TUNE.moralePts;
  const defB = b.def * 0.8 + b.gk * 0.2;
  let diff = (a.att - defB) * 0.6 + (a.mid - b.mid) * 0.4;
  if (ta && tb) {
    // attributes: pace against the back line, creativity against defensive work, aerial strength against aerial defence
    const tr = TUNE.wPace * (ta.paceA - tb.paceD - TUNE.offPace) + TUNE.wCreate * (ta.create - tb.stop - TUNE.offCreate) + TUNE.wAir * (ta.airA - tb.airD - TUNE.offAir);
    diff = diff * (1 - TUNE.traitW) + tr * TUNE.traitW;
  }
  diff += mor;
  const adv = home ? TUNE.homeAdv : TUNE.awayAdv;
  return clamp(TUNE.baseGoals * Math.exp(TUNE.k * diff) * adv, 0.15, 5);
}

const SHOOT_W: Record<Position, number> = { GK: 0, CB: 0.5, LB: 0.4, RB: 0.4, LWB: 0.6, RWB: 0.6, DM: 0.7, CM: 1.4, AM: 2.8, LM: 1.5, RM: 1.5, LW: 3, RW: 3, ST: 5 };
const ASSIST_W: Record<Position, number> = { GK: 0.05, CB: 0.4, LB: 1.4, RB: 1.4, LWB: 2, RWB: 2, DM: 1.2, CM: 2.4, AM: 4, LM: 3, RM: 3, LW: 3, RW: 3, ST: 2 };

type ShotKind = 'open' | 'brk' | 'head' | 'long';
const XG_MU: Record<ShotKind, number> = { open: -2.5, brk: -2.0, head: -2.8, long: -3.1 };
const LONG_W: Record<Position, number> = { GK: 0, CB: 0.4, LB: 0.5, RB: 0.5, LWB: 0.8, RWB: 0.8, DM: 2, CM: 3, AM: 3.4, LM: 2, RM: 2, LW: 1.6, RW: 1.6, ST: 1.8 };

interface OnPitch {
  p: Player;
  pos: Position;
  from: number; // minute entered
  to: number; // minute left (90 if full)
  yellow: number;
}

export interface MatchResult {
  hg: number;
  ag: number;
  report?: MatchReport;
  injuries: Player[];
}

/**
 * Event-stream match (DESIGN 6.2). Used for the user's league; `bulk` mode skips event
 * storage but keeps scorers/stats so every simulated league has believable numbers.
 */
export function simulateMatch(rng: Rng, home: Side, away: Side, fixtureId: number, season: number, keepEvents: boolean): MatchResult {
  const sides = [home, away];
  const lam = [
    expectedGoals(home.units, away.units, home.morale, away.morale, true, home.tr, away.tr),
    expectedGoals(away.units, home.units, away.morale, home.morale, false, away.tr, home.tr),
  ];
  const pitch: OnPitch[][] = sides.map((s) => s.lineup.xi.map((p, i) => (p ? { p, pos: s.lineup.slots[i].pos, from: 0, to: 90, yellow: 0 } : null)).filter(Boolean) as OnPitch[]);
  const bench: Player[][] = sides.map((s) => [...s.lineup.bench]);
  const events: MatchEvent[] = [];
  const stats: MatchStats = { shots: [0, 0], onTarget: [0, 0], xg: [0, 0], poss: [50, 50], corners: [0, 0], fouls: [0, 0], yellows: [0, 0], reds: [0, 0] };
  const goals = [0, 0];
  const goalsBy = new Map<number, number>();
  const assistsBy = new Map<number, number>();
  const injuries: Player[] = [];
  const sentOff = new Set<number>();

  const possH = clamp(0.5 + (home.units.mid - away.units.mid) * 0.012 + 0.02, 0.28, 0.72);
  stats.poss = [Math.round(possH * 100), 100 - Math.round(possH * 100)];

  // Build a timeline of incidents.
  type Inc = { m: number; side: number; kind: 'shot' | 'foul' | 'corner' | 'injury' | 'sub' };
  const incs: Inc[] = [];
  for (let s = 0; s < 2; s++) {
    const nShots = rng.poisson(lam[s] / TUNE.avgShotXg);
    for (let i = 0; i < nShots; i++) incs.push({ m: rng.int(1, 93), side: s, kind: 'shot' });
    const nFouls = rng.poisson(10.5);
    for (let i = 0; i < nFouls; i++) incs.push({ m: rng.int(1, 93), side: s, kind: 'foul' });
    const nCorners = rng.poisson(2 + lam[s] * 2);
    for (let i = 0; i < nCorners; i++) incs.push({ m: rng.int(1, 93), side: s, kind: 'corner' });
    for (const m of [rng.int(58, 68), rng.int(68, 78), rng.int(78, 86)]) incs.push({ m, side: s, kind: 'sub' });
  }
  if (rng.chance(0.35)) incs.push({ m: rng.int(5, 88), side: rng.int(0, 1), kind: 'injury' });
  incs.sort((a, b) => a.m - b.m);

  const active = (s: number, m: number) => pitch[s].filter((o) => o.to >= m && o.from <= m && !sentOff.has(o.p.id));
  const strengthFactor = (s: number) => active(s, 0).length / 11;

  for (const inc of incs) {
    const s = inc.side;
    const o = 1 - s;
    const m = Math.min(90, inc.m);
    const on = active(s, m);
    if (!on.length) continue;
    const club = sides[s].club.id;
    if (inc.kind === 'shot') {
      // Fewer players = fewer and worse chances
      if (rng.next() > strengthFactor(s) * (2 - strengthFactor(o))) continue;
      // what kind of chance: a run in behind (pace), a header from a cross or corner (aerial), a shot from range, or open play
      const trS = sides[s].tr, trO = sides[o].tr;
      const pBrk = clamp(0.13 + (trS.paceA - trO.paceD - TUNE.offPace) * 0.004, 0.04, 0.26);
      const pHead = clamp(0.17 + (trS.airA - trO.airD - TUNE.offAir) * 0.003, 0.07, 0.3);
      const roll = rng.next();
      const kind: ShotKind = roll < pBrk ? 'brk' : roll < pBrk + pHead ? 'head' : roll < pBrk + pHead + 0.12 ? 'long' : 'open';
      const shooter = rng.weighted(on, (x) => (kind === 'long' ? LONG_W[x.pos] : SHOOT_W[x.pos]) * takerQ[kind](x.p));
      const isPen = rng.chance(0.025);
      const late = clamp((m - 55) / 35, 0, 1);
      const stamEdge = clamp((trO.stam - trS.stam) / 20, -1, 1); // positive: we are the more tired side late on
      const xg = (isPen ? 0.76 : clamp(Math.exp(rng.normal(XG_MU[kind], kind === 'brk' ? 0.7 : 0.85)), 0.01, 0.75)) * (1 - TUNE.lateK * late * stamEdge);
      const oppGk = active(o, m).find((x) => x.pos === 'GK');
      const finish = isPen ? 70 : finishQ[kind](shooter.p);
      const gkQ = oppGk ? keeperQ(oppGk.p, kind === 'head') : 10;
      const pGoal = clamp(xg * Math.exp((finish - gkQ - TUNE.finC) * TUNE.finK), 0.005, 0.95);
      stats.shots[s]++;
      stats.xg[s] += xg;
      if (rng.next() < pGoal) {
        goals[s]++;
        stats.onTarget[s]++;
        goalsBy.set(shooter.p.id, (goalsBy.get(shooter.p.id) ?? 0) + 1);
        let assist: OnPitch | undefined;
        if (!isPen && rng.chance(0.74)) {
          const others = on.filter((x) => x !== shooter);
          if (others.length) assist = rng.weighted(others, (x) => ASSIST_W[x.pos] * (0.5 + x.p.attrs[2] / 100));
          if (assist) assistsBy.set(assist.p.id, (assistsBy.get(assist.p.id) ?? 0) + 1);
        }
        if (keepEvents) events.push({ m, t: isPen ? 'pen' : 'goal', c: club, p: shooter.p.id, p2: assist?.p.id, xg: round2(xg), k: isPen ? undefined : kind, x: rng.int(30, 70), y: rng.int(82, 96) });
      } else {
        const onTarget = rng.chance(0.38);
        if (onTarget) stats.onTarget[s]++;
        if (keepEvents && (xg > 0.12 || rng.chance(0.3))) events.push({ m, t: onTarget ? 'save' : 'miss', c: club, p: shooter.p.id, p2: onTarget ? oppGk?.p.id : undefined, xg: round2(xg), k: kind, x: rng.int(20, 80), y: rng.int(70, 95) });
      }
    } else if (inc.kind === 'foul') {
      stats.fouls[s]++;
      const fouler = rng.weighted(on, (x) => (x.pos === 'GK' ? 0.1 : 1) * (0.6 + x.p.attrs[17] / 100));
      if (rng.chance(0.0045)) {
        sentOff.add(fouler.p.id);
        fouler.to = m;
        stats.reds[s]++;
        if (keepEvents) events.push({ m, t: 'red', c: club, p: fouler.p.id });
      } else if (rng.chance(0.15)) {
        fouler.yellow++;
        stats.yellows[s]++;
        if (fouler.yellow >= 2) {
          sentOff.add(fouler.p.id);
          fouler.to = m;
          stats.reds[s]++;
          if (keepEvents) events.push({ m, t: 'red', c: club, p: fouler.p.id });
        } else if (keepEvents) events.push({ m, t: 'yellow', c: club, p: fouler.p.id });
      }
    } else if (inc.kind === 'corner') {
      stats.corners[s]++;
    } else if (inc.kind === 'injury') {
      const victim = rng.weighted(on, (x) => 0.5 + x.p.proneness / 50);
      injuries.push(victim.p);
      if (keepEvents) events.push({ m, t: 'injury', c: club, p: victim.p.id });
      substitute(rng, pitch[s], bench[s], victim, m, events, club, keepEvents);
    } else if (inc.kind === 'sub') {
      // replace the most tired / weakest outfield player
      const cands = on.filter((x) => x.pos !== 'GK' && x.from === 0);
      if (!cands.length || !bench[s].length) continue;
      const tired = cands.reduce((a, b) => (a.p.ovr + a.p.attrs[21] / 10 < b.p.ovr + b.p.attrs[21] / 10 ? a : b)); // weakest, low stamina first
      substitute(rng, pitch[s], bench[s], tired, m, events, club, keepEvents);
    }
  }

  // Ratings & stats
  const ratings: Record<number, number> = {};
  for (let s = 0; s < 2; s++) {
    const conceded = goals[1 - s];
    const diff = goals[s] - conceded;
    for (const o of pitch[s]) {
      const mins = Math.max(1, o.to - o.from);
      let r = 6.2 + diff * 0.25 + rng.normal(0, 0.45);
      r += (goalsBy.get(o.p.id) ?? 0) * 1.0 + (assistsBy.get(o.p.id) ?? 0) * 0.6;
      if ((o.pos === 'GK' || o.pos === 'CB' || o.pos === 'LB' || o.pos === 'RB') && conceded === 0) r += 0.6;
      if (o.pos === 'GK') r -= conceded * 0.25;
      if (sentOff.has(o.p.id)) r -= 1.5;
      r = clamp(r, 3, 10);
      ratings[o.p.id] = Math.round(r * 10) / 10;
      const st = o.p.stats;
      st.apps++;
      st.mins += mins;
      st.goals += goalsBy.get(o.p.id) ?? 0;
      st.assists += assistsBy.get(o.p.id) ?? 0;
      st.yel += Math.min(o.yellow, 1);
      st.ratingSum += r;
      if (conceded === 0 && (o.pos === 'GK' || o.pos === 'CB' || o.pos === 'LB' || o.pos === 'RB') && mins >= 60) st.cs++;
      if (sentOff.has(o.p.id)) {
        st.red++;
        o.p.ban += o.yellow >= 2 ? 1 : 1 + (rng.chance(0.4) ? 2 : 0);
      } else if (o.yellow) {
        o.p.yellowAcc++;
        if (o.p.yellowAcc % 5 === 0) o.p.ban += 1;
      }
    }
  }

  let report: MatchReport | undefined;
  if (keepEvents) {
    events.sort((a, b) => a.m - b.m);
    events.unshift({ m: 0, t: 'ko', c: home.club.id });
    events.push({ m: 90, t: 'ft', c: home.club.id });
    stats.xg = [round2(stats.xg[0]), round2(stats.xg[1])];
    let motm: number | undefined;
    let best = 0;
    for (const [id, r] of Object.entries(ratings)) if (r > best) { best = r; motm = +id; }
    report = { fixtureId, season, events, stats, lineups: [pitch[0].map((o) => o.p.id), pitch[1].map((o) => o.p.id)], ratings, motm, keys: keyMatchups(home.tr, away.tr) };
  }
  return { hg: goals[0], ag: goals[1], report, injuries };
}

/** The biggest attribute edges between the two sides, for the match report (DESIGN 6.2a). */
function keyMatchups(th: Traits, ta: Traits): NonNullable<MatchReport['keys']> {
  const all: { label: string; side: number; a: number; d: number; note: string; gap: number }[] = [];
  const dir = (side: number, tx: Traits, ty: Traits) => {
    all.push({ label: 'Pace', side, a: tx.paceA, d: ty.paceD, note: 'quick forwards against a slower back line', gap: tx.paceA - ty.paceD - TUNE.offPace });
    all.push({ label: 'Creativity', side, a: tx.create, d: ty.stop, note: 'passing and movement beat the defensive work', gap: tx.create - ty.stop - TUNE.offCreate });
    all.push({ label: 'Aerial', side, a: tx.airA, d: ty.airD, note: 'dangerous on crosses and set pieces', gap: tx.airA - ty.airD - TUNE.offAir });
  };
  dir(0, th, ta);
  dir(1, ta, th);
  const st = th.stam - ta.stam;
  all.push({ label: 'Stamina', side: st > 0 ? 0 : 1, a: Math.max(th.stam, ta.stam), d: Math.min(th.stam, ta.stam), note: 'fitter legs late in the game', gap: Math.abs(st) });
  return all
    .filter((x) => x.gap >= 4)
    .sort((x, y) => y.gap - x.gap)
    .slice(0, 3)
    .map(({ gap: _g, ...r }) => ({ ...r, a: Math.round(r.a), d: Math.round(r.d) }));
}

function substitute(rng: Rng, pitch: OnPitch[], bench: Player[], out: OnPitch, m: number, events: MatchEvent[], club: number, keep: boolean) {
  if (!bench.length) return;
  // pick the bench player best suited to the position
  let bi = 0;
  let best = -1;
  bench.forEach((p, i) => {
    if (p.pos === 'GK' && out.pos !== 'GK') return;
    const v = effectiveOvr(p, out.pos) + rng.next();
    if (v > best) { best = v; bi = i; }
  });
  const inP = bench.splice(bi, 1)[0];
  out.to = m;
  pitch.push({ p: inP, pos: out.pos, from: m, to: 90, yellow: 0 });
  if (keep) events.push({ m, t: 'sub', c: club, p: inP.id, p2: out.p.id });
}

function round2(v: number) {
  return Math.round(v * 100) / 100;
}

/** Penalty shoot-out winner (0 home / 1 away) and score string. */
export function shootout(rng: Rng): { winner: number; score: string } {
  let h = 0, a = 0;
  for (let i = 0; i < 5; i++) {
    if (rng.chance(0.76)) h++;
    if (rng.chance(0.76)) a++;
  }
  while (h === a) {
    if (rng.chance(0.76)) h++;
    if (rng.chance(0.76)) a++;
  }
  return { winner: h > a ? 0 : 1, score: `${h}-${a}` };
}
