/** Per-division economy (DESIGN 11.3). Index 1..10. */
export interface DivEconomy {
  wage: number; // avg starter weekly wage
  capacity: number;
  attendance: number;
  ticket: number;
  tv: number; // central / season
  sponsor: number;
  merch: number;
  startCash: number; // AI club starting cash
}

export const ECONOMY: DivEconomy[] = [
  { wage: 0, capacity: 0, attendance: 0, ticket: 0, tv: 0, sponsor: 0, merch: 0, startCash: 0 },
  { wage: 60000, capacity: 40000, attendance: 38000, ticket: 50, tv: 110_000_000, sponsor: 15_000_000, merch: 20_000_000, startCash: 60_000_000 },
  { wage: 12000, capacity: 25000, attendance: 17000, ticket: 28, tv: 9_000_000, sponsor: 1_500_000, merch: 2_000_000, startCash: 8_000_000 },
  { wage: 3500, capacity: 12000, attendance: 8000, ticket: 24, tv: 1_500_000, sponsor: 350_000, merch: 500_000, startCash: 1_500_000 },
  { wage: 1800, capacity: 8000, attendance: 4500, ticket: 20, tv: 1_000_000, sponsor: 150_000, merch: 200_000, startCash: 600_000 },
  { wage: 800, capacity: 5000, attendance: 2000, ticket: 18, tv: 120_000, sponsor: 60_000, merch: 60_000, startCash: 200_000 },
  { wage: 300, capacity: 3000, attendance: 700, ticket: 14, tv: 40_000, sponsor: 25_000, merch: 20_000, startCash: 80_000 },
  { wage: 120, capacity: 2000, attendance: 350, ticket: 12, tv: 10_000, sponsor: 12_000, merch: 8_000, startCash: 50_000 },
  { wage: 50, capacity: 1500, attendance: 200, ticket: 10, tv: 5_000, sponsor: 6_000, merch: 4_000, startCash: 40_000 },
  { wage: 16, capacity: 1000, attendance: 110, ticket: 7, tv: 2_500, sponsor: 3_000, merch: 1_500, startCash: 40_000 },
  { wage: 8, capacity: 600, attendance: 60, ticket: 5, tv: 1_000, sponsor: 1_500, merch: 500, startCash: 25_000 },
];

export const USER_START_CASH = 40_000;

/** Player market value (DESIGN 11.6, curve retuned so div 9 ~ £1-5k and 90 OVR ~ £65m). */
export function playerValue(ovr: number, pot: number, age: number, yearsLeft: number): number {
  const d = ovr - 35;
  let v = 1000 * Math.exp(0.07 * d + 0.0024 * d * Math.abs(d));
  // young players carry a premium, 25 to 28 is the peak, the value falls from 29 as the decline (from 31) gets closer
  const ageF = age <= 18 ? 1.4 : age <= 24 ? 1.4 - ((age - 18) / 6) * 0.4 : age <= 28 ? 1 : age >= 34 ? 0.3 : [0.9, 0.8, 0.65, 0.5, 0.4][age - 29];
  const potGap = Math.max(0, pot - ovr);
  const potF = age < 25 ? 1 + Math.min(potGap, 25) * 0.04 : 1;
  const contractF = yearsLeft >= 3 ? 1 : yearsLeft >= 2 ? 0.85 : yearsLeft >= 1 ? 0.65 : 0.35;
  v *= ageF * potF * contractF;
  return roundMoney(v);
}

/** Weekly wage a player expects at a club of the given division. */
/** Each division up, the same player asks this much more (DESIGN 13.2v; was uneven, 1.1x to 2.1x a step). */
export const WAGE_STEP = 1.4;
const WAGE_ANCHOR_DIV = 9;
const WAGE_ANCHOR_OVR = 40; // division 9's average starter

/**
 * Weekly market wage: anchored on a typical division 9 starter, ×1.11 per OVR point and ×WAGE_STEP per division
 * up, so moving up a division costs the same step everywhere (division 1 ≈ 15× division 9 for the same player).
 * `divAvgOvr` is kept for callers but no longer changes the result.
 */
export function marketWage(ovr: number, div: number, divAvgOvr?: number): number {
  void divAvgOvr;
  const base = ECONOMY[WAGE_ANCHOR_DIV].wage * WAGE_STEP ** (WAGE_ANCHOR_DIV - div);
  return roundMoney(Math.max(3, base * Math.exp((ovr - WAGE_ANCHOR_OVR) * 0.11)));
}

/** Typical weekly wage of an average starter in a division. */

export function roundMoney(v: number): number {
  if (v < 100) return Math.round(v);
  if (v < 1000) return Math.round(v / 5) * 5;
  if (v < 10000) return Math.round(v / 50) * 50;
  if (v < 100000) return Math.round(v / 500) * 500;
  if (v < 1000000) return Math.round(v / 5000) * 5000;
  return Math.round(v / 50000) * 50000;
}
