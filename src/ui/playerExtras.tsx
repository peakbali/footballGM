import type { JSX } from 'preact';
import type { GameState } from '../core/state';
import type { Player } from '../core/types';

/** Each value is the true number or null, shown as "?". */
export interface Knowledge {
  ovr: number | null;
  pot: number | null;
}

type KnowFn = (s: GameState, p: Player) => Knowledge;
let knowFn: KnowFn = (s, p) => ({ ovr: p.ovr, pot: p.pot });
/** Scouting overrides what the user knows about a player. */
export function setKnowledgeFn(fn: KnowFn) {
  knowFn = fn;
}
export function knowledge(s: GameState, p: Player): Knowledge {
  return knowFn(s, p);
}

const ACTIONS: ((s: GameState, p: Player) => JSX.Element | null)[] = [];
export function registerPlayerAction(fn: (s: GameState, p: Player) => JSX.Element | null) {
  ACTIONS.push(fn);
}
export function playerActions(s: GameState, p: Player) {
  return ACTIONS.map((fn, i) => <div key={i}>{fn(s, p)}</div>);
}
