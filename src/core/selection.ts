import { FORMATIONS, type Slot } from './data/formations';
import { LINE, type Position } from './data/positions';
import { effectiveOvr } from './ratings';
import type { Club, Player } from './types';

export interface Lineup {
  slots: Slot[];
  xi: (Player | null)[]; // same order as slots
  bench: Player[];
}

export function available(p: Player): boolean {
  return p.injury <= 0 && p.ban <= 0 && !p.retired;
}

/** Order slots so scarce positions are filled first. */
const SLOT_ORDER: Position[] = ['GK', 'CB', 'ST', 'LB', 'RB', 'LWB', 'RWB', 'DM', 'AM', 'LW', 'RW', 'LM', 'RM', 'CM'];

/** Auto-pick: best effective OVR per slot (morale aware), honouring locked players. */
export function autoPick(squad: Player[], formation: string, benchSize = 7): Lineup {
  const slots = FORMATIONS[formation] ?? FORMATIONS['4-4-2'];
  const pool = squad.filter((p) => available(p) && !p.academy);
  // fall back to academy players if not enough
  if (pool.length < 11) pool.push(...squad.filter((p) => available(p) && p.academy));
  const used = new Set<number>();
  const xi: (Player | null)[] = new Array(slots.length).fill(null);
  const order = slots.map((s, i) => i).sort((a, b) => SLOT_ORDER.indexOf(slots[a].pos) - SLOT_ORDER.indexOf(slots[b].pos));
  const score = (p: Player, pos: Position) => effectiveOvr(p, pos) * (0.97 + p.morale / 1500) + (p.locked ? 1000 : 0);
  for (const i of order) {
    const pos = slots[i].pos;
    let best: Player | null = null;
    let bestScore = -1;
    for (const p of pool) {
      if (used.has(p.id)) continue;
      const sc = score(p, pos);
      if (sc > bestScore) {
        bestScore = sc;
        best = p;
      }
    }
    if (best) {
      used.add(best.id);
      xi[i] = best;
    }
  }
  // Bench: best remaining, ensure a GK if possible
  const rest = pool.filter((p) => !used.has(p.id)).sort((a, b) => b.ovr - a.ovr);
  const bench: Player[] = [];
  const gk = rest.find((p) => p.pos === 'GK');
  if (gk) bench.push(gk);
  for (const p of rest) {
    if (bench.length >= benchSize) break;
    if (p !== gk) bench.push(p);
  }
  return { slots, xi, bench };
}

export interface UnitRatings {
  att: number;
  mid: number;
  def: number;
  gk: number;
}

export const UNIT_W: Record<Position, [number, number, number]> = {
  // [attack, midfield, defence]
  GK: [0, 0, 0.4],
  CB: [0, 0, 1], LB: [0, 0.2, 1], RB: [0, 0.2, 1],
  LWB: [0.2, 0.6, 0.6], RWB: [0.2, 0.6, 0.6],
  DM: [0, 1, 0.6], CM: [0.3, 1, 0.2], AM: [1, 1, 0],
  LM: [0.7, 0.6, 0.1], RM: [0.7, 0.6, 0.1],
  LW: [1, 0.3, 0], RW: [1, 0.3, 0], ST: [1, 0, 0],
};

/** Unit strengths from a lineup, in OVR units. */
export function unitRatings(l: Lineup): UnitRatings {
  let a = 0, aw = 0, m = 0, mw = 0, d = 0, dw = 0, gk = 0;
  l.slots.forEach((slot, i) => {
    const p = l.xi[i];
    const v = p ? effectiveOvr(p, slot.pos) : 15;
    const [wa, wm, wd] = UNIT_W[slot.pos];
    a += v * wa; aw += wa;
    m += v * wm; mw += wm;
    d += v * wd; dw += wd;
    if (slot.pos === 'GK') gk = v;
  });
  return { att: a / (aw || 1), mid: m / (mw || 1), def: d / (dw || 1), gk };
}

/** Recompute cached club ratings (used by bulk sim and AI). */
export function refreshClubRatings(club: Club, squad: Player[]): void {
  const lu = autoPick(squad, club.formation);
  const u = unitRatings(lu);
  club.att = u.att;
  club.mid = u.mid;
  club.def = u.def;
  club.gk = u.gk;
  const top = squad.filter((p) => !p.academy).map((p) => p.ovr).sort((x, y) => y - x).slice(0, 14);
  club.strength = top.length ? top.reduce((s, v) => s + v, 0) / top.length : 20;
}

export function lineOf(pos: Position) {
  return LINE[pos];
}
