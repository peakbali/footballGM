import type { JSX } from 'preact';
import type { GameState } from '../../core/state';

const SECTIONS: { key: string; label: string; render: (s: GameState) => JSX.Element }[] = [];
export function registerClubSection(key: string, label: string, render: (s: GameState) => JSX.Element) {
  if (!SECTIONS.find((x) => x.key === key)) SECTIONS.push({ key, label, render });
}
export function clubSections() {
  return SECTIONS;
}
