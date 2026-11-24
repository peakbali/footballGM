import type { Rng } from './rng';
import type { GameState } from './state';
import type { Club, Player } from './types';
import type { DevContext } from './progression';
import type { WeekResult } from './season';

/**
 * Registry for management systems (finance, contracts, transfers, staff...). Each system
 * registers hooks; season.ts calls them so the core loop stays small.
 */
export interface GameSystem {
  name: string;
  weekly?: (s: GameState, rng: Rng, idx: Map<number, Player[]>, res: WeekResult) => void;
  seasonEnd?: (s: GameState, rng: Rng) => void;
  rollover?: (s: GameState, rng: Rng) => void;
  init?: (s: GameState, rng: Rng) => void;
}

const SYSTEMS: GameSystem[] = [];

export function registerSystem(sys: GameSystem) {
  if (!SYSTEMS.find((x) => x.name === sys.name)) SYSTEMS.push(sys);
}

export function runWeeklySystems(s: GameState, rng: Rng, idx: Map<number, Player[]>, res: WeekResult) {
  for (const sys of SYSTEMS) sys.weekly?.(s, rng, idx, res);
}
export function runSeasonEndSystems(s: GameState, rng: Rng) {
  for (const sys of SYSTEMS) sys.seasonEnd?.(s, rng);
}
export function runRolloverSystems(s: GameState, rng: Rng) {
  for (const sys of SYSTEMS) sys.rollover?.(s, rng);
}
export function runInitSystems(s: GameState, rng: Rng) {
  for (const sys of SYSTEMS) sys.init?.(s, rng);
}

/** Pluggable formulas (functions are never stored in the save). */
export const hooks: {
  attendance?: (s: GameState, home: Club, away: Club, rng: Rng) => number;
  devContext?: (s: GameState, p: Player) => DevContext;
  injuryMult?: (s: GameState) => number;
  recoveryBonus?: (s: GameState) => number;
} = {};
