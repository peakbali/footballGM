import { userClub } from '../core/state';
import { store } from './store';

/** Pixel stadium scene. Stage 4 makes it evolve with facilities and attendance. */
export function Stadium() {
  const s = store.state!;
  const c = userClub(s);
  const lvl = (s.ext.stadiumLevel as number | undefined) ?? Math.max(1, 11 - c.div);
  const crowd = Math.min(1, (c.lastAttendance ?? c.capacity * 0.3) / Math.max(1, c.capacity));
  const W = 160, H = 72;
  const stands: preact.JSX.Element[] = [];
  const standH = Math.min(26, 6 + lvl * 2);
  // back stand
  stands.push(<rect key="bs" x={10} y={22 - standH * 0.6} width={140} height={standH * 0.6} fill="#2a3060" />);
  for (let x = 12; x < 148; x += 3) for (let y = 23 - standH * 0.6; y < 21; y += 3) {
    const on = ((x * 7 + y * 13) % 100) / 100 < crowd;
    if (on) stands.push(<rect key={`c${x}-${y}`} x={x} y={y} width={2} height={2} fill={(x + y) % 2 ? c.colors[0] : c.colors[1]} />);
  }
  if (lvl >= 3) stands.push(<rect key="roof" x={8} y={20 - standH * 0.6} width={144} height={3} fill="#3b4688" />);
  const lights = lvl >= 2 ? [[6, 4], [154, 4]] : [];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} shape-rendering="crispEdges">
      <rect width={W} height={H} fill="#070b1f" />
      {[...Array(18)].map((_, i) => <rect key={i} x={(i * 37) % W} y={(i * 11) % 18} width={1} height={1} fill="#7884c4" />)}
      {stands}
      {lights.map(([x, y], i) => (
        <g key={i}>
          <rect x={x - 1} y={y} width={2} height={22} fill="#556" />
          <rect x={x - 3} y={y - 2} width={6} height={3} fill="#fff7c2" />
          <polygon points={`${x - 3},${y + 1} ${x + 3},${y + 1} ${x + (x < 80 ? 40 : -40)},${H} ${x + (x < 80 ? 10 : -10)},${H}`} fill="rgba(255,247,194,0.05)" />
        </g>
      ))}
      <rect x={0} y={24} width={W} height={H - 24} fill="#1d7a48" />
      {[...Array(8)].map((_, i) => <rect key={i} x={i * 20} y={24} width={10} height={H - 24} fill="#208651" />)}
      <rect x={20} y={30} width={120} height={36} fill="none" stroke="#e8ecff" stroke-width="1" opacity="0.8" />
      <rect x={79.5} y={30} width={1} height={36} fill="#e8ecff" opacity="0.8" />
      <circle cx={80} cy={48} r={7} fill="none" stroke="#e8ecff" stroke-width="1" opacity="0.8" />
      <rect x={20} y={40} width={10} height={16} fill="none" stroke="#e8ecff" stroke-width="1" opacity="0.8" />
      <rect x={130} y={40} width={10} height={16} fill="none" stroke="#e8ecff" stroke-width="1" opacity="0.8" />
      {lvl <= 2 && <rect x={140} y={14} width={14} height={9} fill="#6b6f80" />}
      {lvl <= 2 && <rect x={142} y={16} width={3} height={3} fill="#ffe08a" />}
    </svg>
  );
}
