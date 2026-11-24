export const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'DM', 'CM', 'AM', 'LM', 'RM', 'LW', 'RW', 'ST'] as const;
export type Position = (typeof POSITIONS)[number];

/** Attribute order in Player.attrs (31 values). */
export const ATTRS = [
  // technical 0-9
  'finishing', 'longShots', 'passing', 'crossing', 'dribbling', 'firstTouch', 'heading', 'tackling', 'marking', 'setPieces',
  // mental 10-18
  'vision', 'decisions', 'composure', 'positioning', 'offTheBall', 'anticipation', 'workRate', 'aggression', 'leadership',
  // physical 19-24
  'pace', 'acceleration', 'stamina', 'strength', 'agility', 'jumping',
  // goalkeeping 25-30
  'reflexes', 'handling', 'oneOnOnes', 'aerialCommand', 'kicking', 'gkPositioning',
] as const;
export type AttrName = (typeof ATTRS)[number];
export const A: Record<AttrName, number> = Object.fromEntries(ATTRS.map((a, i) => [a, i])) as Record<AttrName, number>;

export const ATTR_LABELS: Record<AttrName, string> = {
  finishing: 'Finishing', longShots: 'Long Shots', passing: 'Passing', crossing: 'Crossing', dribbling: 'Dribbling',
  firstTouch: 'First Touch', heading: 'Heading', tackling: 'Tackling', marking: 'Marking', setPieces: 'Set Pieces',
  vision: 'Vision', decisions: 'Decisions', composure: 'Composure', positioning: 'Positioning', offTheBall: 'Off the Ball',
  anticipation: 'Anticipation', workRate: 'Work Rate', aggression: 'Aggression', leadership: 'Leadership',
  pace: 'Pace', acceleration: 'Acceleration', stamina: 'Stamina', strength: 'Strength', agility: 'Agility', jumping: 'Jumping',
  reflexes: 'Reflexes', handling: 'Handling', oneOnOnes: 'One-on-Ones', aerialCommand: 'Aerial Command', kicking: 'Kicking',
  gkPositioning: 'GK Positioning',
};

export const ATTR_GROUPS: { name: string; attrs: AttrName[] }[] = [
  { name: 'Technical', attrs: ['finishing', 'longShots', 'passing', 'crossing', 'dribbling', 'firstTouch', 'heading', 'tackling', 'marking', 'setPieces'] },
  { name: 'Mental', attrs: ['vision', 'decisions', 'composure', 'positioning', 'offTheBall', 'anticipation', 'workRate', 'aggression', 'leadership'] },
  { name: 'Physical', attrs: ['pace', 'acceleration', 'stamina', 'strength', 'agility', 'jumping'] },
  { name: 'Goalkeeping', attrs: ['reflexes', 'handling', 'oneOnOnes', 'aerialCommand', 'kicking', 'gkPositioning'] },
];

type W = Partial<Record<AttrName, number>>;
const FB: W = { tackling: 2, marking: 2, positioning: 2, pace: 3, stamina: 2, crossing: 2, acceleration: 2, workRate: 1, passing: 1, anticipation: 1 };
const WB: W = { pace: 3, stamina: 3, crossing: 3, dribbling: 2, tackling: 2, acceleration: 2, workRate: 2, marking: 1, passing: 1 };
const WM: W = { crossing: 3, pace: 2, stamina: 2, dribbling: 2, passing: 2, workRate: 2, firstTouch: 1, acceleration: 1, offTheBall: 1 };
const WF: W = { dribbling: 3, pace: 3, acceleration: 3, crossing: 2, firstTouch: 2, offTheBall: 2, finishing: 2, agility: 2, longShots: 1 };

/** Position weights from DESIGN.md 4.3 (3 key, 2 important, 1 minor). */
export const POSITION_WEIGHTS: Record<Position, W> = {
  GK: { reflexes: 3, handling: 3, oneOnOnes: 2, aerialCommand: 2, gkPositioning: 3, kicking: 1, decisions: 1, composure: 1 },
  CB: { tackling: 3, marking: 3, heading: 3, positioning: 3, strength: 2, jumping: 2, anticipation: 2, decisions: 1, composure: 1, pace: 1, passing: 1 },
  LB: FB, RB: FB, LWB: WB, RWB: WB,
  DM: { tackling: 3, positioning: 3, passing: 2, anticipation: 2, marking: 2, decisions: 2, strength: 1, workRate: 2, stamina: 1, composure: 1 },
  CM: { passing: 3, vision: 2, decisions: 3, firstTouch: 2, stamina: 2, workRate: 2, tackling: 1, composure: 2, longShots: 1, offTheBall: 1 },
  AM: { passing: 3, vision: 3, dribbling: 2, firstTouch: 3, offTheBall: 2, longShots: 2, composure: 2, decisions: 2, finishing: 1, agility: 1 },
  LM: WM, RM: WM, LW: WF, RW: WF,
  ST: { finishing: 3, offTheBall: 3, composure: 2, firstTouch: 2, heading: 2, pace: 2, acceleration: 2, strength: 1, dribbling: 1, anticipation: 2 },
};

/** Compiled weights: [attrIndex, weight][] and total, for speed. */
export const COMPILED_WEIGHTS: Record<Position, { idx: Int8Array; w: Float32Array; total: number }> = Object.fromEntries(
  POSITIONS.map((p) => {
    const entries = Object.entries(POSITION_WEIGHTS[p]) as [AttrName, number][];
    return [p, { idx: Int8Array.from(entries.map(([a]) => A[a])), w: Float32Array.from(entries.map(([, w]) => w)), total: entries.reduce((s, [, w]) => s + w, 0) }];
  }),
) as Record<Position, { idx: Int8Array; w: Float32Array; total: number }>;

/** Adjacent positions (unfamiliar but adjacent = 0.85). */
export const ADJACENT: Record<Position, Position[]> = {
  GK: [],
  CB: ['DM', 'LB', 'RB'],
  LB: ['LWB', 'CB', 'LM'],
  RB: ['RWB', 'CB', 'RM'],
  LWB: ['LB', 'LM'],
  RWB: ['RB', 'RM'],
  DM: ['CB', 'CM'],
  CM: ['DM', 'AM', 'LM', 'RM'],
  AM: ['CM', 'ST', 'LW', 'RW'],
  LM: ['LW', 'LWB', 'CM'],
  RM: ['RW', 'RWB', 'CM'],
  LW: ['LM', 'AM', 'ST'],
  RW: ['RM', 'AM', 'ST'],
  ST: ['AM', 'LW', 'RW'],
};

/** Coarse role line, used by sim and UI colouring. */
export const LINE: Record<Position, 'GK' | 'DEF' | 'MID' | 'ATT'> = {
  GK: 'GK', CB: 'DEF', LB: 'DEF', RB: 'DEF', LWB: 'DEF', RWB: 'DEF',
  DM: 'MID', CM: 'MID', AM: 'MID', LM: 'MID', RM: 'MID',
  LW: 'ATT', RW: 'ATT', ST: 'ATT',
};
