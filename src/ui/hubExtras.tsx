import type { JSX } from 'preact';
import type { GameState } from '../core/state';

/** Extra hub cards registered by later systems (finance, board, etc). */
const EXTRAS: ((s: GameState) => JSX.Element | null)[] = [];
export function registerHubCard(fn: (s: GameState) => JSX.Element | null) {
  EXTRAS.push(fn);
}
export function hubExtras(s: GameState) {
  return EXTRAS.map((fn, i) => <div key={i}>{fn(s)}</div>);
}
