import { fitnessMult } from './ratings';
import { UNIT_W, type Lineup } from './selection';
import type { Player } from './types';

/**
 * Attribute-level match traits (DESIGN 6.2a). On top of position ratings, these team aggregates decide which
 * kind of chances a side creates and concedes: pace in behind, creativity against defensive work, aerial
 * strength on crosses and set pieces, and stamina late in the game. All values are on the 1-100 attribute scale.
 */
export interface Traits {
  paceA: number; // attackers: pace and acceleration
  paceD: number; // defenders: pace, acceleration, positioning, anticipation
  create: number; // midfield and attack: passing, vision, first touch, dribbling, movement
  stop: number; // defence and midfield: tackling, marking, anticipation, positioning, work rate
  airA: number; // attackers and centre-backs: heading, jumping, strength
  airD: number; // defenders and keeper: heading, jumping, marking, strength, aerial command
  stam: number; // outfield stamina and work rate
}

// attribute indices (see ATTRS in data/positions.ts)
const FIN = 0, LONG = 1, PASS = 2, DRIB = 4, TOUCH = 5, HEAD = 6, TACK = 7, MARK = 8, VIS = 10, COMP = 12, POSN = 13, OTB = 14, ANT = 15, WORK = 16, PACE = 19, ACC = 20, STAM = 21, STR = 22, JUMP = 24;
const REF = 25, HAND = 26, ONE = 27, AERIAL = 28, GKP = 30;

/** Finishing quality by kind of chance. */
export const finishQ = {
  open: (p: Player) => 0.5 * p.attrs[FIN] + 0.3 * p.attrs[COMP] + 0.2 * p.attrs[TOUCH],
  brk: (p: Player) => 0.4 * p.attrs[FIN] + 0.3 * p.attrs[COMP] + 0.2 * p.attrs[PACE] + 0.1 * p.attrs[ACC],
  head: (p: Player) => 0.4 * p.attrs[HEAD] + 0.25 * p.attrs[JUMP] + 0.15 * p.attrs[STR] + 0.2 * p.attrs[FIN],
  long: (p: Player) => 0.6 * p.attrs[LONG] + 0.25 * p.attrs[COMP] + 0.15 * p.attrs[FIN],
};
/** How likely a player is to be the one taking each kind of chance (multiplies the position weight). */
export const takerQ = {
  open: (p: Player) => 0.4 + (0.6 * p.attrs[FIN] + 0.4 * p.attrs[OTB]) / 70,
  brk: (p: Player) => 0.3 + (0.5 * p.attrs[PACE] + 0.3 * p.attrs[OTB] + 0.2 * p.attrs[FIN]) / 60,
  head: (p: Player) => 0.2 + (0.5 * p.attrs[HEAD] + 0.3 * p.attrs[JUMP] + 0.2 * p.attrs[STR]) / 50,
  long: (p: Player) => 0.2 + p.attrs[LONG] / 50,
};
/** Goalkeeper quality: shot stopping, or claiming crosses and corners. */
export const keeperQ = (p: Player, aerial: boolean) =>
  aerial ? 0.35 * p.attrs[AERIAL] + 0.3 * p.attrs[HAND] + 0.2 * p.attrs[REF] + 0.15 * p.attrs[GKP] : 0.3 * p.attrs[REF] + 0.25 * p.attrs[HAND] + 0.2 * p.attrs[ONE] + 0.25 * p.attrs[GKP];

export function computeTraits(l: Lineup): Traits {
  let pAw = 0, pA = 0, pDw = 0, pD = 0, cW = 0, c = 0, sW = 0, st = 0, aaW = 0, aa = 0, adW = 0, ad = 0, mW = 0, ms = 0;
  l.slots.forEach((slot, i) => {
    const p = l.xi[i];
    if (!p || slot.pos === 'GK') return;
    const f = fitnessMult(p.fitness);
    const a = p.attrs;
    const [wa, wm, wd] = UNIT_W[slot.pos];
    pA += wa * f * (0.55 * a[PACE] + 0.45 * a[ACC]); pAw += wa;
    pD += wd * f * (0.35 * a[PACE] + 0.2 * a[ACC] + 0.25 * a[POSN] + 0.2 * a[ANT]); pDw += wd;
    const cw = wa + wm;
    c += cw * f * (0.3 * a[PASS] + 0.25 * a[VIS] + 0.2 * a[TOUCH] + 0.15 * a[DRIB] + 0.1 * a[OTB]); cW += cw;
    const sw = wd + wm * 0.5;
    st += sw * f * (0.3 * a[TACK] + 0.25 * a[MARK] + 0.2 * a[ANT] + 0.15 * a[POSN] + 0.1 * a[WORK]); sW += sw;
    const aw = wa + (slot.pos === 'CB' ? 0.7 : 0);
    aa += aw * f * (0.45 * a[HEAD] + 0.3 * a[JUMP] + 0.25 * a[STR]); aaW += aw;
    const dw = wd + (slot.pos === 'CB' ? 0.3 : 0);
    ad += dw * f * (0.3 * a[HEAD] + 0.25 * a[JUMP] + 0.25 * a[MARK] + 0.2 * a[STR]); adW += dw;
    ms += 0.6 * a[STAM] + 0.4 * a[WORK]; mW++;
  });
  const gk = l.xi.find((p, i) => p && l.slots[i].pos === 'GK');
  const gkAir = gk ? keeperQ(gk, true) * fitnessMult(gk.fitness) : 20;
  return {
    paceA: pA / (pAw || 1),
    paceD: pD / (pDw || 1),
    create: c / (cW || 1),
    stop: st / (sW || 1),
    airA: aa / (aaW || 1),
    airD: (ad / (adW || 1)) * 0.88 + gkAir * 0.12,
    stam: ms / (mW || 1),
  };
}
