import { ATTRS, ADJACENT, type Position } from '../data/positions';
import { playerValue } from '../data/economy';
import { clamp } from '../rng';
import { recomputeOvr } from '../ratings';
import type { GameState } from '../state';
import { registerSystem } from '../systems';
import type { Player } from '../types';
import { dirtyPlayers } from './dirty';
import { trackLevel } from './facilities';

/**
 * Skills lab (Training ground track, DESIGN 13.2i): makes training items over time. Three kinds:
 * teach a natural position, boost one attribute, improve personality. The lab level sets how many of
 * each it can hold, how fast it makes them and how strong they are. A player can use one item every 13 weeks.
 */
export type ItemKind = 'pos' | 'stat' | 'pers';
export const ITEM_LABEL: Record<ItemKind, string> = { pos: 'Position coaching', stat: 'Skill boost', pers: 'Mind coaching' };

const CAP = [0, 1, 1, 2, 2, 3];
const EVERY = [0, 16, 13, 10, 8, 6]; // weeks per new item of each kind
const STAT = [0, 2, 3, 3, 4, 5];
const PERS = [0, 6, 8, 10, 12, 15];
export const PLAYER_COOLDOWN = 13;

export interface LabState {
  stock: Record<ItemKind, number>;
  timer: number; // weeks until the next batch
  used: Record<number, number>; // player id -> absolute week of last use
}

const abs = (s: GameState) => s.season * 52 + s.week;

export function labState(s: GameState): LabState {
  return ((s.ext.lab as LabState | undefined) ??= { stock: { pos: 0, stat: 0, pers: 0 }, timer: 0, used: {} });
}

export function labLevel(s: GameState): number {
  return trackLevel(s, 'lab');
}

export function labInfo(s: GameState) {
  const l = labLevel(s);
  return { level: l, cap: CAP[l], every: EVERY[l], stat: STAT[l], pers: PERS[l], anyPosition: l >= 3 };
}

/** Why this player cannot use an item now, or null. */
export function cannotUse(s: GameState, p: Player, kind: ItemKind): string | null {
  const st = labState(s);
  if (!labLevel(s)) return 'Build the Skills lab first (Training ground).';
  if (p.clubId !== s.userClubId) return 'Only for your own players.';
  if (st.stock[kind] <= 0) return 'None in stock. The lab makes more over time.';
  const last = st.used[p.id];
  if (last != null && abs(s) - last < PLAYER_COOLDOWN) return `He can take another session in ${PLAYER_COOLDOWN - (abs(s) - last)} weeks.`;
  return null;
}

/** Positions this player could learn now. */
export function learnablePositions(s: GameState, p: Player): Position[] {
  if (p.pos === 'GK') return [];
  const natural = (Object.keys(p.fam) as Position[]).filter((x) => p.fam[x] === 'N');
  const all = (Object.keys(ADJACENT) as Position[]).filter((x) => x !== 'GK' && p.fam[x] !== 'N');
  if (labInfo(s).anyPosition) return all;
  return all.filter((x) => p.fam[x] === 'A' || natural.some((n) => ADJACENT[n].includes(x)));
}

function spend(s: GameState, p: Player, kind: ItemKind) {
  const st = labState(s);
  st.stock[kind]--;
  st.used[p.id] = abs(s);
  const years = p.contract ? Math.max(0, p.contract.endSeason - s.season) + 1 : 1;
  p.value = playerValue(p.ovr, p.pot, s.season - p.birthYear, years);
  dirtyPlayers.add(p.id);
}

export function applyItem(s: GameState, p: Player, kind: ItemKind, arg?: string): string | null {
  const err = cannotUse(s, p, kind);
  if (err) return err;
  const info = labInfo(s);
  if (kind === 'pos') {
    const pos = arg as Position;
    if (!learnablePositions(s, p).includes(pos)) return 'He cannot learn that position yet.';
    p.fam[pos] = 'N';
    recomputeOvr(p);
    spend(s, p, kind);
    return `${p.last} is now a natural ${pos}.`;
  }
  if (kind === 'stat') {
    const i = ATTRS.indexOf(arg as (typeof ATTRS)[number]);
    if (i < 0) return 'Pick a skill.';
    const before = p.ovr;
    p.attrs[i] = Math.min(99, p.attrs[i] + info.stat);
    recomputeOvr(p);
    if (p.ovr > p.pot) p.pot = p.ovr;
    spend(s, p, kind);
    return `+${info.stat} ${arg}.${p.ovr > before ? ` OVR ${before} → ${p.ovr}.` : ''}`;
  }
  const before = p.personality;
  p.personality = clamp(p.personality + info.pers, 1, 99);
  p.morale = clamp(p.morale + 3, 0, 100);
  spend(s, p, kind);
  return `Personality ${before} → ${p.personality}.`;
}

registerSystem({
  name: 'lab',
  weekly(s) {
    const info = labInfo(s);
    if (!info.level) return;
    const st = labState(s);
    st.timer--;
    if (st.timer > 0) return;
    st.timer = info.every;
    for (const k of ['pos', 'stat', 'pers'] as ItemKind[]) st.stock[k] = Math.min(info.cap, st.stock[k] + 1);
  },
});
