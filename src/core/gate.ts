import { CAL, START_SEASON, type GameState } from './state';

/**
 * Free first season, then a one-time "Full game" unlock (docs/PLAY_STORE.md).
 * A career can play its whole first season (through the season review) for free; starting
 * season two needs the unlock. Saves made before the gate existed are marked `legacy` on load
 * and stay fully playable.
 */
export interface GateExt { v: 1; legacy?: boolean }

export const gateOf = (s: GameState): GateExt | undefined => s.ext.gate as GateExt | undefined;

/** New careers are gated. */
export function markNewCareer(s: GameState) {
  s.ext.gate = { v: 1 } satisfies GateExt;
}

/** A save without a marker predates the gate: keep it fully playable. */
export function markLoadedCareer(s: GameState) {
  if (!gateOf(s)) s.ext.gate = { v: 1, legacy: true } satisfies GateExt;
}

/** True once the free season is over (season review reached) for a gated career. */
export function freeSeasonOver(s: GameState): boolean {
  return s.season === START_SEASON && s.week > CAL.seasonEndWeek;
}

/** Continue is blocked: the free season is done and this device has no unlock. */
export function gateBlocks(s: GameState, unlocked: boolean): boolean {
  if (unlocked || gateOf(s)?.legacy) return false;
  return freeSeasonOver(s) || s.season > START_SEASON;
}
