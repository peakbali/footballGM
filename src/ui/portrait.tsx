import type { JSX } from 'preact';
import { LINE, type Position } from '../core/data/positions';
import type { Player } from '../core/types';
import { store } from './store';

/**
 * Unique pixel portraits (DESIGN 13.6). Every player gets a face drawn from his id: skin, hair style and colour,
 * eyes, mouth or beard, an extra (headband, glasses, earring, freckles, scar) and a shirt in his club's colours.
 * The idle animation tells the position group apart:
 *   keeper: gloves bounce at the bottom corners     defender: head shakes "no way past"
 *   midfielder: eyes scan left and right            forward: quick sprint bounce with speed streaks
 */
const SKIN = ['#f6d3b3', '#e8b98f', '#d19a6b', '#b27a4f', '#8a5a3c', '#5e3b26'];
const HAIR = ['#1c1410', '#3b2414', '#6b4423', '#a8742e', '#d9b45c', '#9a3b1f', '#c9ccd6'];
const BG: Record<string, [string, string]> = { GK: ['#6b4f10', '#a77d10'], DEF: ['#163a6b', '#1f5fa8'], MID: ['#124d2e', '#1d7a48'], ATT: ['#6b1a24', '#a82d3a'] };

function hash(n: number, salt: number): number {
  let h = (Math.imul(n + 1, 0x9e3779b1) ^ Math.imul(salt + 7, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0;
  return (h ^ (h >>> 15)) >>> 0;
}

type R = [number, number, number, number, string];

export interface Look {
  skin: string;
  hair: string;
  style: number; // 0 short, 1 buzz, 2 curly, 3 long, 4 mohawk, 5 bald, 6 side parting
  mouth: number; // 0 smile, 1 flat, 2 stubble, 3 beard, 4 moustache
  extra: number; // 0 none, 1 headband, 2 glasses, 3 earring, 4 freckles, 5 scar
  eyes: number; // 0 dark, 1 wide, 2 narrow
}

export function lookOf(id: number, age = 25): Look {
  const skin = SKIN[hash(id, 1) % SKIN.length];
  let hair = HAIR[hash(id, 2) % HAIR.length];
  if (age >= 34 && hash(id, 9) % 3 > 0) hair = HAIR[6];
  const style = hash(id, 3) % 7;
  let mouth = hash(id, 4) % 5;
  if (age < 21 && mouth >= 3) mouth = 0;
  return { skin, hair, style, mouth, extra: hash(id, 5) % 6, eyes: hash(id, 6) % 3 };
}

/** Pixels of the head and shoulders on a 16 wide, 18 high grid. */
export function facePixels(look: Look, shirt: [string, string]): { back: R[]; head: R[]; eyes: R[]; front: R[]; shirt: R[] } {
  const { skin, hair, style, mouth, extra } = look;
  const dark = '#1a1220';
  const back: R[] = [];
  const head: R[] = [
    [5, 3, 6, 8, skin], [4, 4, 8, 6, skin], [6, 11, 4, 2, skin], // face and neck
    [3, 6, 1, 2, skin], [12, 6, 1, 2, skin], // ears
  ];
  const front: R[] = [];
  // hair
  const hr = (x: number, y: number, w: number, h: number) => front.push([x, y, w, h, hair]);
  if (style === 0) { hr(4, 2, 8, 3); hr(4, 5, 1, 2); hr(11, 5, 1, 2); }
  if (style === 1) { hr(5, 3, 6, 1); hr(4, 4, 8, 1); }
  if (style === 2) { hr(4, 1, 2, 2); hr(7, 1, 2, 2); hr(10, 1, 2, 2); hr(3, 3, 10, 2); hr(3, 5, 2, 2); hr(11, 5, 2, 2); }
  if (style === 3) { hr(4, 2, 8, 3); hr(3, 4, 2, 8); hr(11, 4, 2, 8); }
  if (style === 4) { hr(7, 0, 2, 4); hr(6, 3, 4, 1); hr(4, 4, 1, 1); hr(11, 4, 1, 1); }
  if (style === 6) { hr(4, 2, 8, 2); hr(4, 4, 5, 1); hr(4, 5, 1, 2); hr(11, 4, 1, 2); hr(9, 1, 3, 1); }
  // eyes
  const eyes: R[] = [];
  const ey = 7;
  if (look.eyes === 0) eyes.push([6, ey, 1, 2, dark], [9, ey, 1, 2, dark]);
  if (look.eyes === 1) eyes.push([5, ey, 2, 2, '#ffffff'], [9, ey, 2, 2, '#ffffff'], [6, ey, 1, 2, dark], [9, ey, 1, 2, dark]);
  if (look.eyes === 2) eyes.push([6, ey + 1, 1, 1, dark], [9, ey + 1, 1, 1, dark], [5, ey, 3, 1, hair], [8, ey, 3, 1, hair]);
  // mouth and facial hair
  const shade = '#b3695a';
  if (mouth === 0) front.push([6, 10, 4, 1, shade], [5, 9, 1, 1, shade], [10, 9, 1, 1, shade]);
  if (mouth === 1) front.push([6, 10, 4, 1, shade]);
  if (mouth === 2) front.push([5, 10, 6, 2, hair], [6, 10, 4, 1, shade]);
  if (mouth === 3) front.push([4, 9, 8, 4, hair], [6, 10, 4, 1, shade]);
  if (mouth === 4) front.push([5, 9, 6, 1, hair], [6, 10, 4, 1, shade]);
  // extras
  if (extra === 1) front.push([4, 4, 8, 1, shirt[1]], [3, 4, 1, 1, shirt[1]]);
  if (extra === 2) front.push([5, 6, 3, 1, dark], [8, 6, 3, 1, dark], [5, 7, 1, 3, dark], [7, 7, 2, 1, dark], [10, 7, 1, 3, dark], [5, 9, 3, 1, dark], [8, 9, 3, 1, dark]);
  if (extra === 3) front.push([3, 8, 1, 2, '#ffcc4d']);
  if (extra === 4) front.push([5, 9, 1, 1, '#a8603a'], [10, 9, 1, 1, '#a8603a'], [7, 9, 1, 1, '#a8603a'], [8, 6, 1, 1, '#a8603a']);
  if (extra === 5) front.push([10, 5, 1, 3, '#c26a6a']);
  // shirt: shoulders with collar and a trim stripe
  const sh: R[] = [[2, 13, 12, 5, shirt[0]], [1, 15, 14, 3, shirt[0]], [6, 13, 4, 1, shirt[1]], [5, 13, 1, 1, shirt[1]], [10, 13, 1, 1, shirt[1]], [1, 17, 14, 1, shirt[1]]];
  return { back, head, eyes, front, shirt: sh };
}

const rects = (list: R[], key: string) => list.map(([x, y, w, h, c], i) => <rect key={`${key}${i}`} x={x} y={y} width={w} height={h} fill={c} />);

export function Portrait({ p, size = 40, shirt }: { p: Pick<Player, 'id' | 'pos' | 'birthYear' | 'clubId'>; size?: number; shirt?: [string, string] }): JSX.Element {
  const s = store.state;
  const age = s ? s.season - p.birthYear : 25;
  const group = LINE[p.pos as Position] ?? 'MID';
  const club = s && p.clubId != null ? s.clubs[p.clubId] : null;
  const colors: [string, string] = shirt ?? (club ? [club.colors[0], club.colors[1]] : ['#4a5590', '#e8ecff']);
  const look = lookOf(p.id, age);
  const f = facePixels(look, colors);
  const [bg0, bg1] = BG[group];
  return (
    <svg class={`portrait pt-${group}`} width={size} height={size * 1.125} viewBox="0 0 16 18" shape-rendering="crispEdges" aria-hidden="true" style={{ flex: 'none' }}>
      <rect width="16" height="18" fill={bg0} />
      {[0, 4, 8, 12].map((x) => <rect key={x} x={x} y="0" width="2" height="18" fill={bg1} opacity="0.35" />)}
      {group === 'ATT' && <g class="pt-streak"><rect x="0" y="6" width="3" height="1" fill="#e8ecff" /><rect x="0" y="9" width="2" height="1" fill="#e8ecff" /><rect x="13" y="7" width="3" height="1" fill="#e8ecff" /></g>}
      <g class="pt-body">
        {rects(f.shirt, 's')}
        <g class="pt-head">
          {rects(f.head, 'h')}
          <g class="pt-eyes">{rects(f.eyes, 'e')}</g>
          {rects(f.front, 'f')}
        </g>
      </g>
      {group === 'GK' && (
        <g>
          <g class="pt-glove-l"><rect x="0" y="12" width="3" height="3" fill="#ffcc4d" /><rect x="0" y="12" width="3" height="1" fill="#fff0b3" /></g>
          <g class="pt-glove-r"><rect x="13" y="12" width="3" height="3" fill="#ffcc4d" /><rect x="13" y="12" width="3" height="1" fill="#fff0b3" /></g>
        </g>
      )}
      <rect width="16" height="18" fill="none" stroke="#070b18" stroke-width="0.6" />
    </svg>
  );
}
