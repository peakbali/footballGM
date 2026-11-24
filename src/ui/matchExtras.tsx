import type { JSX } from 'preact';
import type { GameState } from '../core/state';
import type { Fixture } from '../core/types';

const EXTRAS: ((s: GameState, f: Fixture) => JSX.Element | null)[] = [];
export function registerMatchExtra(fn: (s: GameState, f: Fixture) => JSX.Element | null) {
  EXTRAS.push(fn);
}
export function matchExtras(s: GameState, f: Fixture) {
  return EXTRAS.map((fn, i) => <div key={i}>{fn(s, f)}</div>);
}
