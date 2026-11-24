import { personalityLabel } from './screens/Player';

/** Five pixel faces for personality, best to worst: dark green big smile, green smile, yellow neutral, orange sad, red angry. */
const LOOKS = [
  { fill: '#0e7a35', name: 'Model Pro' },
  { fill: '#5fe03c', name: 'Professional' },
  { fill: '#ffd23f', name: 'Balanced' },
  { fill: '#ff9420', name: 'Demanding' },
  { fill: '#e5383b', name: 'Volatile' },
] as const;
/** 0 = best ... 4 = worst */
export const faceLevel = (v: number): number => (v < 20 ? 4 : v < 40 ? 3 : v < 65 ? 2 : v < 85 ? 1 : 0);

// [x, width] per row of a 9 x 9 round head
const HEAD: [number, number][] = [[2, 5], [1, 7], [0, 9], [0, 9], [0, 9], [0, 9], [0, 9], [1, 7], [2, 5]];
const INK = '#0b1020';
const FEATURES: [number, number][][] = [
  /* big smile */ [[2, 3], [6, 3], [2, 5], [3, 6], [4, 6], [5, 6]],
  /* smile */ [[2, 3], [6, 3], [2, 5], [6, 5], [3, 6], [4, 6], [5, 6]],
  /* neutral */ [[2, 3], [6, 3], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6]],
  /* sad */ [[2, 3], [6, 3], [3, 5], [4, 5], [5, 5], [2, 6], [6, 6]],
  /* angry */ [[1, 2], [2, 2], [3, 3], [5, 3], [6, 2], [7, 2], [2, 4], [6, 4], [3, 6], [4, 6], [5, 6], [2, 7], [6, 7]],
];

export function Face({ level, size = 16 }: { level: number; size?: number }) {
  const look = LOOKS[level];
  return (
    <svg viewBox="-1 -1 11 11" width={size} height={size} style={{ display: 'block', flex: 'none' }} shape-rendering="crispEdges" role="img" aria-label={look.name}>
      {HEAD.map(([x, w], y) => <rect key={`o${y}`} x={x - 1} y={y} width={w + 2} height={1} fill={INK} />)}
      <rect x={2} y={-1} width={5} height={1} fill={INK} />
      <rect x={2} y={9} width={5} height={1} fill={INK} />
      {HEAD.map(([x, w], y) => <rect key={`f${y}`} x={x} y={y} width={w} height={1} fill={look.fill} />)}
      {FEATURES[level].map(([x, y], i) => <rect key={i} x={x} y={y} width={1} height={1} fill={INK} />)}
    </svg>
  );
}

/** The face for a personality value, or "?" when it is not known yet. */
export function PersonalityFace({ v, size = 16 }: { v: number | null; size?: number }) {
  if (v == null) return <span class="dim">?</span>;
  return <span title={personalityLabel(v)} style={{ display: 'inline-flex' }}><Face level={faceLevel(v)} size={size} /></span>;
}
