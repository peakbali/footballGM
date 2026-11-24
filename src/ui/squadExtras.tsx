import type { JSX } from 'preact';
import type { GameState } from '../core/state';

const EXTRAS: ((s: GameState) => JSX.Element | null)[] = [];
export function registerSquadCard(fn: (s: GameState) => JSX.Element | null) {
  EXTRAS.push(fn);
}
export function squadExtras(s: GameState) {
  return EXTRAS.map((fn, i) => <div key={i}>{fn(s)}</div>);
}

/** The Staff sub-page of the Squad tab (registered by the club feature, so Squad does not import it). */
let staffPage: ((s: GameState) => JSX.Element) | null = null;
export function setStaffPage(fn: (s: GameState) => JSX.Element) {
  staffPage = fn;
}
export function renderStaffPage(s: GameState) {
  return staffPage ? staffPage(s) : null;
}
