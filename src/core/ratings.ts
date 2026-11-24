import { ADJACENT, COMPILED_WEIGHTS, POSITIONS, type Position } from './data/positions';
import type { Player } from './types';

/** Position OVR from attributes (weighted mean; DESIGN 4.3 with a=1, b=0). */
export function posOvr(attrs: number[], pos: Position): number {
  const cw = COMPILED_WEIGHTS[pos];
  let s = 0;
  for (let i = 0; i < cw.idx.length; i++) s += attrs[cw.idx[i]] * cw.w[i];
  const v = Math.round(s / cw.total);
  return v < 1 ? 1 : v > 100 ? 100 : v;
}

export function familiarityMult(p: Player, pos: Position): number {
  const f = p.fam[pos];
  if (f === 'N') return 1;
  if (f === 'A') return 0.95;
  if (pos === 'GK' || p.pos === 'GK') return 0.4;
  for (const own of Object.keys(p.fam) as Position[]) if (ADJACENT[own].includes(pos)) return 0.85;
  return 0.7;
}

/** Effective OVR when playing `pos` (familiarity + fitness), before match-day morale. */
export function effectiveOvr(p: Player, pos: Position): number {
  const base = posOvr(p.attrs, pos) * familiarityMult(p, pos);
  return base * fitnessMult(p.fitness);
}

export function fitnessMult(fitness: number): number {
  if (fitness >= 70) return 1;
  if (fitness <= 40) return 0.85;
  return 0.85 + ((fitness - 40) / 30) * 0.15;
}

/** Recompute cached OVR (best natural position). */
export function recomputeOvr(p: Player): void {
  let best = 0;
  for (const pos of Object.keys(p.fam) as Position[]) {
    if (p.fam[pos] !== 'N') continue;
    best = Math.max(best, posOvr(p.attrs, pos));
  }
  p.ovr = best || posOvr(p.attrs, p.pos);
}

export function bestPositions(p: Player): Position[] {
  return POSITIONS.filter((pos) => p.fam[pos]);
}

export function age(p: Player, season: number): number {
  return season - p.birthYear;
}
