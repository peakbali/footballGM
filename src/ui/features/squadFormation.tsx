import { FORMATION_NAMES } from '../../core/data/formations';
import { autoPick } from '../../core/selection';
import { squadOf, userClub, type GameState } from '../../core/state';
import { seniorCount, SQUAD_MAX, SQUAD_MIN } from '../../core/systems/contracts';
import { userWageBill } from '../../core/systems/finance';
import { effectiveOvr } from '../../core/ratings';
import { Card, ovrColor } from '../components';
import { money, nav, store } from '../store';
import { registerSquadCard } from '../squadExtras';

function Lineup({ s }: { s: GameState }) {
  const club = userClub(s);
  const squad = squadOf(s, s.userClubId);
  const lu = autoPick(squad, club.formation);
  const n = seniorCount(s);
  return (
    <Card title={`Formation · ${club.formation}`} action={<span class="tiny dim">{n}/{SQUAD_MAX} senior · wages {money(userWageBill(s))}/wk</span>}>
      <div class="chips">
        {FORMATION_NAMES.map((f) => (
          <button key={f} class={`chip ${f === club.formation ? 'on' : ''}`} onClick={() => { club.formation = f; store.bump(); }}>{f}</button>
        ))}
      </div>
      <svg viewBox="0 0 100 110" style={{ width: '100%', background: '#1d7a48', borderRadius: 4, border: '2px solid var(--line)' }}>
        {[...Array(6)].map((_, i) => <rect key={i} x={0} y={i * 20} width={100} height={10} fill="#208651" />)}
        <rect x="4" y="4" width="92" height="102" fill="none" stroke="#e8ecff" stroke-width="0.6" opacity="0.7" />
        <line x1="4" y1="55" x2="96" y2="55" stroke="#e8ecff" stroke-width="0.6" opacity="0.7" />
        <circle cx="50" cy="55" r="9" fill="none" stroke="#e8ecff" stroke-width="0.6" opacity="0.7" />
        <rect x="30" y="92" width="40" height="14" fill="none" stroke="#e8ecff" stroke-width="0.6" opacity="0.7" />
        {lu.slots.map((slot, i) => {
          const p = lu.xi[i];
          const x = 4 + (slot.x / 100) * 92;
          const y = 104 - (slot.y / 100) * 98;
          const v = p ? Math.round(effectiveOvr(p, slot.pos)) : 0;
          return (
            <g key={i} onClick={() => p && nav.push({ kind: 'player', id: p.id })} style={{ cursor: 'pointer' }}>
              <circle cx={x} cy={y} r="5.2" fill={p ? ovrColor(v) : '#444'} stroke="#070b18" stroke-width="0.8" />
              <text x={x} y={y + 1.6} text-anchor="middle" font-size="4.2" font-family="Silkscreen" fill="#0b1020">{p ? v : '-'}</text>
              <text x={x} y={y + 9.5} text-anchor="middle" font-size="3.4" fill="#fff" style={{ paintOrder: 'stroke' }} stroke="#000" stroke-width="0.6">{p ? `${p.last.slice(0, 10)}${p.locked ? '🔒' : ''}` : slot.pos}</text>
            </g>
          );
        })}
      </svg>
      <div class="tiny dim" style={{ marginTop: 6 }}>The XI is picked automatically by effective rating, fitness and morale. Lock a player from his screen to force him in.</div>
      <div class="tiny dim">Bench: {lu.bench.map((p) => p.last).join(', ') || 'none'}</div>
      {n < SQUAD_MIN && <div class="amber small" style={{ marginTop: 6 }}>Squad below {SQUAD_MIN}: sign players or promote academy players.</div>}
    </Card>
  );
}

registerSquadCard((s) => <Lineup s={s} />);
