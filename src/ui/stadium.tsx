import type { JSX } from 'preact';
import { userClub } from '../core/state';
import type { FacilitiesState } from '../core/systems/facilities';
import { store } from './store';

/**
 * Evolving pixel stadium (DESIGN 13.3). Built from layers that follow facility upgrades:
 * a rail and a portacabin at level 1, stands, roofs, a big screen and boxes later, a full bowl at level 10.
 * Crowd density follows the last home attendance; it is night with floodlights on match weeks.
 */
const W = 160, H = 80, PITCH_Y = 40;

function crowdDots(key: string, x0: number, x1: number, y0: number, y1: number, density: number, colors: string[], step = 3): JSX.Element {
  const a: JSX.Element[] = [];
  const b: JSX.Element[] = [];
  for (let x = x0; x < x1; x += step) {
    for (let y = y0; y < y1; y += step) {
      const h = ((x * 73856093) ^ (y * 19349663)) >>> 0;
      if ((h % 1000) / 1000 >= density) continue;
      const el = <rect key={`${x}-${y}`} x={x} y={y} width={2} height={2} fill={colors[h % colors.length]} />;
      (h % 3 === 0 ? b : a).push(el);
    }
  }
  return (
    <g key={key}>
      <g>{a}</g>
      <g class="crowd-bob">{b}</g>
    </g>
  );
}

export function Stadium() {
  const s = store.state!;
  const c = userClub(s);
  const fac = s.ext.fac as FacilitiesState | undefined;
  const lvl = fac?.levels.stadium ?? 1;
  const built = new Set((fac?.built ?? []).map((id) => id.replace(/^stadium-\d+-/, '')));
  const has = (k: string) => [...built].some((b) => b.includes(k));
  const training = fac?.levels.training ?? 1;
  const commercial = fac?.levels.commercial ?? 1;
  const academy = fac?.levels.academy ?? 1;
  const density = Math.min(1, (c.lastAttendance ?? c.capacity * 0.25) / Math.max(1, c.capacity)) * 0.8 + 0.18;
  const matchWeek = s.fixtures.some((f) => f.week === s.week && (f.home === c.id || f.away === c.id));
  const night = matchWeek || s.week % 2 === 0;
  const lightsOn = night && lvl >= 2;
  const kit = [c.colors[0], c.colors[1], '#d8dcef', c.colors[0]];
  const L: JSX.Element[] = [];

  // sky
  L.push(<rect key="sky" width={W} height={H} fill={night ? '#070b1f' : '#1b2350'} />);
  if (!night) L.push(<rect key="dusk" y={18} width={W} height={10} fill="#2b2f63" />);
  for (let i = 0; i < 22; i++) L.push(<rect key={`st${i}`} class={i % 4 === 0 ? 'twinkle' : ''} x={(i * 37 + 11) % W} y={(i * 13) % 20} width={1} height={1} fill="#7884c4" />);
  if (night) L.push(<rect key="moon" x={128} y={4} width={5} height={5} fill="#e8e6c8" />);

  // background buildings: training block (left), academy (left), clubhouse/shop (right)
  const tH = 4 + training * 1.6;
  L.push(<rect key="tr" x={2} y={PITCH_Y - 8 - tH} width={16 + training} height={tH} fill="#1b2140" />);
  for (let i = 0; i < Math.min(5, training); i++) L.push(<rect key={`trw${i}`} x={4 + i * 3} y={PITCH_Y - 6 - tH} width={1} height={1} fill="#ffe08a" opacity={night ? 1 : 0.4} />);
  if (academy >= 2) L.push(<rect key="ac" x={20} y={PITCH_Y - 10 - academy} width={10} height={academy + 2} fill="#20284d" />);
  const cH = 3 + commercial * 1.3;
  L.push(<rect key="cm" x={W - 22 - commercial} y={PITCH_Y - 8 - cH} width={20 + commercial} height={cH} fill="#1b2140" />);
  if (commercial >= 2) L.push(<rect key="shop" x={W - 18} y={PITCH_Y - 8 - cH + 1} width={8} height={2} fill={c.colors[0]} />);

  // back stand (main stand), grows with level
  const backH = lvl <= 2 ? 0 : lvl <= 7 ? 9 + (lvl - 3) * 1.5 : lvl <= 9 ? 18 : 22;
  const backTop = PITCH_Y - 4 - backH;
  if (backH > 0) {
    const terrace = has('north-stand-terrace');
    L.push(<rect key="bs" x={10} y={backTop} width={140} height={backH} fill={terrace ? '#3a3f55' : '#2a3060'} />);
    if (terrace) for (let y = backTop + 2; y < PITCH_Y - 4; y += 3) L.push(<rect key={`step${y}`} x={10} y={y} width={140} height={1} fill="#2c3043" />);
    L.push(crowdDots('bc', 12, 148, backTop + 2, PITCH_Y - 5, density, kit));
    if (lvl >= 8) L.push(<rect key="tier" x={10} y={backTop + backH * 0.45} width={140} height={1} fill="#151a33" />);
    if (lvl >= 7) for (let x = 30; x < 130; x += 12) L.push(<rect key={`box${x}`} x={x} y={backTop + backH * 0.45 - 3} width={9} height={3} fill={night ? '#9ad7ff' : '#5f86a8'} opacity={0.85} />);
    if (lvl >= 4) L.push(<rect key="roof" x={8} y={backTop - 3} width={144} height={3} fill="#3b4688" />);
    if (lvl >= 4) for (let x = 14; x < 150; x += 20) L.push(<rect key={`pil${x}`} x={x} y={backTop} width={1} height={backH} fill="#3b4688" opacity={0.6} />);
  } else {
    // level 1-2: a rail, a small shelter and a portacabin
    L.push(<rect key="rail" x={8} y={PITCH_Y - 3} width={144} height={1} fill="#9aa0b8" />);
    for (let x = 8; x < 152; x += 8) L.push(<rect key={`post${x}`} x={x} y={PITCH_Y - 3} width={1} height={3} fill="#9aa0b8" />);
    L.push(<rect key="shelter" x={60} y={PITCH_Y - 12} width={40} height={2} fill="#4a5070" />);
    L.push(<rect key="shelterb" x={60} y={PITCH_Y - 10} width={40} height={6} fill="#252a44" />);
    L.push(crowdDots('sc', 61, 99, PITCH_Y - 9, PITCH_Y - 4, density, kit));
    L.push(crowdDots('rc', 10, 150, PITCH_Y - 6, PITCH_Y - 3, density * 0.5, kit, 4));
    L.push(<rect key="cabin" x={136} y={PITCH_Y - 13} width={16} height={9} fill="#6b6f80" />);
    L.push(<rect key="cabinw" x={139} y={PITCH_Y - 11} width={3} height={3} fill="#ffe08a" />);
    L.push(<rect key="cabind" x={146} y={PITCH_Y - 10} width={3} height={6} fill="#4a4e60" />);
  }
  // big screen
  if (lvl >= 5) {
    L.push(<rect key="scr" x={22} y={backTop - 10 > 2 ? backTop - 10 : 2} width={14} height={8} fill="#111" />);
    L.push(<rect key="scri" class="screen" x={23} y={(backTop - 10 > 2 ? backTop - 10 : 2) + 1} width={12} height={6} fill={c.colors[0]} />);
  }
  // corner stands (level 9+) and bowl (10)
  if (lvl >= 9) {
    L.push(<polygon key="cl" points={`0,${PITCH_Y + 4} 10,${backTop} 10,${PITCH_Y - 4} 0,${PITCH_Y + 10}`} fill="#262c58" />);
    L.push(<polygon key="cr" points={`${W},${PITCH_Y + 4} ${W - 10},${backTop} ${W - 10},${PITCH_Y - 4} ${W},${PITCH_Y + 10}`} fill="#262c58" />);
  }
  if (lvl >= 10) L.push(<rect key="ring" x={0} y={backTop - 6} width={W} height={2} fill="#5866b0" />);

  // floodlights
  if (lvl >= 2) {
    const ly = Math.max(2, backTop - 14);
    for (const x of [6, 154]) {
      L.push(<rect key={`fp${x}`} x={x - 1} y={ly} width={2} height={PITCH_Y - ly} fill="#556" />);
      L.push(<rect key={`fh${x}`} x={x - 3} y={ly - 2} width={6} height={3} fill={lightsOn ? '#fff7c2' : '#8a8c9c'} />);
      if (lightsOn) L.push(<polygon key={`fb${x}`} class="beam" points={`${x - 3},${ly + 1} ${x + 3},${ly + 1} ${x + (x < 80 ? 46 : -46)},${H} ${x + (x < 80 ? 12 : -12)},${H}`} fill="rgba(255,247,194,0.06)" />);
    }
  }

  // pitch
  L.push(<rect key="pitch" x={0} y={PITCH_Y} width={W} height={H - PITCH_Y} fill="#1d7a48" />);
  for (let i = 0; i < 8; i++) L.push(<rect key={`str${i}`} x={i * 20} y={PITCH_Y} width={10} height={H - PITCH_Y} fill="#208651" />);
  const line = { fill: 'none', stroke: '#e8ecff', 'stroke-width': 1, opacity: 0.75 } as const;
  L.push(<rect key="ln" x={20} y={PITCH_Y + 5} width={120} height={H - PITCH_Y - 10} {...line} />);
  L.push(<rect key="half" x={79.5} y={PITCH_Y + 5} width={1} height={H - PITCH_Y - 10} fill="#e8ecff" opacity={0.75} />);
  L.push(<circle key="cc" cx={80} cy={(PITCH_Y + H) / 2} r={6} {...line} />);
  L.push(<rect key="pa1" x={20} y={PITCH_Y + 12} width={10} height={H - PITCH_Y - 24} {...line} />);
  L.push(<rect key="pa2" x={130} y={PITCH_Y + 12} width={10} height={H - PITCH_Y - 24} {...line} />);
  L.push(<rect key="g1" x={18} y={(PITCH_Y + H) / 2 - 3} width={2} height={6} fill="#e8ecff" />);
  L.push(<rect key="g2" x={140} y={(PITCH_Y + H) / 2 - 3} width={2} height={6} fill="#e8ecff" />);

  // front stand (south stand, level 6+): a foreground strip of heads
  if (lvl >= 6) {
    const terrace = has('south-stand-terrace');
    L.push(<rect key="fs" x={0} y={H - 7} width={W} height={7} fill={terrace ? '#2c3043' : '#232a55'} />);
    L.push(crowdDots('fc', 1, W - 1, H - 6, H - 1, density, kit));
  }
  // flag on the clubhouse
  L.push(<rect key="pole" x={W - 6} y={PITCH_Y - 22} width={1} height={12} fill="#9aa0b8" />);
  L.push(<rect key="flag" class="flag" x={W - 5} y={PITCH_Y - 22} width={5} height={3} fill={c.colors[0]} />);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} shape-rendering="crispEdges" class={matchWeek ? 'matchday' : ''}>
      {L}
    </svg>
  );
}
