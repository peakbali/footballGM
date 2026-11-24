import type { Position } from './positions';

export interface Slot {
  pos: Position;
  x: number; // 0..100 left to right
  y: number; // 0..100 own goal (0) to opponent goal (100)
}

const s = (pos: Position, x: number, y: number): Slot => ({ pos, x, y });
const GK = s('GK', 50, 4);

export const FORMATIONS: Record<string, Slot[]> = {
  '4-4-2': [GK, s('LB', 12, 24), s('CB', 37, 20), s('CB', 63, 20), s('RB', 88, 24), s('LM', 12, 52), s('CM', 37, 48), s('CM', 63, 48), s('RM', 88, 52), s('ST', 38, 78), s('ST', 62, 78)],
  '4-3-3': [GK, s('LB', 12, 24), s('CB', 37, 20), s('CB', 63, 20), s('RB', 88, 24), s('CM', 30, 48), s('DM', 50, 40), s('CM', 70, 48), s('LW', 15, 74), s('ST', 50, 80), s('RW', 85, 74)],
  '4-2-3-1': [GK, s('LB', 12, 24), s('CB', 37, 20), s('CB', 63, 20), s('RB', 88, 24), s('DM', 38, 40), s('DM', 62, 40), s('LW', 15, 64), s('AM', 50, 62), s('RW', 85, 64), s('ST', 50, 82)],
  '3-5-2': [GK, s('CB', 28, 20), s('CB', 50, 18), s('CB', 72, 20), s('LWB', 10, 46), s('CM', 32, 48), s('DM', 50, 40), s('CM', 68, 48), s('RWB', 90, 46), s('ST', 38, 78), s('ST', 62, 78)],
  '5-3-2': [GK, s('LWB', 10, 30), s('CB', 30, 20), s('CB', 50, 18), s('CB', 70, 20), s('RWB', 90, 30), s('CM', 30, 50), s('CM', 50, 46), s('CM', 70, 50), s('ST', 38, 78), s('ST', 62, 78)],
  '4-1-4-1': [GK, s('LB', 12, 24), s('CB', 37, 20), s('CB', 63, 20), s('RB', 88, 24), s('DM', 50, 38), s('LM', 12, 56), s('CM', 37, 54), s('CM', 63, 54), s('RM', 88, 56), s('ST', 50, 80)],
  '3-4-3': [GK, s('CB', 28, 20), s('CB', 50, 18), s('CB', 72, 20), s('LM', 12, 48), s('CM', 38, 46), s('CM', 62, 46), s('RM', 88, 48), s('LW', 18, 74), s('ST', 50, 80), s('RW', 82, 74)],
};
export const FORMATION_NAMES = Object.keys(FORMATIONS);
