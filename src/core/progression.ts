import { A, ATTRS, COMPILED_WEIGHTS, LINE } from './data/positions';
import { recomputeOvr } from './ratings';
import { clamp, type Rng } from './rng';
import type { Player } from './types';

/** Expected OVR change per season for a standard player at this age (DESIGN 10.2). */
export function ageCurve(age: number): number {
  if (age <= 19) return 4.5;
  if (age <= 23) return 2.5;
  if (age <= 26) return 0.4;
  if (age <= 29) return -0.6;
  if (age <= 32) return -2.5;
  return -5;
}

export interface DevContext {
  playtime: number; // 0..1 share of minutes
  coach: number; // 1..100 relevant coach level
  facility: number; // 1..10 training facility level
  bonus?: number; // extra growth factor (facility upgrades), e.g. 0.05 = +5%
}

export const DEFAULT_DEV: DevContext = { playtime: 0.5, coach: 30, facility: 2 };

/**
 * Develop a player over `fraction` of a season (1 = yearly, 1/12 = monthly).
 * Returns the OVR change.
 */
export function developPlayer(rng: Rng, p: Player, age: number, ctx: DevContext, fraction: number): number {
  let effAge = age;
  if (p.dev === 'early') effAge = age + p.devShift;
  else if (p.dev === 'late') effAge = age - p.devShift;
  else if (p.dev === 'decliner') effAge = age >= 24 ? age + p.devShift : age;
  let curve = ageCurve(effAge);
  const gap = p.pot - p.ovr;
  if (curve > 0) {
    // growth slows as the player nears potential; cannot exceed POT (except 'random')
    const gapF = clamp(gap / 8, 0, 1.3);
    curve *= gapF;
  }
  const play = 0.6 + clamp(ctx.playtime, 0, 1) * 0.6;
  const coach = 0.85 + (ctx.coach / 100) * 0.4;
  const fac = 0.9 + ((ctx.facility - 1) / 9) * 0.25;
  let change = curve > 0 ? curve * play * coach * fac * (1 + (ctx.bonus ?? 0)) : curve / (0.6 + 0.4 * coach * fac);
  change *= fraction;
  const noiseSd = (p.dev === 'random' ? 3 : 1.2) * Math.sqrt(fraction);
  change += rng.normal(0, noiseSd);
  if (p.dev !== 'random' && curve > 0) change = Math.min(change, Math.max(0, gap));
  if (Math.abs(change) < 0.05) return 0;
  applyOvrChange(rng, p, change, age);
  return change;
}

/** Spread an OVR change across attributes (key attributes for the position move most). */
export function applyOvrChange(rng: Rng, p: Player, change: number, age: number): void {
  const before = p.ovr;
  const cw = COMPILED_WEIGHTS[p.pos];
  const keyIdx = new Set<number>(Array.from(cw.idx));
  const physical = [A.pace, A.acceleration, A.stamina, A.agility, A.strength, A.jumping];
  const isGk = LINE[p.pos] === 'GK';
  // Accumulate fractional changes so small monthly steps still move integers over time.
  for (let i = 0; i < ATTRS.length; i++) {
    if (!isGk && i >= A.reflexes) continue;
    let w = keyIdx.has(i) ? 1.15 : 0.55;
    if (change < 0 && physical.includes(i)) w *= age >= 31 ? 1.8 : 1.2;
    if (change > 0 && physical.includes(i) && age >= 28) w *= 0.3;
    const delta = change * w + rng.normal(0, 0.35);
    const v = p.attrs[i] + delta;
    // probabilistic rounding keeps expected value
    const fl = Math.floor(v);
    p.attrs[i] = clamp(fl + (rng.next() < v - fl ? 1 : 0), 1, 99);
  }
  recomputeOvr(p);
  // nudge to make the realised change track the target
  const realised = p.ovr - before;
  if (Math.round(change) !== 0 && Math.sign(realised) !== Math.sign(change)) {
    for (const i of cw.idx) p.attrs[i] = clamp(p.attrs[i] + Math.sign(change), 1, 99);
    recomputeOvr(p);
  }
  if (p.dev === 'random' && p.ovr > p.pot) p.pot = p.ovr;
  if (p.ovr > p.pot && p.dev !== 'random') p.pot = p.ovr;
}

/** Chance that a player retires this summer. */
export function retireChance(age: number, isGk: boolean, ovr: number): number {
  const a = isGk ? age - 2 : age;
  if (a < 33) return 0;
  if (a >= 40) return 1;
  const base = (a - 32) * 0.13;
  return clamp(base - (ovr > 70 ? 0.05 : 0), 0, 1);
}
