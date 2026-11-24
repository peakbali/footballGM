import { FORMATION_NAMES } from '../../core/data/formations';
import { autoPick } from '../../core/selection';
import { squadOf, userClub, type GameState } from '../../core/state';
import { seniorCount, SQUAD_MAX, SQUAD_MIN } from '../../core/systems/contracts';
import { userWageBill } from '../../core/systems/finance';
import { effectiveOvr } from '../../core/ratings';
import { Card, ovrColor } from '../components';
import { Portrait } from '../portrait';
import { LINE } from '../../core/data/positions';
import { money, nav, store } from '../store';
import { registerSquadCard } from '../squadExtras';

const POS_FILL = { GK: '#a77d10', DEF: '#1f5fa8', MID: '#1d7a48', ATT: '#a82d3a' } as const;

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
      <svg viewBox="0 0 100 160" class="pitch" style={{ width: '100%', background: '#1d7a48', borderRadius: 4, border: '2px solid var(--line)' }}>
        {[...Array(10)].map((_, i) => <rect key={i} x={0} y={i * 17} width={100} height={8.5} fill="#208651" />)}
        <rect x="4" y="3" width="92" height="154" fill="none" stroke="#e8ecff" stroke-width="0.6" opacity="0.7" />
        <line x1="4" y1="80" x2="96" y2="80" stroke="#e8ecff" stroke-width="0.6" opacity="0.7" />
        <circle cx="50" cy="80" r="9" fill="none" stroke="#e8ecff" stroke-width="0.6" opacity="0.7" />
        <rect x="28" y="141" width="44" height="16" fill="none" stroke="#e8ecff" stroke-width="0.6" opacity="0.7" />
        <rect x="28" y="3" width="44" height="16" fill="none" stroke="#e8ecff" stroke-width="0.6" opacity="0.7" />
        {lu.slots.map((slot, i) => {
          const p = lu.xi[i];
          const cx = 4 + (slot.x / 100) * 92;
          const cy0 = 12 + ((100 - slot.y) / 100) * 130;
          const cy = slot.pos === 'GK' ? cy0 : Math.min(cy0, 106); // keep the back line clear of the keeper // forwards near the top, keeper at the bottom
          const v = p ? Math.round(effectiveOvr(p, slot.pos)) : 0;
          const off = !!p && p.pos !== slot.pos; // playing out of his main position
          const group = LINE[slot.pos];
          return (
            <g key={i} onClick={() => p && nav.push({ kind: 'player', id: p.id })} style={{ cursor: p ? 'pointer' : 'default' }}>
              {p ? (
                <g transform={`translate(${cx - 5} ${cy - 5.6})`}>
                  <Portrait p={p} size={10} />
                  {p.locked && <rect x={-0.4} y={-0.4} width={10.8} height={12.05} fill="none" stroke="#ffcc4d" stroke-width="0.7" />}
                </g>
              ) : (
                <rect x={cx - 5} y={cy - 5.6} width={10} height={11.25} fill="none" stroke="#e8ecff" stroke-width="0.5" stroke-dasharray="1.5 1.5" opacity="0.6" />
              )}
              {p && (
                <g>
                  <circle cx={cx + 5.2} cy={cy - 5.4} r="3.3" fill={ovrColor(v)} stroke="#070b18" stroke-width="0.6" />
                  <text x={cx + 5.2} y={cy - 4.2} text-anchor="middle" font-size="3.4" font-family="Silkscreen" fill="#0b1020">{v}</text>
                </g>
              )}
              <text x={cx} y={cy + 9.4} text-anchor="middle" font-size="3.2" font-weight="700" fill="#fff" style={{ paintOrder: 'stroke' }} stroke="#000" stroke-width="0.7">{p ? p.last.slice(0, 9) : '-'}</text>
              <g>
                <rect x={cx - 4.6} y={cy + 10.6} width={9.2} height={4} rx="0.6" fill={POS_FILL[group]} stroke={off ? '#ffa62b' : '#070b18'} stroke-width={off ? 0.7 : 0.5} />
                <text x={cx} y={cy + 13.5} text-anchor="middle" font-size="2.9" font-family="Silkscreen" fill="#fff">{slot.pos}</text>
              </g>
            </g>
          );
        })}
      </svg>
      <div class="tiny dim" style={{ marginTop: 6 }}>The XI is picked automatically by effective rating, fitness and morale. The tag under each player is the slot he fills (amber outline: out of his main position). Lock a player from his screen to force him in (gold frame).</div>
      <div class="tiny dim">Bench: {lu.bench.map((p) => p.last).join(', ') || 'none'}</div>
      {n < SQUAD_MIN && <div class="amber small" style={{ marginTop: 6 }}>Squad below {SQUAD_MIN}: sign players or promote academy players.</div>}
    </Card>
  );
}

registerSquadCard((s) => <Lineup s={s} />);
