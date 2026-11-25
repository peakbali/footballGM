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

/**
 * Assignment problem (Hungarian algorithm): rows are slots, columns are players (cols >= rows), maximise the
 * total score. Returns the column picked for each row. O(rows^2 * cols), a few microseconds for 11 x 30.
 */
export function bestAssignment(score: number[][]): number[] {
  const n = score.length;
  const m = score[0]?.length ?? 0;
  if (!n || m < n) return [];
  const INF = 1e18;
  const u = new Array(n + 1).fill(0), v = new Array(m + 1).fill(0), p = new Array(m + 1).fill(0), way = new Array(m + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array(m + 1).fill(INF);
    const used = new Array(m + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = INF, j1 = 0;
      for (let j = 1; j <= m; j++) {
        if (used[j]) continue;
        const cur = -score[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= m; j++) {
        if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta;
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
  }
  const res = new Array(n).fill(-1);
  for (let j = 1; j <= m; j++) if (p[j]) res[p[j] - 1] = j - 1;
  return res;
}

/** Team OVR of a lineup: the average effective rating of the starting XI in their slots. */
export function teamOvr(l: Lineup): number {
  const v = l.xi.map((p, i) => (p ? effectiveOvr(p, l.slots[i].pos) : 0));
  return v.reduce((a, b) => a + b, 0) / (v.length || 1);
}

/**
 * Auto-pick the XI (morale aware), honouring locked players.
 * `optimal` (the user's club, DESIGN 13.2l) solves the whole XI at once for the highest total rating; otherwise a
 * quick greedy pass fills scarce positions first (AI clubs, unchanged so league balance stays the same).
 */
export function autoPick(squad: Player[], formation: string, benchSize = 7, optimal = false): Lineup {
  const slots = FORMATIONS[formation] ?? FORMATIONS['4-4-2'];
  const pool = squad.filter((p) => available(p) && !p.academy);
  // fall back to academy players if not enough
  if (pool.length < 11) pool.push(...squad.filter((p) => available(p) && p.academy));
  const used = new Set<number>();
  const xi: (Player | null)[] = new Array(slots.length).fill(null);
  const order = slots.map((s, i) => i).sort((a, b) => SLOT_ORDER.indexOf(slots[a].pos) - SLOT_ORDER.indexOf(slots[b].pos));
  const score = (p: Player, pos: Position) => effectiveOvr(p, pos) * (0.97 + p.morale / 1500) + (p.locked ? 1000 : 0);
  if (optimal && pool.length >= slots.length) {
    const pick = bestAssignment(slots.map((sl) => pool.map((p) => score(p, sl.pos))));
    pick.forEach((j, i) => { xi[i] = pool[j]; used.add(pool[j].id); });
  } else for (const i of order) {
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
  const lu = autoPick(squad, club.formation, 7, !!club.user);
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
