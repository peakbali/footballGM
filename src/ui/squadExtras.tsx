import type { JSX } from 'preact';
import type { GameState } from '../core/state';

const EXTRAS: ((s: GameState) => JSX.Element | null)[] = [];
export function registerSquadCard(fn: (s: GameState) => JSX.Element | null) {
  EXTRAS.push(fn);
}
export function squadExtras(s: GameState) {
  return EXTRAS.map((fn, i) => <div key={i}>{fn(s)}</div>);
}
