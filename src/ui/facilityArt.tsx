/**
 * Small pixel-art pictures for every facility upgrade (DESIGN 13.2z). Each one is drawn from rectangles on a
 * 32x20 grid and grows with the upgrade level (0 = not built yet, shown dimmed; 5 = fully upgraded).
 */
type R = [number, number, number, number, string]; // x, y, w, h, colour

const GOLD = '#ffcc4d', WHITE = '#e8ecff', NAVY = '#1c2650', DARK = '#0b1024', STEEL = '#5b6694', GREEN = '#2f9e57', GREEN2 = '#258349',
  RED = '#e0525a', BLUE = '#5aa0ff', ORANGE = '#ff9640', BROWN = '#8a5a3c', SKIN = '#f1c27d', PURPLE = '#9b6bff', GREY = '#3a4470';

const grass = (y = 15): R[] => {
  const r: R[] = [[0, y, 32, 20 - y, GREEN]];
  for (let x = 0; x < 32; x += 6) r.push([x, y, 3, 20 - y, GREEN2]);
  return r;
};
const person = (x: number, y: number, shirt: string): R[] => [[x, y, 2, 2, SKIN], [x, y + 2, 2, 3, shirt], [x, y + 5, 1, 1, DARK], [x + 1, y + 5, 1, 1, DARK]];

function stands(l: number): R[] {
  const r = grass(16);
  const tiers = Math.max(1, Math.min(4, l));
  for (let t = 0; t < tiers; t++) {
    const y = 13 - t * 3;
    r.push([4, y, 24, 3, STEEL]);
    for (let x = 5 + (t % 2); x < 27; x += 2) r.push([x, y + 1, 1, 1, [RED, WHITE, BLUE, GOLD][(x + t) % 4]]);
  }
  if (l >= 2) r.push([3, 13 - tiers * 3, 26, 1, NAVY]); // roof
  if (l >= 3) r.push([1, 10, 3, 6, STEEL], [28, 10, 3, 6, STEEL]); // corner infills
  if (l >= 5) r.push([0, 6, 2, 10, GREY], [30, 6, 2, 10, GREY], [2, 2, 28, 1, GOLD]); // bowl
  r.push([0, 16, 32, 1, WHITE]);
  return r;
}

function lights(l: number): R[] {
  const r: R[] = [[0, 16, 32, 4, GREEN]];
  const lamp = l >= 2 ? WHITE : l >= 1 ? GOLD : GREY;
  for (const x of [4, 26]) {
    r.push([x + 1, 4, 1, 12, STEEL], [x - 1, 2, 5, 3, NAVY]);
    for (let i = 0; i < 4; i++) r.push([x - 1 + i + (i > 1 ? 1 : 0), 3, 1, 1, lamp]);
    if (l >= 1) r.push([x - 2 + (x > 16 ? -3 : 3), 6, 4, 1, l >= 2 ? '#fff7cc' : '#5c5326']); // glow on the pitch side
  }
  if (l >= 3) for (let x = 9; x < 24; x += 3) r.push([x, 14, 1, 1, GOLD]); // concourse lights
  if (l >= 4) r.push([8, 8, 16, 1, STEEL], ...[9, 12, 15, 18, 21].map((x): R => [x, 9, 1, 1, WHITE])); // roof lighting
  if (l >= 5) for (let i = 0; i < 5; i++) r.push([10 + i * 2, 11 - i, 2, 1, [RED, BLUE, GOLD, PURPLE, GREEN][i]], [20 - i * 2, 11 - i, 2, 1, [BLUE, GOLD, RED, GREEN, PURPLE][i]]);
  return r;
}

function pitchArt(l: number): R[] {
  const r: R[] = [[0, 4, 32, 16, l >= 2 ? GREEN : '#3c8a4f']];
  if (l >= 2) for (let x = 0; x < 32; x += 4) r.push([x, 4, 2, 16, GREEN2]);
  if (l >= 5) for (let y = 4; y < 20; y += 4) r.push([0, y, 32, 2, 'rgba(0,0,0,.12)']);
  r.push([1, 5, 30, 1, WHITE], [1, 18, 30, 1, WHITE], [15, 5, 1, 14, WHITE], [13, 10, 5, 1, WHITE], [13, 13, 5, 1, WHITE]);
  if (l >= 1) for (let x = 3; x < 30; x += 7) r.push([x, 19, 2, 1, BLUE]); // drainage
  if (l >= 3) for (let x = 2; x < 30; x += 5) r.push([x, 16, 3, 1, ORANGE]); // undersoil heating
  if (l >= 4) r.push(...person(24, 7, ORANGE), [26, 11, 3, 1, STEEL]); // groundsman with a mower
  if (l >= 5) r.push([5, 1, 1, 3, GOLD], [4, 2, 3, 1, GOLD], [27, 0, 1, 3, GOLD], [26, 1, 3, 1, GOLD]);
  return r;
}

function screens(l: number): R[] {
  const r = grass(17);
  const w = l >= 4 ? 26 : l >= 2 ? 18 : 12;
  const x0 = 16 - w / 2;
  r.push([x0, 2, w, l >= 4 ? 11 : 9, DARK], [x0 - 1, 1, w + 2, 1, STEEL], [x0 + 1, 11, 1, 6, STEEL], [x0 + w - 2, 11, 1, 6, STEEL]);
  if (l >= 2) r.push([x0 + 1, 3, w - 2, l >= 4 ? 9 : 7, l >= 5 ? PURPLE : BLUE], [x0 + 3, 5, 3, 3, GOLD]);
  r.push([13, 5, 2, 3, l >= 1 ? GOLD : GREY], [17, 5, 2, 3, l >= 1 ? GOLD : GREY], [15, 6, 2, 1, WHITE]);
  if (l >= 3) for (let x = 0; x < 32; x += 4) r.push([x, 15, 4, 2, [RED, WHITE, BLUE, GOLD][(x / 4) % 4]]); // LED boards
  if (l >= 5) r.push([0, 3, 3, 6, BLUE], [29, 3, 3, 6, BLUE]);
  return r;
}

function lounge(l: number): R[] {
  const r: R[] = [[0, 18, 32, 2, GREEN]];
  const floors = Math.max(1, Math.min(4, Math.ceil(l * 0.8)));
  const top = 18 - floors * 4;
  r.push([5, top, 22, floors * 4, NAVY]);
  for (let f = 0; f < floors; f++) for (let x = 7; x < 26; x += 4) r.push([x, top + 1 + f * 4, 2, 2, l >= 1 ? GOLD : GREY]);
  r.push([14, 15, 4, 3, BROWN]);
  if (l >= 3) r.push([4, top - 1, 24, 1, RED]); // restaurant awning
  if (l >= 5) r.push([13, top - 4, 6, 1, GOLD], [13, top - 6, 1, 2, GOLD], [15, top - 7, 2, 3, GOLD], [18, top - 6, 1, 2, GOLD]); // crown
  return r;
}

function grounds(l: number): R[] {
  const r: R[] = [[0, 0, 32, 20, '#1d3a2a']];
  const n = Math.max(1, Math.min(4, l));
  const spots: [number, number][] = [[2, 11], [17, 11], [2, 2], [17, 2]];
  for (let i = 0; i < n; i++) {
    const [x, y] = spots[i];
    const col = l >= 3 && i === 0 ? '#2e8a8a' : GREEN;
    r.push([x, y, 13, 7, col], [x + 6, y, 1, 7, WHITE], [x, y, 13, 1, WHITE], [x, y + 6, 13, 1, WHITE]);
  }
  if (l >= 2) for (const [x, y] of [[0, 9], [31, 9], [15, 0]] as [number, number][]) r.push([x, y, 1, 2, GOLD]);
  if (l >= 5) r.push([13, 8, 6, 4, NAVY], [14, 9, 4, 1, GOLD]);
  return r;
}

function gym(l: number): R[] {
  const r: R[] = [[0, 17, 32, 3, BROWN]];
  // dumbbell rack: one more set per level
  r.push([2, 15, 12, 1, STEEL]);
  for (let i = 0; i < Math.max(1, l); i++) r.push([3 + i * 2, 13, 1, 2, i < l ? GREY : '#2a3050'], [3 + i * 2, 12, 1, 1, i < l ? WHITE : GREY]);
  // barbell
  r.push([16, 9, 14, 1, l >= 1 ? WHITE : GREY], [16, 7, 2, 5, l >= 1 ? RED : GREY], [28, 7, 2, 5, l >= 1 ? RED : GREY], [20, 10, 1, 7, STEEL], [26, 10, 1, 7, STEEL]);
  if (l >= 3) r.push([17, 2, 10, 4, DARK], [18, 3, 8, 2, GREEN]); // heart-rate screen
  if (l >= 4) r.push([18, 4, 2, 1, WHITE], [20, 3, 1, 2, WHITE], [21, 4, 3, 1, WHITE]);
  if (l >= 5) r.push(...person(8, 4, BLUE));
  return r;
}

function medical(l: number): R[] {
  const r: R[] = [[0, 0, 32, 20, '#16204a']];
  r.push([12, 2, 8, 8, WHITE], [15, 3, 2, 6, l >= 1 ? RED : GREY], [13, 5, 6, 2, l >= 1 ? RED : GREY]);
  const beds = Math.min(3, Math.max(0, l - 1));
  for (let i = 0; i < beds; i++) r.push([2 + i * 10, 14, 8, 2, WHITE], [2 + i * 10, 16, 1, 3, STEEL], [9 + i * 10, 16, 1, 3, STEEL], [2 + i * 10, 13, 3, 1, BLUE]);
  if (l >= 3) r.push([0, 18, 32, 2, BLUE], [2, 19, 4, 1, WHITE], [14, 19, 4, 1, WHITE]); // rehab pool
  if (l >= 5) r.push([23, 3, 6, 4, DARK], [24, 5, 1, 1, GREEN], [25, 4, 1, 2, GREEN], [26, 5, 2, 1, GREEN]);
  return r;
}

function analysis(l: number): R[] {
  const r: R[] = [[0, 16, 32, 4, BROWN]];
  const n = Math.max(1, Math.min(3, Math.ceil(l * 0.6)));
  for (let i = 0; i < n; i++) {
    const x = 2 + i * 10;
    r.push([x, 5, 9, 7, DARK], [x + 1, 6, 7, 5, l >= 1 ? NAVY : GREY], [x + 4, 12, 1, 4, STEEL]);
    if (l >= 1) for (let b = 0; b < 3; b++) r.push([x + 2 + b * 2, 10 - b - (i % 2), 1, 1 + b + (i % 2), [GREEN, GOLD, BLUE][b]]);
  }
  if (l >= 4) r.push([3, 1, 26, 2, STEEL], [5, 1, 2, 2, RED], [25, 1, 2, 2, RED]); // tracking cameras
  if (l >= 5) r.push(...person(26, 9, WHITE), [24, 9, 1, 1, GREEN], [29, 12, 1, 1, GREEN]);
  return r;
}

function lab(l: number): R[] {
  const r: R[] = [[0, 17, 32, 3, BROWN]];
  // flask that fills with each level
  r.push([5, 3, 4, 6, WHITE], [3, 9, 8, 8, WHITE]);
  const fill = Math.round((l / 5) * 7);
  if (fill > 0) r.push([4, 16 - fill, 6, fill, l >= 5 ? GOLD : PURPLE]);
  for (let i = 0; i < l; i++) r.push([6 + (i % 2) * 2, 1 - (i > 2 ? 1 : 0) + i, 1, 1, PURPLE]);
  // cones and a ball for positional coaching
  if (l >= 2) for (const x of [15, 20, 25]) r.push([x, 15, 3, 1, ORANGE], [x + 1, 13, 1, 2, ORANGE]);
  if (l >= 3) r.push(...person(20, 6, BLUE));
  if (l >= 4) r.push([25, 3, 5, 4, WHITE], [26, 4, 3, 1, PURPLE], [27, 7, 1, 1, WHITE]); // thought bubble
  return r;
}

function youthPitch(l: number): R[] {
  const r: R[] = grass(8);
  r.push([1, 9, 30, 1, WHITE], [1, 19, 30, 1, WHITE], [15, 9, 1, 11, WHITE]);
  const kids = Math.max(1, l * 2);
  for (let i = 0; i < kids; i++) r.push([3 + (i * 7) % 26, 11 + (i % 2) * 4, 1, 1, SKIN], [3 + (i * 7) % 26, 12 + (i % 2) * 4, 1, 2, i % 2 ? RED : BLUE]);
  if (l >= 3) r.push([2, 1, 1, 7, STEEL], [1, 0, 3, 1, WHITE], [29, 1, 1, 7, STEEL], [28, 0, 3, 1, WHITE]);
  if (l >= 4) r.push([6, 4, 20, 3, STEEL], [7, 5, 18, 1, GOLD]); // small stand
  if (l >= 5) r.push([13, 0, 6, 3, NAVY], [14, 1, 4, 1, GOLD]);
  return r;
}

function network(l: number): R[] {
  const r: R[] = [[0, 0, 32, 20, '#16204a']];
  // a map with one more pin per level
  r.push([4, 4, 10, 12, '#2a5a8a'], [12, 2, 8, 8, '#2a5a8a'], [18, 8, 10, 9, '#2a5a8a']);
  const pins: [number, number][] = [[8, 9], [15, 5], [22, 12], [6, 14], [25, 9]];
  for (let i = 0; i < Math.max(1, l); i++) {
    const [x, y] = pins[i];
    const c = i < l ? (i === 4 ? GOLD : RED) : GREY;
    r.push([x, y - 3, 3, 3, c], [x + 1, y, 1, 2, c]);
  }
  if (l >= 2) r.push([26, 14, 4, 1, WHITE], [26, 18, 4, 1, WHITE], [25, 15, 1, 3, WHITE], [30, 15, 1, 3, WHITE], [30, 18, 2, 2, STEEL]);
  return r;
}

function coaching(l: number): R[] {
  const r: R[] = [[0, 18, 32, 2, BROWN]];
  r.push([3, 2, 26, 13, WHITE], [3, 15, 1, 3, STEEL], [28, 15, 1, 3, STEEL], [15, 3, 1, 11, '#c8d0f0']);
  const marks = Math.max(1, l * 2);
  for (let i = 0; i < marks; i++) r.push([5 + (i * 5) % 22, 4 + ((i * 3) % 9), 2, 2, i < l * 2 ? (i % 2 ? RED : BLUE) : GREY]);
  if (l >= 2) for (let i = 0; i < 6; i++) r.push([8 + i * 2, 12 - i, 1, 1, GREEN]); // arrow
  if (l >= 5) r.push([24, 3, 4, 3, GOLD]);
  return r;
}

function dorms(l: number): R[] {
  const r: R[] = [[0, 18, 32, 2, GREEN]];
  const floors = Math.max(1, Math.min(3, Math.ceil(l * 0.6)));
  const top = 18 - floors * 4;
  r.push([6, top, 20, floors * 4, l >= 4 ? STEEL : BROWN]);
  for (let i = 0; i < 11; i++) r.push([5 + i * 2 - 0, top - 1 - Math.min(i, 10 - i), 2, 1, RED]); // roof
  let lit = 0;
  for (let f = 0; f < floors; f++) for (let x = 8; x < 24; x += 4) r.push([x, top + 1 + f * 4, 2, 2, lit++ < l * 3 ? GOLD : DARK]);
  r.push([15, 15, 2, 3, DARK]);
  if (l >= 3) r.push([27, 9, 1, 9, WHITE], [28, 9, 3, 2, BLUE]); // school flag
  return r;
}

function pathway(l: number): R[] {
  const r: R[] = [[0, 18, 32, 2, GREEN]];
  for (let i = 0; i < 5; i++) r.push([2 + i * 6, 15 - i * 3, 6, 3 + i * 3, i < l ? (i === 4 ? GOLD : STEEL) : GREY]);
  const top = Math.max(0, Math.min(4, l - 1));
  if (l >= 1) r.push(...person(4 + top * 6, 9 - top * 3, l >= 5 ? GOLD : BLUE));
  return r;
}

function shop(l: number): R[] {
  const r: R[] = [[0, 0, 32, 20, NAVY]];
  for (let x = 0; x < 32; x += 4) r.push([x, 0, 2, 3, RED], [x + 2, 0, 2, 3, WHITE]);
  r.push([2, 6, 28, 1, STEEL]);
  const shirts = Math.max(1, Math.min(5, l));
  for (let i = 0; i < shirts; i++) {
    const x = 3 + i * 6, c = i < l ? [RED, WHITE, BLUE, GOLD, GREEN][i] : GREY;
    r.push([x, 7, 4, 2, c], [x - 1, 7, 1, 3, c], [x + 4, 7, 1, 3, c], [x, 9, 4, 5, c]);
  }
  r.push([0, 16, 32, 4, BROWN]);
  if (l >= 4) r.push([12, 17, 8, 2, DARK], [14, 17, 4, 1, GOLD]);
  if (l >= 5) r.push([26, 15, 4, 4, BLUE], [27, 16, 2, 2, GREEN]); // globe
  return r;
}

function catering(l: number): R[] {
  const r: R[] = [[0, 18, 32, 2, GREY]];
  r.push([4, 8, 24, 10, l >= 3 ? BROWN : STEEL]);
  for (let x = 3; x < 29; x += 4) r.push([x, 5, 2, 3, l >= 1 ? GOLD : GREY], [x + 2, 5, 2, 3, WHITE]);
  r.push([6, 10, 20, 4, DARK]);
  const items: R[] = [[7, 11, 3, 2, ORANGE], [12, 11, 2, 3, WHITE], [16, 11, 3, 2, BROWN], [21, 11, 2, 3, GOLD], [24, 11, 1, 3, RED]];
  r.push(...items.slice(0, l));
  if (l >= 4) r.push(...person(0, 12, BLUE), ...person(29, 12, RED));
  if (l >= 5) r.push([8, 1, 16, 3, NAVY], [10, 2, 12, 1, GOLD]);
  return r;
}

function partners(l: number): R[] {
  const r: R[] = [[0, 17, 32, 3, BROWN]];
  // briefcase
  r.push([3, 9, 12, 8, l >= 1 ? BROWN : GREY], [7, 7, 4, 2, STEEL], [3, 12, 12, 1, DARK], [8, 12, 2, 2, GOLD]);
  // coin stacks, one per level
  for (let i = 0; i < l; i++) for (let h = 0; h < 2 + i; h++) r.push([17 + i * 3, 16 - h * 2, 3, 2, h % 2 ? GOLD : '#d9a520']);
  if (l >= 4) r.push([18, 1, 12, 4, WHITE], [19, 2, 10, 2, BLUE]); // sponsor banner
  return r;
}

function events(l: number): R[] {
  const r: R[] = [[0, 0, 32, 20, '#16204a'], [0, 16, 32, 4, BROWN]];
  r.push([4, 12, 24, 4, l >= 1 ? STEEL : GREY]); // stage / function room
  if (l >= 2) r.push([6, 9, 3, 3, WHITE], [23, 9, 3, 3, WHITE]); // speakers
  if (l >= 3) r.push(...person(15, 6, PURPLE));
  if (l >= 4) r.push([2, 2, 6, 8, NAVY], [3, 3, 1, 1, GOLD], [5, 3, 1, 1, GOLD], [3, 5, 1, 1, GOLD], [5, 5, 1, 1, GOLD], [3, 7, 1, 1, GOLD]); // hotel
  if (l >= 5) for (const [x, y, c] of [[10, 2, GOLD], [20, 4, PURPLE], [26, 1, BLUE], [14, 1, RED]] as [number, number, string][]) r.push([x, y, 1, 3, c], [x - 1, y + 2, 1, 1, c]);
  return r;
}

function media(l: number): R[] {
  const r: R[] = [[0, 0, 32, 20, '#16204a']];
  // camera
  r.push([3, 9, 12, 7, l >= 1 ? STEEL : GREY], [15, 10, 4, 5, l >= 1 ? GREY : '#2a3050'], [5, 7, 4, 2, STEEL], [6, 16, 1, 4, STEEL], [11, 16, 1, 4, STEEL]);
  if (l >= 3) r.push([5, 11, 2, 2, RED]); // live light
  // signal bars, one per level
  for (let i = 0; i < 5; i++) r.push([21 + i * 2, 16 - i * 3, 1, 3 + i * 3, i < l ? (i === 4 ? GOLD : GREEN) : GREY]);
  if (l >= 2) r.push([22, 1, 8, 1, WHITE]); // feed
  return r;
}

const DRAW: Record<string, (l: number) => R[]> = {
  stands, lights, pitch: pitchArt, screens, lounge, grounds, gym, medical, analysis, lab,
  youthPitch, network, coaching, dorms, pathway, shop, catering, partners, events, media,
};

export function FacilityArt({ track, level }: { track: string; level: number }) {
  const draw = DRAW[track];
  if (!draw) return null;
  return (
    <svg class={`fac-art${level === 0 ? ' unbuilt' : ''}`} viewBox="0 0 32 20" shape-rendering="crispEdges" aria-hidden="true">
      {draw(level).map(([x, y, w, h, c], i) => <rect key={i} x={x} y={y} width={w} height={h} fill={c} />)}
    </svg>
  );
}
