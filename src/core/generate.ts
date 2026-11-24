import { A, ADJACENT, ATTRS, POSITION_WEIGHTS, type Position } from './data/positions';
import { NAMES, nationalityWeights } from './data/names';
import { DIV_AVG_OVR } from './data/pyramid';
import { marketWage, playerValue } from './data/economy';
import { posOvr, recomputeOvr } from './ratings';
import { clamp, type Rng } from './rng';
import { emptyStats } from './state';
import type { DevType, Player, SquadRole } from './types';

const N_ATTR = ATTRS.length;
const GK_ATTRS = [A.reflexes, A.handling, A.oneOnOnes, A.aerialCommand, A.kicking, A.gkPositioning];

/** Squad template: positions for a 22-man squad. */
export const SQUAD_TEMPLATE: Position[] = [
  'GK', 'GK', 'GK', 'CB', 'CB', 'CB', 'CB', 'LB', 'RB', 'LB', 'DM', 'CM', 'CM', 'CM', 'AM', 'LM', 'RM', 'LW', 'RW', 'ST', 'ST', 'ST',
];

export interface GenOpts {
  ovr: number;
  pos: Position;
  age: number;
  season: number;
  nat?: string;
  div?: number;
  potBoost?: number;
}

export function pickNationality(rng: Rng, div: number): string {
  const w = nationalityWeights(div);
  return rng.weighted(w, (x) => x[1])[0];
}

export function randomName(rng: Rng, nat: string): { first: string; last: string } {
  const pool = NAMES[nat] ?? NAMES.ENG;
  // 20% of non-English-pool players carry an English-style surname/first name mix
  return { first: rng.pick(pool.first), last: rng.pick(pool.last) };
}

/** Realistic age for a senior squad player. */
export function randomAge(rng: Rng): number {
  const r = rng.next();
  if (r < 0.08) return rng.int(17, 19);
  if (r < 0.3) return rng.int(20, 22);
  if (r < 0.7) return rng.int(23, 28);
  if (r < 0.92) return rng.int(29, 32);
  return rng.int(33, 36);
}

export function rollDevType(rng: Rng): { dev: DevType; shift: number } {
  const r = rng.next();
  if (r < 0.7) return { dev: 'standard', shift: 0 };
  if (r < 0.9) {
    const t = rng.pick(['early', 'late', 'decliner'] as const);
    return { dev: t, shift: rng.int(2, 4) };
  }
  return { dev: 'random', shift: 0 };
}

/** Potential given current OVR and age. */
export function rollPotential(rng: Rng, ovr: number, age: number, boost = 0): number {
  if (age >= 29) return ovr;
  const years = Math.max(0, 27 - age);
  const gap = Math.max(0, rng.normal(years * 2.2, 2 + years * 0.9) + boost);
  return clamp(Math.round(ovr + gap), ovr, 99);
}

function genAttrs(rng: Rng, target: number, pos: Position, age: number): number[] {
  const attrs = new Array<number>(N_ATTR);
  const w = POSITION_WEIGHTS[pos];
  const isGk = pos === 'GK';
  for (let i = 0; i < N_ATTR; i++) {
    const name = ATTRS[i];
    const wt = w[name] ?? 0;
    const isGkAttr = GK_ATTRS.includes(i);
    let base: number;
    if (isGk) base = isGkAttr ? target + wt * 2 : target - 14;
    else if (isGkAttr) base = Math.min(25, target * 0.3);
    else base = target + (wt === 3 ? 5 : wt === 2 ? 2 : wt === 1 ? 0 : -6);
    attrs[i] = base + rng.normal(0, 6);
  }
  // Age shaping: young players quicker, older players slower but wiser.
  const physical = [A.pace, A.acceleration, A.stamina, A.agility];
  const mental = [A.decisions, A.composure, A.positioning, A.anticipation, A.leadership];
  const ageAdj = age < 23 ? 3 : age > 30 ? -(age - 30) * 1.5 : 0;
  for (const i of physical) attrs[i] += ageAdj;
  for (const i of mental) attrs[i] -= ageAdj * 0.7;
  // Calibrate so the main position OVR matches the target.
  for (let iter = 0; iter < 3; iter++) {
    const cur = posOvrRaw(attrs, pos);
    const delta = target - cur;
    if (Math.abs(delta) < 0.5) break;
    for (let i = 0; i < N_ATTR; i++) {
      if (!isGk && GK_ATTRS.includes(i)) continue;
      attrs[i] += delta;
    }
  }
  return attrs.map((v) => clamp(Math.round(v), 1, 99));
}

function posOvrRaw(attrs: number[], pos: Position): number {
  return posOvr(attrs.map((v) => clamp(v, 1, 99)), pos);
}

/** Generate a player (no club, no contract). */
export function generatePlayer(rng: Rng, id: number, o: GenOpts): Player {
  const nat = o.nat ?? pickNationality(rng, o.div ?? 9);
  const { first, last } = randomName(rng, nat);
  const ovr = clamp(Math.round(o.ovr), 15, 97);
  const attrs = genAttrs(rng, ovr, o.pos, o.age);
  const fam: Player['fam'] = { [o.pos]: 'N' };
  if (o.pos !== 'GK') {
    const adj = ADJACENT[o.pos];
    const n = rng.chance(0.5) ? 1 : rng.chance(0.3) ? 2 : 0;
    for (let i = 0; i < n; i++) {
      const p2 = rng.pick(adj);
      if (!fam[p2]) fam[p2] = rng.chance(0.55) ? 'A' : 'N';
    }
  }
  const dev = rollDevType(rng);
  const p: Player = {
    id, first, last,
    birthYear: o.season - o.age,
    nat, real: false, clubId: null, academy: false,
    foot: rng.chance(0.24) ? 'L' : rng.chance(0.05) ? 'B' : 'R',
    pos: o.pos, fam, attrs, ovr,
    pot: 0,
    personality: clamp(Math.round(rng.normal(55, 20)), 1, 100),
    dev: dev.dev, devShift: dev.shift,
    proneness: clamp(Math.round(rng.normal(35, 18)), 1, 100),
    consistency: clamp(Math.round(rng.normal(55, 18)), 1, 100),
    morale: 65, fitness: 100, injury: 0, ban: 0, yellowAcc: 0,
    value: 0, contract: null, stats: emptyStats(), career: [],
  };
  recomputeOvr(p);
  p.pot = rollPotential(rng, p.ovr, o.age, o.potBoost);
  p.value = playerValue(p.ovr, p.pot, o.age, 2);
  return p;
}

export function roleForRank(rank: number): SquadRole {
  return rank < 2 ? 'star' : rank < 11 ? 'starter' : rank < 16 ? 'rotation' : 'backup';
}

/** Give a player a permanent contract at a club in division `div`. */
export function signContract(rng: Rng, p: Player, clubId: number, div: number, season: number, role: SquadRole): void {
  const wage = Math.round(marketWage(p.ovr, div, DIV_AVG_OVR[div]) * rng.range(0.85, 1.15));
  p.clubId = clubId;
  p.contract = {
    type: 'permanent',
    wage,
    endSeason: season + rng.int(0, 3),
    role,
    clauses: {},
    signedSeason: season,
  };
  p.value = playerValue(p.ovr, p.pot, season - p.birthYear, p.contract.endSeason - season + 1);
}

/** Generate a full squad for a club at a given strength. */
export function generateSquad(rng: Rng, nextId: () => number, clubId: number, div: number, quality: number, season: number, size = 22): Player[] {
  const avg = DIV_AVG_OVR[div] + quality;
  const out: Player[] = [];
  const tpl = SQUAD_TEMPLATE.slice(0, size);
  while (tpl.length < size) tpl.push(rng.pick(SQUAD_TEMPLATE.slice(3)));
  // Starters around avg, rotation a bit below, backups lower. Rank by position depth.
  const depth: Record<string, number> = {};
  for (const pos of tpl) {
    const d = (depth[pos] = (depth[pos] ?? 0) + 1);
    const starterSlots: Record<string, number> = { GK: 1, CB: 2, ST: 2, CM: 2 };
    const isStarter = d <= (starterSlots[pos] ?? 1);
    const ovrT = avg + (isStarter ? rng.normal(-2.5, 3) : rng.normal(-7, 3.5));
    const a = randomAge(rng);
    const p = generatePlayer(rng, nextId(), { ovr: ovrT, pos, age: a, season, div });
    out.push(p);
  }
  out.sort((x, y) => y.ovr - x.ovr);
  out.forEach((p, i) => signContract(rng, p, clubId, div, season, roleForRank(i)));
  return out;
}
