/**
 * Pixel-art backdrops for feature cards (mostly the Club tab). Each scene is drawn from
 * rectangles on a 64x32 grid and shown faded behind the card's top-right corner.
 */
type R = [number, number, number, number, string]; // x, y, w, h, colour

const GOLD = '#ffcc4d', WHITE = '#e8ecff', NAVY = '#1c2650', STEEL = '#5b6694', GREEN = '#2f9e57', GREEN2 = '#258349', RED = '#e0525a', BLUE = '#5aa0ff', ORANGE = '#ff9640', BROWN = '#8a5a3c';

function stadium(): R[] {
  const r: R[] = [];
  // floodlights
  for (const x of [4, 57]) {
    r.push([x + 1, 2, 1, 22, STEEL], [x - 1, 0, 5, 3, WHITE], [x, 1, 3, 1, GOLD]);
  }
  // roof and stands
  r.push([10, 6, 44, 2, STEEL], [12, 8, 40, 1, NAVY]);
  for (let row = 0; row < 5; row++) {
    for (let x = 12 + (row % 2); x < 52; x += 2) r.push([x, 10 + row * 2, 1, 1, [RED, WHITE, BLUE, GOLD][(x + row) % 4]]);
  }
  r.push([10, 9, 2, 12, STEEL], [52, 9, 2, 12, STEEL], [10, 20, 44, 2, NAVY]);
  // pitch
  r.push([0, 22, 64, 10, GREEN]);
  for (let x = 0; x < 64; x += 8) r.push([x, 22, 4, 10, GREEN2]);
  r.push([0, 26, 64, 1, WHITE], [31, 22, 1, 10, WHITE]);
  return r;
}

function training(): R[] {
  const r: R[] = [[0, 16, 64, 16, GREEN]];
  for (let x = 0; x < 64; x += 10) r.push([x, 16, 5, 16, GREEN2]);
  // goal
  r.push([40, 6, 20, 1, WHITE], [40, 6, 1, 14, WHITE], [59, 6, 1, 14, WHITE]);
  for (let x = 42; x < 59; x += 3) r.push([x, 7, 1, 12, STEEL]);
  for (let y = 9; y < 19; y += 3) r.push([41, y, 18, 1, STEEL]);
  // cones and ball
  for (const x of [6, 14, 22, 30]) r.push([x, 22, 3, 1, ORANGE], [x + 1, 20, 1, 2, ORANGE]);
  r.push([34, 25, 3, 3, WHITE], [35, 26, 1, 1, NAVY]);
  return r;
}

function academy(): R[] {
  const r: R[] = [[0, 26, 64, 6, GREEN]];
  // school building
  r.push([20, 8, 34, 18, STEEL], [18, 6, 38, 3, NAVY], [33, 18, 6, 8, BROWN]);
  for (let x = 23; x < 52; x += 6) for (const y of [11, 15]) if (!(x > 30 && x < 40 && y === 15)) r.push([x, y, 3, 2, GOLD]);
  // flag
  r.push([10, 4, 1, 22, WHITE], [11, 4, 7, 4, RED], [11, 6, 7, 1, WHITE]);
  // little players
  for (const [x, c] of [[4, BLUE], [58, RED]] as [number, string][]) r.push([x, 21, 2, 2, '#f1c27d'], [x, 23, 2, 3, c]);
  return r;
}

function commercial(): R[] {
  const r: R[] = [[8, 8, 48, 22, NAVY]];
  // striped awning
  for (let x = 6; x < 58; x += 4) r.push([x, 5, 2, 4, RED], [x + 2, 5, 2, 4, WHITE]);
  // window with a shirt
  r.push([12, 12, 24, 14, '#0b1024'], [18, 14, 12, 3, GOLD], [15, 14, 3, 5, GOLD], [30, 14, 3, 5, GOLD], [20, 17, 8, 8, GOLD], [23, 18, 2, 4, NAVY]);
  // door and sign
  r.push([40, 14, 10, 16, BROWN], [47, 22, 1, 2, GOLD], [38, 9, 16, 3, GOLD]);
  return r;
}

function money(): R[] {
  const r: R[] = [];
  // bank columns
  r.push([30, 6, 32, 3, STEEL], [28, 3, 36, 3, NAVY], [30, 28, 32, 3, STEEL]);
  for (let x = 32; x < 62; x += 7) r.push([x, 9, 3, 19, STEEL]);
  // coin stacks
  for (const [x, h] of [[4, 6], [12, 9], [20, 4]]) for (let i = 0; i < h; i++) r.push([x, 29 - i * 2, 7, 2, i % 2 ? GOLD : '#d9a520']);
  return r;
}

function tickets(): R[] {
  const r: R[] = [[16, 8, 40, 18, GOLD]];
  r.push([16, 15, 2, 4, '#0b1024'], [54, 15, 2, 4, '#0b1024']);
  for (let y = 9; y < 26; y += 2) r.push([42, y, 1, 1, NAVY]);
  r.push([20, 11, 18, 2, NAVY], [20, 15, 12, 2, NAVY], [20, 19, 16, 2, NAVY], [46, 12, 6, 10, RED]);
  return r;
}

function sponsors(): R[] {
  const r: R[] = [[6, 4, 52, 18, WHITE], [8, 6, 48, 14, BLUE]];
  r.push([12, 9, 20, 3, WHITE], [12, 14, 12, 2, GOLD], [40, 8, 10, 10, GOLD], [43, 11, 4, 4, BLUE]);
  r.push([14, 22, 2, 10, STEEL], [48, 22, 2, 10, STEEL]);
  return r;
}

function staff(): R[] {
  const r: R[] = [[30, 4, 24, 28, BROWN], [33, 7, 18, 23, WHITE], [37, 2, 10, 4, STEEL]];
  for (let y = 11; y < 28; y += 4) r.push([35, y, 2, 2, GREEN], [39, y, 10, 1, STEEL]);
  // whistle on a cord
  r.push([6, 20, 10, 6, STEEL], [16, 21, 4, 3, STEEL], [8, 22, 3, 2, NAVY]);
  for (let i = 0; i < 6; i++) r.push([18 + i * 2, 18 - i * 2, 2, 1, RED]);
  return r;
}

function board(): R[] {
  const r: R[] = [[20, 2, 26, 12, '#0b1024'], [21, 3, 24, 10, BLUE], [32, 3, 1, 10, '#0b1024'], [21, 8, 24, 1, '#0b1024']];
  r.push([8, 20, 50, 4, BROWN], [10, 24, 2, 8, BROWN], [54, 24, 2, 8, BROWN]);
  for (let x = 12; x < 56; x += 10) r.push([x, 15, 5, 5, RED], [x, 26, 5, 2, NAVY]);
  r.push([30, 17, 5, 3, GOLD]);
  return r;
}

function trophy(): R[] {
  const r: R[] = [];
  r.push([24, 4, 16, 2, GOLD], [25, 6, 14, 8, GOLD], [27, 14, 10, 2, GOLD], [30, 16, 4, 5, GOLD], [26, 21, 12, 2, GOLD], [24, 23, 16, 6, BROWN]);
  r.push([20, 6, 4, 2, GOLD], [20, 6, 2, 6, GOLD], [20, 11, 5, 2, GOLD], [40, 6, 4, 2, GOLD], [42, 6, 2, 6, GOLD], [39, 11, 5, 2, GOLD]);
  r.push([28, 7, 2, 5, WHITE]);
  for (const [x, y] of [[8, 6], [52, 10], [12, 20], [56, 24], [46, 2]]) r.push([x, y, 1, 3, WHITE], [x - 1, y + 1, 3, 1, WHITE]);
  return r;
}

const SCENES = { stadium, training, academy, commercial, money, tickets, sponsors, staff, board, trophy };
export type ArtKey = keyof typeof SCENES;

export function CardArt({ art }: { art: ArtKey }) {
  return (
    <svg class="card-art" viewBox="0 0 64 32" preserveAspectRatio="xMaxYMin meet" shape-rendering="crispEdges" aria-hidden="true">
      {SCENES[art]().map(([x, y, w, h, c], i) => <rect key={i} x={x} y={y} width={w} height={h} fill={c} />)}
    </svg>
  );
}
